// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAPf_EoIxzFhArc83GBaIy7h--2Kye0T3E",
  authDomain: "fallai-e4e92.firebaseapp.com",
  projectId: "fallai-e4e92",
  storageBucket: "fallai-e4e92.appspot.com",
  messagingSenderId: "1015085978833",
  appId: "1:1015085978833:web:3a51e6320a94c80bbc21f0"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let user = { displayName: "Guest" };
let currentUserId = null;
let abortController = null;

const chat = document.getElementById('chat');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const stopBtn = document.getElementById('stop-btn');
const scrollBtn = document.getElementById('scroll-btn');
const loginGoogle = document.getElementById('login-google');
const loginDiscord = document.getElementById('login-discord');
const logoutBtn = document.getElementById('logout-btn');
const usernameSpan = document.getElementById('username');
const resetBtn = document.getElementById('reset-chat-btn');

sendBtn.addEventListener('click', handleSend);
stopBtn.addEventListener('click', handleStop);
loginGoogle.addEventListener('click', loginWithGoogle);
loginDiscord.addEventListener('click', loginWithDiscord);
logoutBtn.addEventListener('click', handleLogout);
resetBtn.addEventListener('click', resetChat);
scrollBtn.addEventListener('click', () => chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" }));
chat.addEventListener('scroll', () => {
  scrollBtn.style.display = chat.scrollTop + chat.clientHeight < chat.scrollHeight - 100 ? "flex" : "none";
});

function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(result => {
    user = result.user;
    currentUserId = user.uid;
    usernameSpan.textContent = user.displayName;
    loginGoogle.style.display = 'none';
    loginDiscord.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    loadChat();
  });
}

function loginWithDiscord() {
  const provider = new firebase.auth.OAuthProvider('oidc.discord');
  auth.signInWithPopup(provider).then(result => {
    user = result.user;
    currentUserId = user.uid;
    usernameSpan.textContent = user.displayName;
    loginGoogle.style.display = 'none';
    loginDiscord.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    loadChat();
  });
}

function handleLogout() {
  auth.signOut().then(() => {
    user = { displayName: "Guest" };
    currentUserId = null;
    usernameSpan.textContent = "Guest";
    loginGoogle.style.display = 'inline-block';
    loginDiscord.style.display = 'inline-block';
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
  let botMsg = "";

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
  }).then(response => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

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

    return read();
  }).catch(error => {
    if (error.name === "AbortError") {
      appendMessage("bot", "(Answer canceled)");
    } else {
      appendMessage("bot", "An error occurred.");
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

let typingEl = null;
function updateBotTyping(text) {
  if (!typingEl) {
    typingEl = document.createElement("div");
    typingEl.className = "message bot";
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
    ...msg,
    timestamp: Date.now()
  });
}

function loadChat() {
  if (!currentUserId) return;
  clearChatUI();
  db.collection("chats").doc(currentUserId).collection("messages").orderBy("timestamp").get()
    .then(snapshot => snapshot.forEach(doc => {
      const msg = doc.data();
      appendMessage(msg.role, msg.content);
    }));
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
    batch.commit().then(clearChatUI);
  });
}

lucide.createIcons();
