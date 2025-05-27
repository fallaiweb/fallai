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
const commandList = document.getElementById("command-list");

let abortController = null;
let typingEl = null;
let pendingFiles = [];

// --- Willkommensnachricht & Command-System ---

window.addEventListener("DOMContentLoaded", () => {
  handleOAuthRedirect();
  if (!localStorage.getItem("welcome_shown")) {
    appendMessage(
      "bot",
      "👋 **Willkommen bei Fall AI!**\n\nTippe `/help` für eine Liste der verfügbaren Commands oder frage einfach drauf los!"
    );
    localStorage.setItem("welcome_shown", "1");
  }
});

const COMMANDS = [
  {
    cmd: "/help",
    desc: "Zeigt diese Hilfeseite an.",
    action: () => {
      appendMessage(
        "bot",
        `**Verfügbare Commands:**\n\n` +
        COMMANDS.map(c => `\`${c.cmd}\` – ${c.desc}`).join("\n")
      );
    }
  },
  {
    cmd: "/discord-ai",
    desc: "Discord Bot einladen",
    action: () => {
      window.open("https://discord.com/oauth2/authorize?client_id=1376180153654448180", "_blank");
      appendMessage("bot", "🔗 [Discord Bot Einladung geöffnet](https://discord.com/oauth2/authorize?client_id=1376180153654448180)");
    }
  },
  {
    cmd: "/about",
    desc: "Infos über Fall AI anzeigen",
    action: () => {
      appendMessage("bot", "🍂 **Fall AI** ist ein experimenteller KI-Chat. Login für mehr Features!");
    }
  },
  {
    cmd: "/clear",
    desc: "Chatverlauf löschen",
    action: () => {
      clearBtn.click();
    }
  }
];

userInput.addEventListener("keydown", (e) => {
  if (e.key === "/" && userInput.selectionStart === 0 && userInput.value.length === 0) {
    showCommandList();
  }
  if (e.key === "Escape" && commandList.style.display === "block") {
    hideCommandList();
  }
  if (e.key === "Enter" && commandList.style.display === "block") {
    e.preventDefault();
    const selected = commandList.querySelector(".selected");
    if (selected) {
      userInput.value = selected.dataset.cmd + " ";
      hideCommandList();
      userInput.focus();
    }
  }
  if ((e.key === "ArrowDown" || e.key === "ArrowUp") && commandList.style.display === "block") {
    e.preventDefault();
    const items = Array.from(commandList.querySelectorAll(".command-item"));
    let idx = items.findIndex(i => i.classList.contains("selected"));
    if (e.key === "ArrowDown") idx = (idx + 1) % items.length;
    if (e.key === "ArrowUp") idx = (idx - 1 + items.length) % items.length;
    items.forEach(i => i.classList.remove("selected"));
    items[idx].classList.add("selected");
  }
});

userInput.addEventListener("input", () => {
  if (userInput.value.startsWith("/")) {
    showCommandList(userInput.value);
  } else {
    hideCommandList();
  }
});

function showCommandList(filter = "") {
  const filtered = COMMANDS.filter(c => c.cmd.startsWith(filter));
  if (filtered.length === 0) {
    hideCommandList();
    return;
  }
  commandList.innerHTML = filtered
    .map(
      (c, i) =>
        `<div class="command-item${i === 0 ? " selected" : ""}" data-cmd="${c.cmd}"><b>${c.cmd}</b> – ${c.desc}</div>`
    )
    .join("");
  commandList.style.display = "block";
  commandList.querySelectorAll(".command-item").forEach(item => {
    item.onclick = () => {
      userInput.value = item.dataset.cmd + " ";
      hideCommandList();
      userInput.focus();
    };
  });
}

function hideCommandList() {
  commandList.style.display = "none";
  commandList.innerHTML = "";
}

function handleCommand(message) {
  const cmd = COMMANDS.find(c => message.trim().startsWith(c.cmd));
  if (cmd) {
    cmd.action();
    return true;
  }
  return false;
}

