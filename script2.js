// === Firebase Config ===
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId: "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID"
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
  const clientId = "YOUR_DISCORD_CLIENT_ID";
  const redirectUri = encodeURIComponent("YOUR_REDIRECT_URI");
  const scope = encodeURIComponent("identify");
  const responseType = "token";
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}`;
  window.location.href = discordAuthUrl;
}

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
  });
}

// === Send Message ===
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
      "Authorization": "Bearer YOUR_GROQ_API_KEY",
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
   
::contentReference[oaicite:24]{index=24}
 
