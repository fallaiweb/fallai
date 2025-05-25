const GROQ_API_KEY = "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";
const MODEL = "llama3-8b-8192";

let chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
let abortController = null;

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const stopBtn = document.getElementById("stop-btn");

function addMessage(role, content, isTyping = false) {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message " + (role === "user" ? "user" : "ai");

  const bubble = document.createElement("div");
  bubble.className = "bubble" + (isTyping ? " typing" : "");
  bubble.setAttribute("data-role", role);

  if (role === "user") {
    bubble.textContent = content;
  } else {
    bubble.innerHTML = marked.parse(content || "");
    bubble.querySelectorAll("pre code").forEach((block) => hljs.highlightElement(block));
    bubble.querySelectorAll("pre").forEach((pre) => addCopyButton(pre));
  }

  msgDiv.appendChild(bubble);
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return bubble;
}

function addCopyButton(pre) {
  if (pre.querySelector(".copy-btn")) return;
  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.textContent = "Copy";
  btn.onclick = () => {
    const code = pre.querySelector("code");
    if (code) {
      navigator.clipboard.writeText(code.textContent);
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = "Copy"), 1200);
    }
  };
  pre.prepend(btn);
}

async function typeMessage(bubble, fullText) {
  bubble.innerHTML = "";
  let i = 0;
  while (i < fullText.length) {
    if (!abortController) break;
    bubble.innerHTML += fullText[i++];
    chatWindow.scrollTop = chatWindow.scrollHeight;
    await new Promise((res) => setTimeout(res, 8 + Math.random() * 30));
  }
  bubble.innerHTML = marked.parse(fullText);
  bubble.querySelectorAll("pre code").forEach((block) => hljs.highlightElement(block));
  bubble.querySelectorAll("pre").forEach((pre) => addCopyButton(pre));
  sendBtn.style.display = "inline-block";
  stopBtn.style.display = "none";
}

async function sendMessage() {
  const msg = userInput.value.trim();
  if (!msg || abortController) return;

  addMessage("user", msg);
  userInput.value = "";
  const aiBubble = addMessage("ai", "...", true);

  chatHistory.push({ role: "user", content: msg });

  const context = [
    {
      role: "system",
      content:
        "You are Fall AI, a helpful and friendly assistant for the web. Format code as Markdown. Keep answers concise and helpful.",
    },
    ...chatHistory.slice(-6),
  ];

  abortController = new AbortController();
  sendBtn.style.display = "none";
  stopBtn.style.display = "inline-block";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + GROQ_API_KEY,
      },
      body: JSON.stringify({ model: MODEL, messages: context }),
      signal: abortController.signal,
    });

    const data = await res.json();
    const aiText = data.choices?.[0]?.message?.content;

    aiBubble.classList.remove("typing");

    if (aiText) {
      chatHistory.push({ role: "assistant", content: aiText });
      localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
      await typeMessage(aiBubble, aiText.trim());
    } else {
      aiBubble.textContent = "⚠️ API Error: " + (data.error?.message || "Keine Antwort erhalten.");
    }
  } catch (err) {
    aiBubble.classList.remove("typing");
    aiBubble.textContent = "⛔ Stopp gedrückt oder Fehler: " + (err.message || "Unbekannter Fehler");
  }

  abortController = null;
  sendBtn.style.display = "inline-block";
  stopBtn.style.display = "none";
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage();
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

stopBtn.addEventListener("click", () => {
  if (abortController) {
    abortController.abort();
    abortController = null;
    sendBtn.style.display = "inline-block";
    stopBtn.style.display = "none";
  }
});

window.addEventListener("resize", () => {
  chatWindow.scrollTop = chatWindow.scrollHeight;
});

window.addEventListener("DOMContentLoaded", () => {
  chatHistory.forEach((msg) => addMessage(msg.role, msg.content));
  chatWindow.scrollTop = chatWindow.scrollHeight;
});
