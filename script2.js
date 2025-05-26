// --- constants and selectors as before ---
const GROQ_API_KEY = "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";
const DISCORD_CLIENT_ID = "1376180153654448180";
const GOOGLE_CLIENT_ID = "430741103805-r80p5k14p9e66srupo4jvdle4pen1fqb.apps.googleusercontent.com";
const REDIRECT_URI = "https://fallai.netlify.app";
const DISCORD_WEBHOOK = "https://ptb.discord.com/api/webhooks/1376582619294208122/No5f6xr5L6e4c3ZFNL6YbIoP7MnSFw6X_0YBG7s7jjeej6Mhlu-yd2gPJ_tmUFu2tIF2";

const chat = document.getElementById("chat");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const stopBtn = document.getElementById("stop-btn");
const scrollBtn = document.getElementById("scroll-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const usernameSpan = document.getElementById("username");
const userAvatar = document.getElementById("user-avatar");
const loginModal = document.getElementById("login-modal");
const loginGoogleBtn = document.getElementById("login-google");
const loginDiscordBtn = document.getElementById("login-discord");
const loginCancelBtn = document.getElementById("login-cancel");
const fileBtn = document.getElementById("file-btn");
const fileInput = document.getElementById("file-input");
const filePreview = document.getElementById("file-preview");
const clearBtn = document.getElementById("clear-btn");
const confirmModal = document.getElementById("confirm-modal");
const confirmYes = document.getElementById("confirm-yes");
const confirmNo = document.getElementById("confirm-no");

let abortController = null;
let typingEl = null;
let pendingFiles = [];

// --- Utility Functions ---
function logToDiscord(action, description, user = null) {
  const embed = {
    title: action,
    description: description,
    color: 0xe7a96f,
    timestamp: new Date().toISOString(),
    ...(user && { author: { name: user.name, icon_url: user.avatar } }),
  };
  fetch(DISCORD_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  }).catch(() => {});
}

function updateFileBtnState() {
  const user = JSON.parse(localStorage.getItem("user_data"));
  fileBtn.disabled = !user;
}
updateFileBtnState();

function updateUIForUser(user) {
  usernameSpan.textContent = user.name;
  userAvatar.src = user.avatar;
  userAvatar.style.display = "inline-block";
  loginBtn.style.display = "none";
  logoutBtn.style.display = "inline-flex";
  updateFileBtnState();
  loadChatHistory();
}

// --- Login/Logout/Modal code as before ---
loginBtn.addEventListener("click", () => loginModal.classList.add("active"));
loginCancelBtn.addEventListener("click", () => loginModal.classList.remove("active"));
loginModal.addEventListener("click", (e) => {
  if (e.target === loginModal) loginModal.classList.remove("active");
});
loginGoogleBtn.addEventListener("click", () => {
  loginModal.classList.remove("active");
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "token",
    scope: "openid profile email",
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
});
loginDiscordBtn.addEventListener("click", () => {
  loginModal.classList.remove("active");
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "token",
    scope: "identify email",
  });
  window.location.href = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
});
logoutBtn.addEventListener("click", () => {
  const user = JSON.parse(localStorage.getItem("user_data"));
  logToDiscord("Logout", "User logged out.", user);
  localStorage.removeItem("user_data");
  usernameSpan.textContent = "Guest";
  userAvatar.style.display = "none";
  loginBtn.style.display = "inline-flex";
  logoutBtn.style.display = "none";
  clearChatUI();
  updateFileBtnState();
});

// --- Confirm Modal for Clear Chat ---
clearBtn.addEventListener("click", () => {
  confirmModal.classList.add("active");
  lucide.createIcons({ icons: ["alert-triangle"] });
});
confirmYes.addEventListener("click", () => {
  confirmModal.classList.remove("active");
  const key = getChatStorageKey();
  if (key) localStorage.removeItem(key);
  clearChatUI();
  const user = JSON.parse(localStorage.getItem("user_data"));
  appendMessage("bot", "Chat history was cleared.", false);
  logToDiscord("Chat Cleared", "User cleared their chat history.", user);
});
confirmNo.addEventListener("click", () => {
  confirmModal.classList.remove("active");
});
confirmModal.addEventListener("click", (e) => {
  if (e.target === confirmModal) confirmModal.classList.remove("active");
});

// --- OAuth token handling ---
function handleOAuthRedirect() {
  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    if (accessToken) {
      fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((user) => {
          saveUser({
            id: user.id,
            name: `${user.username}#${user.discriminator}`,
            avatar: user.avatar
              ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
              : "https://cdn.discordapp.com/embed/avatars/0.png",
            provider: "discord",
          });
        })
        .catch(() => {
          fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
            .then((res) => res.json())
            .then((user) => {
              saveUser({
                id: user.sub || user.email || user.name,
                name: user.name,
                avatar: user.picture,
                provider: "google",
              });
            })
            .catch(() => alert("Login failed."));
        });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  } else {
    const user = JSON.parse(localStorage.getItem("user_data"));
    if (user) updateUIForUser(user);
  }
}

