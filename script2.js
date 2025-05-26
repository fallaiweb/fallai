// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyAPf_EoIxzFhArc83GBaIy7h--2Kye0T3E",
  authDomain: "fallai-e4e92.firebaseapp.com",
  projectId: "fallai-e4e92",
  storageBucket: "fallai-e4e92.firebasestorage.app",
  messagingSenderId: "1015085978833",
  appId: "1:1015085978833:web:3a51e6320a94c80bbc21f0"
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
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const usernameSpan = document.getElementById('username');
const resetBtn = document.getElementById('reset-chat-btn');
const scrollBtn = document.getElementById('scroll-down-btn');

// === Event Listeners ===
sendBtn.addEventListener('click', handleSend);
stopBtn.addEventListener('click', handleStop);
loginBtn.addEventListener('click', handleGoogleLogin);
logoutBtn.addEventListener('click', handleLogout);
resetBtn.addEventListener('click', resetChat);
scrollBtn.addEventListener('click', scrollToBottom);

chat.addEventListener('scroll', () => {
  if (chat.scrollTop + chat.clientHeight < chat.scrollHeight - 50) {
    scrollBtn.style.display = 'block';
  } else {
    scrollBtn.style.display = 'none';
  }
});

function scrollToBottom() {
  chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
}

// === Google Login ===
function handleGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(result => {
    user = result.user;
    currentUserId = user.uid;
    usernameSpan.textContent = user.displayName;
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    loadChat();
  });
}

// === Discord Login (via OAuth2 redirect) ===
function handleDiscordLogin() {
  const redirectUri = encodeURIComponent(window.location.href);
  const clientId = "1376180153654448180";
  const scope = "identify email";
  const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
  window.location.href = discordUrl;
}

function handleLogout() {
  auth.signOut().then(() => {
    user = { displayName: "Guest" };
    currentUserId = null;
    usernameSpan.textContent = "Guest";
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    clearChatUI();
  });
}

function handleSend() {
  const message = userInput.value.trim();
  if (!message) return;

  appendMessage("user", message);
  userInput.value = "";
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
        typingEl = null;
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

    return read();
  })
  .catch(error => {
    if (error.name === "AbortError") {
      appendMessage("bot", "(Answer cancelled)");
    } else {
      appendMessage("bot", "An error has occurred.");
    }
    toggleButtons(false);
  });
}

function handleStop() {
  if (abortController) {
    abortController.abort();
  }
}

function appendMessage(role, content) {
  const msg = document.createElement("div");
  msg.className = role;
  msg.textContent = content;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

let typingEl = null;
function updateBotTyping(text) {
  if (!typingEl) {
    typingEl = document.createElement("div");
    typingEl.className = "bot";
    chat.appendChild(typingEl);
  }
  typingEl.textContent = text;
  chat.scrollTop = chat.scrollHeight;
}

function toggleButtons(loading) {
  sendBtn.style.display = loading ? "none" : "inline-block";
  stopBtn.style.display = loading ? "inline-block" : "none";
}

function saveChat(msg) {
  if (!currentUserId) return;
  db.collection("chats").doc(currentUserId).collection("messages").add({
    role: msg.role,
    content: msg.content,
    timestamp: Date.now()
  });
}

function loadChat() {
  if (!currentUserId) return;
  clearChatUI();
  db.collection("chats")
    .doc(currentUserId)
    .collection("messages")
    .orderBy("timestamp")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const msg = doc.data();
        appendMessage(msg.role, msg.content);
      });
    });
}

function clearChatUI() {
  chat.innerHTML = "";
}

function resetChat() {
  if (!currentUserId) {
    clearChatUI();
    return;
  }
  const messagesRef = db.collection("chats").doc(currentUserId).collection("messages");
  messagesRef.get().then(snapshot => {
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    batch.commit().then(() => clearChatUI());
  });
}