// Markdown rendering and code block copy support
function appendMessage(role, content, log = true) {
  if (typingEl && role === "bot") {
    typingEl.remove();
    typingEl = null;
  }
  const msg = document.createElement("div");
  msg.className = `message ${role}`;
  let html = marked.parse(content);
  html = html.replace(
    /<pre><code(?: class="language-\w+")?>([\s\S]*?)<\/code><\/pre>/g,
    (match, code) => {
      const clean = code.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
      const id = "codeblock-" + Math.random().toString(36).substr(2, 9);
      return `
        <div class="file-block" data-role="${role}" data-filename="Fall.ai" data-content="${clean.replace(/"/g, '&quot;')}">
          <div class="file-header"><i data-lucide="file-text"></i> Fall.ai</div>
          <div class="file-content" id="${id}"><pre>${code}</pre></div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('${id}').innerText); this.textContent='Copied!'; setTimeout(()=>this.innerHTML='<i data-lucide=copy></i> Copy',1200);"><i data-lucide="copy"></i> Copy</button>
        </div>
      `;
    }
  );
  msg.innerHTML = html;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
  lucide.createIcons({ icons: ["file-text", "copy"] });
  saveChatHistory();
  if (role === "bot" && log) {
    const user = JSON.parse(localStorage.getItem("user_data"));
    logToDiscord("AI Response", content, user);
  }
}

// Utility Functions
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

// Login/Logout/Modal code
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
  usernameSpan.textContent = "Pinkie Guest";
  userAvatar.style.display = "none";
  loginBtn.style.display = "inline-flex";
  logoutBtn.style.display = "none";
  clearChatUI();
  updateFileBtnState();
});

// Confirm Modal for Clear Chat
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

// OAuth token handling
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

// File upload preview
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

// "More of that" feature
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

// File block for file uploads
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

// Code block detection
function isCodeBlock(text) {
  return /^``````$/.test(text.trim());
}
function getCodeContent(text) {
  return text.trim().replace(/^``````$/, '');
}

// Chat sending logic
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
  const maxHeight = 100;
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

  // Command ausführen
  if (message.startsWith("/")) {
    if (handleCommand(message)) {
      userInput.value = "";
      autoResizeTextarea();
      hideCommandList();
      return;
    }
  }

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
      appendMessage("user", message, true);
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
  }

  userInput.value = "";
  autoResizeTextarea();
  hideCommandList();
  saveChatHistory();
}

function toggleButtons(isSending) {
  sendBtn.disabled = isSending;
  stopBtn.style.display = isSending ? "inline-flex" : "none";
}

function handleStop() {
  if (abortController) abortController.abort();
  toggleButtons(false);
  if (typingEl) {
    typingEl.remove();
    typingEl = null;
  }
}

function sendToAI(message) {
  abortController = new AbortController();
  typingEl = document.createElement("div");
  typingEl.className = "message bot typing";
  typingEl.innerHTML = `<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>`;
  chat.appendChild(typingEl);
  chat.scrollTop = chat.scrollHeight;
  fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: "You are Fall AI, a helpful assistant." },
        ...getChatMessages(),
        { role: "user", content: message }
      ],
      stream: false
    }),
    signal: abortController.signal
  })
    .then(res => res.json())
    .then(data => {
      if (data.choices && data.choices.length > 0) {
        appendMessage("bot", data.choices[0].message.content, true);
      } else {
        appendMessage("bot", "Sorry, I couldn't generate a response.", true);
      }
      toggleButtons(false);
    })
    .catch(e => {
      if (e.name !== "AbortError") {
        appendMessage("bot", "An error occurred while contacting the AI.", true);
        toggleButtons(false);
      }
    });
}

function getChatMessages() {
  const messages = [];
  document.querySelectorAll("#chat .message.user, #chat .message.bot").forEach(msg => {
    messages.push({
      role: msg.classList.contains("user") ? "user" : "assistant",
      content: msg.textContent
    });
  });
  return messages;
}

// Scroll to bottom button
scrollBtn.addEventListener("click", () => {
  chat.scrollTop = chat.scrollHeight;
});
chat.addEventListener("scroll", () => {
  if (chat.scrollTop + chat.clientHeight < chat.scrollHeight - 50) {
    scrollBtn.style.display = "flex";
  } else {
    scrollBtn.style.display = "none";
  }
});
