// script.js
import { auth, provider, signInWithPopup, signOut, db, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, where } from './firebase-config.js';

const chatDiv = document.getElementById("chat");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const stopBtn = document.getElementById("stop-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const resetBtn = document.getElementById("reset-chat-btn");
const usernameSpan = document.getElementById("username");

let isStreaming = false;
let controller = null;
let currentUser = null;

function renderMessage(sender, text) {
  const div = document.createElement("div");
  div.textContent = `${sender}: ${text}`;
  div.className = sender === "Fall AI" ? "bot" : "user";
  chatDiv.appendChild(div);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

async function fetchChatHistory() {
  chatDiv.innerHTML = "";
  if (!currentUser) return;
  const q = query(collection(db, "messages"), where("uid", "==", currentUser.uid), orderBy("timestamp"));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const d = doc.data();
    renderMessage(d.sender, d.text);
  });
}

async function sendMessage(text) {
  renderMessage("Guest", text);
  await addDoc(collection(db, "messages"), {
    uid: currentUser.uid,
    sender: "Guest",
    text,
    timestamp: Date.now()
  });

  sendBtn.style.display = "none";
  stopBtn.style.display = "inline-block";

  controller = new AbortController();
  isStreaming = true;
  let reply = "";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "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"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: text }],
        stream: true
      }),
      signal: controller.signal
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (isStreaming) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split(\"\\n\");
      buffer = parts.pop();

      for (const part of parts) {
        if (part.startsWith(\"data: \")) {
          const data = part.slice(6).trim();
          if (data === \"[DONE]\") break;
          const parsed = JSON.parse(data);
          const delta = parsed.choices[0].delta.content;
          if (delta) {
            reply += delta;
            renderMessage(\"Fall AI\", reply);
            chatDiv.lastChild.textContent = `Fall AI: ${reply}`;
          }
        }
      }
    }

    await addDoc(collection(db, \"messages\"), {
      uid: currentUser.uid,
      sender: \"Fall AI\",
      text: reply,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error(err);
  } finally {
    sendBtn.style.display = \"inline-block\";
    stopBtn.style.display = \"none\";
    isStreaming = false;
  }
}

sendBtn.onclick = () => {
  const text = userInput.value.trim();
  if (text) {
    userInput.value = \"\";
    sendMessage(text);
  }
};

stopBtn.onclick = () => {
  if (controller) controller.abort();
  sendBtn.style.display = \"inline-block\";
  stopBtn.style.display = \"none\";
  isStreaming = false;
};

loginBtn.onclick = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    usernameSpan.textContent = currentUser.displayName || \"Guest\";
    loginBtn.style.display = \"none\";
    logoutBtn.style.display = \"inline-block\";
    fetchChatHistory();
  } catch (e) {
    console.error(\"Login failed\", e);
  }
};

logoutBtn.onclick = async () => {
  await signOut(auth);
  currentUser = null;
  chatDiv.innerHTML = \"\";
  usernameSpan.textContent = \"Guest\";
  loginBtn.style.display = \"inline-block\";
  logoutBtn.style.display = \"none\";
};

resetBtn.onclick = async () => {
  if (!currentUser) return;
  const q = query(collection(db, \"messages\"), where(\"uid\", \"==\", currentUser.uid));
  const snap = await getDocs(q);
  for (const docu of snap.docs) {
    await deleteDoc(doc(db, \"messages\", docu.id));
  }
  chatDiv.innerHTML = \"\";
};

window.onload = () => {
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      usernameSpan.textContent = currentUser.displayName || \"Guest\";
      loginBtn.style.display = \"none\";
      logoutBtn.style.display = \"inline-block\";
      fetchChatHistory();
    }
  });
};
