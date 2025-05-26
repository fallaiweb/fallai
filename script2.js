const GROQ_API_KEY = "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";
const MODEL = "llama3-8b-8192";

// Verlaufsdaten bei jedem Neuladen löschen
localStorage.removeItem("chatHistory");

let chatHistory = [];
let isTyping = false;
let shouldStopTyping = false;

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const stopButton = document.getElementById("stop-button");

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
  btn.title = "Kopiere Code in Zwischenablage";
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
  isTyping = true;
  shouldStopTyping = false;
  stopButton.style.display = "inline-block";
  stopButton.textContent = "⏹ Stop";

  while (i < fullText.length && !shouldStopTyping) {
    if (fullText.slice(i, i + 3) === "```") {
      const end = fullText.indexOf("```", i + 3);
      if (end !== -1) {
        bubble.innerHTML += marked.parse(fullText.slice(i, end + 3));
        i = end + 3;
        continue;
      }
    }
    bubble.innerHTML += fullText[i++];
    chatWindow.scrollTop = chatWindow.scrollHeight;
    await new Promise((res) => setTimeout(res, 8 + Math.random() * 30));
  }

  if (!shouldStopTyping) {
    bubble.innerHTML = marked.parse(fullText);
    bubble.querySelectorAll("pre code").forEach((block) => hljs.highlightElement(block));
    bubble.querySelectorAll("pre").forEach((pre) => addCopyButton(pre));
  } else {
    bubble.innerHTML += "\n\n⛔ Antwort abgebrochen.";
  }

  isTyping = false;
  shouldStopTyping = false;
  stopButton.style.display = "none";
  stopButton.textContent = "⏹ Stop";
  stopButton.disabled = false;
}

async function sendMessage() {
  if (isTyping) return;

  const msg = userInput.value.trim();
  if (!msg) return;

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

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + GROQ_API_KEY,
      },
      body: JSON.stringify({ model: MODEL, messages: context }),
    });

    const data = await res.json();
    const aiText = data.choices?.[0]?.message?.content;

    aiBubble.classList.remove("typing");

    if (aiText) {
      chatHistory.push({ role: "assistant", content: aiText });
      await typeMessage(aiBubble, aiText.trim());
    } else {
      aiBubble.textContent = "⚠️ API Error: " + (data.error?.message || "Keine Antwort erhalten.");
    }
  } catch (err) {
    aiBubble.classList.remove("typing");
    aiBubble.textContent =
      "⚠️ Netzwerkfehler oder ungültiger API-Key: " + (err.message || "Unbekannter Fehler");
  }

  chatWindow.scrollTop = chatWindow.scrollHeight;
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

stopButton.addEventListener("click", () => {
  if (isTyping) {
    shouldStopTyping = true;
    stopButton.textContent = "⏳ Stoppe...";
    stopButton.disabled = true;
  }
});

window.addEventListener("resize", () => {
  chatWindow.scrollTop = chatWindow.scrollHeight;
});

window.addEventListener("DOMContentLoaded", () => {
  // Verlauf gelöscht durch removeItem oben
  chatWindow.innerHTML = "";
  chatWindow.scrollTop = chatWindow.scrollHeight;
});
