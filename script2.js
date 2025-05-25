// --- Fall AI Web Chat with Groq Cloud API ---

const GROQ_API_KEY = "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"; // <--- Dein API-Key
const MODEL = "llama3-8b-8192"; // Alternativ: "mixtral-8x7b-32768", "gemma-7b-it"

let chatHistory = [];

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");

// === Nachricht hinzufügen ===
function addMessage(role, content, isTyping = false) {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message " + (role === "user" ? "user" : "ai");

  const bubble = document.createElement("div");
  bubble.className = "bubble" + (isTyping ? " typing" : "");

  if (role === "user") {
    bubble.textContent = content;
  } else {
    bubble.innerHTML = marked.parse(content);
    bubble.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block);
    });
    bubble.querySelectorAll("pre").forEach((pre) => {
      if (!pre.querySelector(".copy-btn")) {
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
    });
  }

  msgDiv.appendChild(bubble);
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return bubble;
}

// === AI Typing Effekt ===
async function typeMessage(bubble, fullText) {
  bubble.innerHTML = "";
  let i = 0;

  while (i < fullText.length) {
    if (fullText.slice(i, i + 3) === "```") {
      const end = fullText.indexOf("```", i + 3);
      if (end !== -1) {
        bubble.innerHTML += marked.parse(fullText.slice(i, end + 3));
        i = end + 3;
        continue;
      }
    }

    bubble.innerHTML += fullText[i];
    i++;

    // === Nur scrollen, wenn User ganz unten ist ===
    const isAtBottom = chatWindow.scrollHeight - chatWindow.scrollTop <= chatWindow.clientHeight + 50;
    if (isAtBottom) {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    await new Promise((res) => setTimeout(res, 8 + Math.random() * 30));
  }

  // === Nach dem Tippen volle Nachricht formatieren ===
  bubble.innerHTML = marked.parse(fullText);
  bubble.querySelectorAll("pre code").forEach((block) => hljs.highlightElement(block));
  bubble.querySelectorAll("pre").forEach((pre) => {
    if (!pre.querySelector(".copy-btn")) {
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
  });

  // Nachträgliches Scrollen ganz ans Ende
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// === Nachricht senden ===
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
      body: JSON.stringify({
        model: MODEL,
        messages: context,
      }),
    });

    const data = await res.json();
    const aiText = data.choices?.[0]?.message?.content;

    if (aiText) {
      chatHistory.push({ role: "assistant", content: aiText });
      aiBubble.classList.remove("typing");
      await typeMessage(aiBubble, aiText.trim());
    } else if (data.error?.message) {
      aiBubble.classList.remove("typing");
      aiBubble.textContent = "Groq API error: " + data.error.message;
    } else {
      aiBubble.classList.remove("typing");
      aiBubble.textContent = "Sorry, I couldn't get a response from Groq Cloud.";
    }
  } catch (err) {
    aiBubble.classList.remove("typing");
    aiBubble.textContent =
      "Fehler: " + (err.message || "Netzwerkfehler oder ungültiger API-Schlüssel.");
  }

  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// === Event Listener für Formular ===
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage();
});

// === Enter drücken zum Senden, Shift+Enter für neue Zeile ===
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// === Scroll bei Resize ===
window.addEventListener("resize", () => {
  chatWindow.scrollTop = chatWindow.scrollHeight;
});
