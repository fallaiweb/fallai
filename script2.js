// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyAPf_EoIxzFhArc83GBaIy7h--2Kye0T3E",
  authDomain: "fallai-e4e92.firebaseapp.com",
  projectId: "fallai-e4e92",
  storageBucket: "fallai-e4e92.appspot.com",
  messagingSenderId: "1015085978833",
  appId: "1:1015085978833:web:3a51e6320a94c80bbc21f0",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let user = { displayName: "Guest" };
let currentUserId = null;
let abortController = null;

// === DOM Elements ===
const chat = document.getElementById('chat');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const stopBtn = document.getElementById('stop-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const discordLoginBtn = document.getElementById('discord-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const usernameSpan = document.getElementById('username');
const resetBtn = document.getElementById('reset-chat-btn');
const scrollDownBtn = document.getElementById('scroll-down-btn');
const chatContainer = document.getElementById('chat-container');

// === Textarea: Shift+Enter für neue Zeile, Enter zum Senden, automatische Höhe ===
function adjustTextareaHeight() {
  userInput.style.height = 'auto';
  userInput.style.height = userInput.scrollHeight + 'px';
}
userInput.addEventListener('input', adjustTextareaHeight);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (e.shiftKey) {
      // Neue Zeile
      e.preventDefault();
      const start = userInput.selectionStart;
      const end = userInput.selectionEnd;
      userInput.value = userInput.value.substring(0, start) + '\n' + userInput.value.substring(end);
      userInput.selectionStart = userInput.selectionEnd = start + 1;
      adjustTextareaHeight();
    } else {
      // Senden
      e.preventDefault();
      handleSend();
    }
  }
});
adjustTextareaHeight();

// === Event Listeners ===
sendBtn.addEventListener('click', handleSend);
stopBtn.addEventListener('click', handleStop);
googleLoginBtn.addEventListener('click', handleGoogleLogin);
discordLoginBtn.addEventListener('click', handleDiscordLogin);
logoutBtn.addEventListener('click', handleLogout);
resetBtn.addEventListener('click', resetChat);
scrollDownBtn.addEventListener('click', () => {
  chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
});
chatContainer.addEventListener('scroll', () => {
  const nearBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 100;
  scrollDownBtn.style.display = nearBottom ? 'none' : 'block';
});

// === Google Login ===
function handleGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(result => {
    user = result.user;
    currentUserId = user.uid;
    usernameSpan.textContent = user.displayName;
    googleLoginBtn.style.display = 'none';
    discordLoginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    loadChat();
  });
}

// === Discord Login ===
function handleDiscordLogin() {
  // Discord OAuth2 Login
  const clientId = "1376180153654448180";
  const redirectUri = encodeURIComponent(window.location.origin);
  const scope = encodeURIComponent("identify");
  const responseType = "token";
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}`;
  window.location.href = discordAuthUrl;
}

// === Discord OAuth2 Callback Handling ===
window.addEventListener('load', () => {
  // Prüfe auf Discord Token im Hash
  if (window.location.hash.includes("access_token")) {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get("access_token");
    if (accessToken) {
      fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: "Bearer " + accessToken }
      })
      .then(res => res.json())
      .then(profile => {
        user = {
          displayName: profile.username + "#" + profile.discriminator,
          uid: "discord_" + profile.id
        };
        currentUserId = user.uid;
        usernameSpan.textContent = user.displayName;
        googleLoginBtn.style.display = 'none';
        discordLoginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        loadChat();
      });
      // Entferne Token aus URL
      window.location.hash = '';
    }
  }
});

// === Logout ===
function handleLogout() {
  auth.signOut().then(() => {
    user = { displayName: "Guest" };
    currentUserId = null;
    usernameSpan.textContent = "Guest";
    googleLoginBtn.style.display = 'inline-block';
    discordLoginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    clearChatUI();
  }).catch(() => {
    // Falls nicht eingeloggt via Firebase (z.B. Discord), trotzdem zurücksetzen
    user = { displayName: "Guest" };
    currentUserId = null;
    usernameSpan.textContent = "Guest";
    googleLoginBtn.style.display = 'inline-block';
    discordLoginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    clearChatUI();
  });
}

// === Send Message ===
function handleSend() {
  const message = userInput.value.trim();
  if (!message) return;

  appendMessage("user", message);
  userInput.value = "";
  adjustTextareaHeight();
  toggleButtons(true);

  abortController = new AbortController();

  fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "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",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: "You are Fall AI, a helpful assistant." },
        { role: "user", content: message }
      ],
      stream: true
    }),
    signal: abortController.signal
  })
  .then(response => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let botMsg = "";

    const read = () => reader.read().then(({ value, done }) => {
      if (done) {
        appendMessage("bot", botMsg);
        toggleButtons(false);
        saveChat({ role: "user", content: message });
        saveChat({ role: "bot", content: botMsg });
        return;
      }
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(line => line.trim() !== "");
      for (const line of lines) {
        if (line.startsWith("data:")) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) {
              botMsg += token;
              updateBotTyping(botMsg);
            }
          } catch (e) {}
        }
      }
      return read();
    });
    read();
  })
  .catch(() => {
    appendMessage("bot", "Fehler beim Laden der Antwort.");
    toggleButtons(false);
  });
}

function handleStop() {
  if (abortController) abortController.abort();
  toggleButtons(false);
}

function toggleButtons(loading) {
  sendBtn.style.display = loading ? 'none' : 'inline-block';
  stopBtn.style.display = loading ? 'inline-block' : 'none';
}

function appendMessage(role, content) {
  const msg = document.createElement('div');
  msg.className = `message ${role}`;
  msg.innerHTML = marked.parse(content);
  chat.appendChild(msg);
  chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
}

function updateBotTyping(content) {
  let lastMsg = chat.querySelector('.message.bot:last-child');
  if (!lastMsg) {
    lastMsg = document.createElement('div');
    lastMsg.className = 'message bot';
    chat.appendChild(lastMsg);
  }
  lastMsg.innerHTML = marked.parse(content);
  chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
}

function resetChat() {
  chat.innerHTML = '';
  if (currentUserId) {
    db.collection('chats').doc(currentUserId).set({ messages: [] });
  }
}

function clearChatUI() {
  chat.innerHTML = '';
}

function saveChat(message) {
  if (!currentUserId) return;
  db.collection('chats').doc(currentUserId).get().then(doc => {
    let messages = [];
    if (doc.exists) messages = doc.data().messages || [];
    messages.push(message);
    db.collection('chats').doc(currentUserId).set({ messages });
  });
}

function loadChat() {
  if (!currentUserId) return;
  db.collection('chats').doc(currentUserId).get().then(doc => {
    chat.innerHTML = '';
    if (doc.exists) {
      const messages = doc.data().messages || [];
      messages.forEach(msg => appendMessage(msg.role, msg.content));
    }
  });
}

// === Initial UI State ===
googleLoginBtn.style.display = 'inline-block';
discordLoginBtn.style.display = 'inline-block';
logoutBtn.style.display = 'none';
usernameSpan.textContent = "Guest";
