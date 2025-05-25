const API_KEY = "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";
const MODEL = "llama3-8b-8192";

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");

let chatHistory = [];

function addMessage(role, content, isTyping = false) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = `bubble${isTyping ? " typing" : ""}`;

  if (role === "user") {
    bubble.textContent = content;
  } else {
    bubble.innerHTML = marked.parse(content);
    bubble.querySelectorAll("pre code").forEach(hljs.highlightElement);
    bubble.querySelectorAll("pre").forEach(pre => {
      if (!pre.querySelector(".copy-btn")) {
        const btn = document.createElement("button");
        btn.className = "copy-btn";
        btn.textContent = "Copy";
        btn.onclick = () => {
          const code = pre.querySelector("code");
          navigator.clipboard.writeText(code.textContent);
          btn.textContent = "Copied!";
          setTimeout(() => (btn.textContent = "Copy"), 1000);
        };
        pre.style.position = "relative";
        pre.appendChild(btn);
      }
    });
  }

  msgDiv.appendChild(bubble);
  chatWindow.appendChild(msgDiv);

  // Scroll nur, wenn man ganz unten ist
  const isAtBottom = chatWindow.scrollHeight - chatWindow.scrollTop <= chatWindow.clientHeight + 50;
  if (isAtBottom) {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  return bubble;
}

async function typeMessage(bubble, fullText) {
  bubble.innerHTML = "";
  let i = 0;

  while (i < fullText.length) {
    bubble.innerHTML += fullText[i++];
    const isAtBottom = chatWindow.scrollHeight - chatWindow.scrollTop <= chatWindow.clientHeight + 50;
    if (isAtBottom) {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
    await new Promise(res => setTimeout(res, 10));
  }

  bubble.innerHTML = marked.parse(fullText);
  bubble.querySelectorAll("pre code").forEach(hljs.highlightElement);
}

async function sendMessage() {
  const msg = userInput.value.trim();
  if (!msg) return;

  addMessage("user", msg);
  userInput.value = "";

  const aiBubble = addMessage("ai", "...", true);
  chatHistory.push({ role: "user", content: msg });

  const context = [
    {
      role: "system",
      content: "You are Fall AI, a helpful and friendly assistant. Format code as Markdown.",
    },
    ...chatHistory.slice(-6),
  ];

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages: context }),
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    aiBubble.classList.remove("typing");

    if (reply) {
      chatHistory.push({ role: "assistant", content: reply });
      await typeMessage(aiBubble, reply.trim());
    } else {
      aiBubble.textContent = "Fehler: Keine Antwort erhalten.";
    }
  } catch (e) {
    aiBubble.classList.remove("typing");
    aiBubble.textContent = "Fehler: " + (e.message || "Unbekannter Fehler.");
  }
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
