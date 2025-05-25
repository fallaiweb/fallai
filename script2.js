const GROQ_API_KEY = "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";
const MODEL = "llama3-8b-8192";

let isTyping = false;
let shouldStopTyping = false;

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const stopButton = document.getElementById("stop-button");
const scrollDownBtn = document.getElementById("scroll-down-btn");

function addMessage(role, content, isTyping = false) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.setAttribute("data-role", role);

  if (role === "user") {
    bubble.textContent = content;
  } else {
    bubble.innerHTML = marked.parse(content || "");
    bubble.querySelectorAll("pre code").forEach((block) => hljs.highlightElement(block));
  }

  msgDiv.appendChild(bubble);
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return bubble;
}

async function typeMessage(bubble, fullText) {
  bubble.innerHTML = "";
  let i = 0;
  isTyping = true;
  stopButton.style.display = "inline-block";

  while (i < fullText.length && !shouldStopTyping) {
    bubble.innerHTML += fullText[i++];
    chatWindow.scrollTop = chatWindow.scrollHeight;
    await new Promise((res) => setTimeout(res, 8 + Math.random() * 30));
  }

  if (!shouldStopTyping) {
    bubble.innerHTML = marked.parse(fullText);
    bubble.querySelectorAll("pre code").forEach((block) => hljs.highlightElement(block));
  } else {
    bubble.innerHTML += "\n\n⛔ Answer canceled.";
  }

  isTyping = false;
  shouldStopTyping = false;
  stopButton.style.display = "none";
}

async function sendMessage() {
  if (isTyping) {
    shouldStopTyping = true;
    return;
  }

  const msg = userInput.value.trim();
  if (!msg) return;

  addMessage("user", msg);
  userInput.value = "";

  const aiBubble = addMessage("ai", "...", true);

  const context = [
    {
      role: "system",
      content: "You are Fall AI, a helpful and friendly assistant for the web. Format code as Markdown. Keep answers concise and helpful.",
    },
    { role: "user", content: msg },
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

    if
::contentReference[oaicite:32]{index=32}
 
