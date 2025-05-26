// ==== Konfiguration (bitte nicht öffentlich teilen!) ====
const GROQ_API_KEY = "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";
const DISCORD_CLIENT_ID = "1376180153654448180";
const GOOGLE_CLIENT_ID = "430741103805-r80p5k14p9e66srupo4jvdle4pen1fqb.apps.googleusercontent.com";
const REDIRECT_URI = "https://fallai.netlify.app"; // Deine Domain

// ==== UI Elemente ====
const chat = document.getElementById("chat");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const stopBtn = document.getElementById("stop-btn");
const scrollBtn = document.getElementById("scroll-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const usernameSpan = document.getElementById("username");
const loginModal = document.getElementById("login-modal");
const loginGoogleBtn = document.getElementById("login-google");
const loginDiscordBtn = document.getElementById("login-discord");
const loginCancelBtn = document.getElementById("login-cancel");

let abortController = null;
let typingEl = null;

// ==== Login Modal Handling ====
loginBtn.addEventListener("click", () => loginModal.classList.add("active"));
loginCancelBtn.addEventListener("click", () => loginModal.classList.remove("active"));
loginModal.addEventListener("click", (e) => {
  if (e.target === loginModal) loginModal.classList.remove("active");
});

// ==== Login mit Google (OAuth2 Implicit Flow) ====
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

// ==== Login mit Discord (OAuth2 Implicit Flow) ====
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

// ==== Logout ====
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("user_data");
  usernameSpan.textContent = "Gast";
  loginBtn.style.display = "inline-flex";
  logoutBtn.style.display = "none";
});

// ==== Token aus URL auslesen und Userdaten holen ====
function handleOAuthRedirect() {
  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    if (accessToken) {
      // Erkenne ob Google oder Discord (optional, hier Discord Beispiel)
      if (window.location.href.includes("discord.com")) {
        fetch("https://discord.com/api/users/@me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => res.json())
          .then((user) => {
            saveUser(user);
          })
          .catch(() => {
            alert("Fehler beim Laden der Discord-Daten");
          });
      } else if (window.location.href.includes("google.com")) {
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => res.json())
          .then((user) => {
            saveUser(user);
          })
          .catch(() => {
            alert("Fehler beim Laden der Google-Daten");
          });
      }
      // URL bereinigen
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  } else {
    // Prüfe ob User gespeichert ist
    const user = JSON.parse(localStorage.getItem("user_data"));
    if (user) {
      updateUIForUser(user);
    }
  }
}

function saveUser(user) {
  localStorage.setItem("user_data", JSON.stringify(user));
  updateUIForUser(user);
}

function updateUIForUser(user) {
  if (user.username) {
    // Discord User
    usernameSpan.textContent = `${user.username}#${user.discriminator}`;
  } else if (user.name) {
    // Google User
    usernameSpan.textContent = user.name;
  } else {
    usernameSpan.textContent = "Benutzer";
  }
  loginBtn.style.display = "none";
  logoutBtn.style.display = "inline-flex";
}

// ==== Chat Funktionen ====
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
  const maxHeight = 130; // ca. 5 Zeilen
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
  if (!message) return;
  appendMessage("user", message);
  userInput.value = "";
  autoResizeTextarea();
  toggleButtons(true);
  sendToAI(message);
}

function handleStop() {
  if (abortController) {
    abortController.abort();
    toggleButtons(false);
  }
}

function appendMessage(role, content) {
  if (typingEl && role === "bot") {
    typingEl.remove();
    typingEl = null;
  }
  const msg = document.createElement("div");
  msg.className = `message ${role}`;
  msg.textContent = content;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function showThinking() {
  if (typingEl) typingEl.remove();
  typingEl = document.createElement("div");
  typingEl.className = "message bot typing-animation";
  typingEl.textContent = "Fall AI denkt nach";
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");
      for (const line of lines) {
        if (line.startsWith("data:")) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;
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

    if (typingEl) typingEl.remove();
    appendMessage("bot", botMsg);
  } catch (error) {
    if (error.name === "AbortError") {
      appendMessage("bot", "(Antwort abgebrochen)");
    } else {
      appendMessage("bot", "Fehler bei der Antwort.");
    }
  } finally {
    toggleButtons(false);
  }
}

function toggleButtons(loading) {
  sendBtn.style.display = loading ? "none" : "inline-flex";
  stopBtn.style.display = loading ? "inline-flex" : "none";
}

// Scroll Button
scrollBtn.addEventListener("click", () => {
  chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
});

chat.addEventListener("scroll", () => {
  scrollBtn.style.display =
    chat.scrollTop + chat.clientHeight < chat.scrollHeight - 100 ? "flex" : "none";
});

// Init Lucide Icons
lucide.createIcons();

// OAuth Redirect Check beim Laden
window.addEventListener("load", () => {
  handleOAuthRedirect();
});