function saveUser(user) {
  localStorage.setItem("user_data", JSON.stringify(user));
  updateUIForUser(user);
  logToDiscord("Login", `User logged in via ${user.provider}.`, user);
}

function getUserId() {
  const user = JSON.parse(localStorage.getItem("user_data"));
  if (!user) return null;
  if (user.provider === "discord") return "discord_" + user.id;
  if (user.provider === "google") return "google_" + user.id;
  return null;
}

function getChatStorageKey() {
  const id = getUserId();
  return id ? `chat_history_${id}` : null;
}

function saveChatHistory() {
  const key = getChatStorageKey();
  if (!key) return;
  const messages = [];
  document.querySelectorAll("#chat .message, #chat .file-block").forEach((msg) => {
    if (msg.classList.contains("file-block")) {
      messages.push({
        role: msg.dataset.role,
        file: true,
        filename: msg.dataset.filename,
        content: msg.dataset.content,
      });
    } else {
      messages.push({
        role: msg.classList.contains("user") ? "user" : "bot",
        content: msg.textContent,
      });
    }
  });
  localStorage.setItem(key, JSON.stringify(messages));
}

function loadChatHistory() {
  const key = getChatStorageKey();
  if (!key) return;
  const messages = JSON.parse(localStorage.getItem(key) || "[]");
  clearChatUI();
  for (const msg of messages) {
    if (msg.file) {
      appendFileBlock(msg.role, msg.filename, msg.content, false);
    } else {
      appendMessage(msg.role, msg.content, false);
    }
  }
}

function clearChatUI() {
  chat.innerHTML = "";
}

// --- File upload preview ---
fileBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  pendingFiles = [];
  filePreview.innerHTML = "";
  const files = Array.from(fileInput.files);
  for (const file of files) {
    pendingFiles.push({ file, filename: file.name });
    addFilePreview(file.name, pendingFiles.length - 1);
  }
  lucide.createIcons({ icons: ["file-text", "x"] });
});
function addFilePreview(filename, idx) {
  const block = document.createElement("div");
  block.className = "file-preview-block";
  block.innerHTML = `<i data-lucide="file-text"></i><span class="file-preview-filename">${filename}</span>
    <button class="file-preview-remove" title="Remove" data-idx="${idx}"><i data-lucide="x"></i></button>`;
  filePreview.appendChild(block);
  block.querySelector(".file-preview-remove").onclick = () => removePendingFile(idx);
}
function removePendingFile(idx) {
  pendingFiles.splice(idx, 1);
  filePreview.innerHTML = "";
  pendingFiles.forEach((f, i) => addFilePreview(f.filename, i));
  lucide.createIcons({ icons: ["file-text", "x"] });
  if (pendingFiles.length === 0) fileInput.value = "";
}

// --- "More of that" feature ---
function isMoreOfThatTrigger(text) {
  const triggers = [
    "more of that",
    "please more",
    "more please",
    "bitte mehr davon",
    "mehr davon",
    "noch mehr davon",
    "mehr bitte"
  ];
  const normalized = text.trim().toLowerCase();
  return triggers.some(trigger => normalized === trigger);
}
function getLastAIMessage() {
  const messages = Array.from(chat.querySelectorAll(".message.bot, .file-block"));
  for (let i = messages.length - 1; i >= 0; i--) {
    const el = messages[i];
    if (el.classList.contains("message") && el.classList.contains("bot")) {
      return el.textContent;
    }
    if (el.classList.contains("file-block") && el.dataset.role === "bot") {
      return el.dataset.content || "";
    }
  }
  return null;
}

// --- Codeblock detection ---
function isCodeBlock(text) {
  return /^``````$/m.test(text.trim());
}
function getCodeContent(text) {
  return text.trim().replace(/^``````$/, '');
}

// --- Chat sending logic ---
sendBtn.addEventListener("click", handleSend);
stopBtn.addEventListener("click", handleStop);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});
userInput.addEventListener("input", autoResizeTextarea);

function autoResizeTextarea() {
  userInput.style.height = "auto";
  const maxHeight = 140;
  if (userInput.scrollHeight > maxHeight) {
    userInput.style.height = maxHeight + "px";
    userInput.style.overflowY = "auto";
  } else {
    userInput.style.height = userInput.scrollHeight + "px";
    userInput.style.overflowY = "hidden";
  }
}
autoResizeTextarea();

function handleSend() {
  const message = userInput.value.trim();
  if (!message && pendingFiles.length === 0) return;

  // Send files first
  if (pendingFiles.length > 0) {
    for (const pf of pendingFiles) {
      appendFileBlock("user", pf.filename, "", true);
      const user = JSON.parse(localStorage.getItem("user_data"));
      logToDiscord("File Upload", `User sent file: **${pf.filename}**`, user);
    }
    pendingFiles = [];
    filePreview.innerHTML = "";
    fileInput.value = "";
  }

  // "More of that" feature
  if (message && isMoreOfThatTrigger(message)) {
    const lastAI = getLastAIMessage();
    if (lastAI) {
      appendMessage("user", message, true);
      logToDiscord("Message", `User sent: ${message} (triggered repeat of last AI message)`, JSON.parse(localStorage.getItem("user_data")));
      sendToAI(lastAI);
    } else {
      appendMessage("user", message, true);
      appendMessage("bot", "There is no previous AI message to repeat.", true);
    }
    userInput.value = "";
    autoResizeTextarea();
    toggleButtons(false);
    saveChatHistory();
    return;
  }

  // Send code block or normal message
  if (message) {
    if (isCodeBlock(message)) {
      appendFileBlock("user", "Fall.ai", getCodeContent(message), true);
      const user = JSON.parse(localStorage.getItem("user_data"));
      logToDiscord("Code Block", `User sent code:\n\`\`\`\n${getCodeContent(message).slice(0, 1000)}\n\`\`\``, user);
      toggleButtons(false);
      saveChatHistory();
    } else {
      appendMessage("user", message, true);
      const user = JSON.parse(localStorage.getItem("user_data"));
      logToDiscord("Message", `User sent: ${message}`, user);
      toggleButtons(true);
      sendToAI(message);
    }
  } else {
    autoResizeTextarea();
    toggleButtons(false);
    saveChatHistory();
  }
  userInput.value = "";
  autoResizeTextarea();
}

function handleStop() {
  if (abortController) {
    abortController.abort();
    toggleButtons(false);
  }
}

function appendMessage(role, content, log = true) {
  if (typingEl && role === "bot") {
    typingEl.remove();
    typingEl = null;
  }
  const msg = document.createElement("div");
  msg.className = `message ${role}`;
  msg.textContent = content;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
  saveChatHistory();
  if (role === "bot" && log) {
    const user = JSON.parse(localStorage.getItem("user_data"));
    logToDiscord("AI Response", content, user);
  }
}

function appendFileBlock(role, filename, content, log = true) {
  const block = document.createElement("div");
  block.className = "file-block";
  block.dataset.role = role;
  block.dataset.filename = filename;
  block.dataset.content = content;

  const header = document.createElement("div");
  header.className = "file-header";
  header.innerHTML = `<i data-lucide="file-text"></i> ${filename}`;
  block.appendChild(header);

  if (content && content.length > 0) {
    const fileContent = document.createElement("div");
    fileContent.className = "file-content";
    fileContent.textContent = content;
    block.appendChild(fileContent);

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.innerHTML = `<i data-lucide="copy"></i> Copy`;
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(content);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.innerHTML = `<i data-lucide="copy"></i> Copy`), 1200);
      lucide.createIcons({ icons: ["copy"] });
    });
    block.appendChild(copyBtn);
  }

  chat.appendChild(block);
  chat.scrollTop = chat.scrollHeight;
  lucide.createIcons({ icons: ["file-text", "copy"] });
  saveChatHistory();
  if (log) {
    const user = JSON.parse(localStorage.getItem("user_data"));
    logToDiscord("File (Text/File)", `User sent a file: **${filename}**${content ? `\n\`\`\`\n${content.slice(0, 1000)}\n\`\`\`` : ""}`, user);
  }
}

// --- AI streaming response ---
function showThinking() {
  if (typingEl) typingEl.remove();
  typingEl = document.createElement("div");
  typingEl.className = "message bot typing-animation";
  typingEl.textContent = "Fall AI is thinking";
  chat.appendChild(typingEl);
  chat.scrollTop = chat.scrollHeight;
}

function updateTypingIndicator(text) {
  if (!typingEl) showThinking();
  typingEl.textContent = text;
  chat.scrollTop = chat.scrollHeight;
}

async function sendToAI(message) {
  showThinking();
  abortController = new AbortController();
  let botMsg = "";

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: "You are Fall AI, a helpful assistant." },
          { role: "user", content: message },
        ],
        stream: true,
      }),
      signal: abortController.signal,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let done = false;
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.replace("data: ", "");
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) {
                botMsg += token;
                updateTypingIndicator(botMsg);
              }
            } catch {}
          }
        }
      }
    }

    if (typingEl) typingEl.remove();

    if (isCodeBlock(botMsg)) {
      appendFileBlock("bot", "Fall.ai", getCodeContent(botMsg), true);
    } else {
      appendMessage("bot", botMsg, true);
    }
  } catch (error) {
    if (typingEl) typingEl.remove();
    if (error.name === "AbortError") {
      appendMessage("bot", "(Answer canceled)");
    } else {
      appendMessage("bot", "An error occurred.");
    }
  } finally {
    toggleButtons(false);
  }
}

function toggleButtons(loading) {
  sendBtn.style.display = loading ? "none" : "inline-flex";
  stopBtn.style.display = loading ? "inline-flex" : "none";
}

// --- Scroll button ---
scrollBtn.addEventListener("click", () => {
  chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
});
chat.addEventListener("scroll", () => {
  scrollBtn.style.display =
    chat.scrollTop + chat.clientHeight < chat.scrollHeight - 100 ? "flex" : "none";
});

// --- Init icons ---
lucide.createIcons();

// --- On load ---
window.addEventListener("load", () => {
  handleOAuthRedirect();
  updateFileBtnState();
});
