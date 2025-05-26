// ==== Konfiguration (HIER EINTRAGEN) ====
const GROQ_API_KEY = "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";
const DISCORD_CLIENT_ID = "1376180153654448180";
const GOOGLE_CLIENT_ID = "430741103805-r80p5k14p9e66srupo4jvdle4pen1fqb.apps.googleusercontent.com";
const REDIRECT_URI = "https://fallai.netlify.app"; // Für Production

// ==== AI Funktionen ====
let abortController = null;
let isTyping = false;

async function sendToAI(message) {
  const chat = document.getElementById('chat');
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'message bot typing-animation';
  typingIndicator.textContent = 'Fall AI denkt nach';
  chat.appendChild(typingIndicator);
  chat.scrollTop = chat.scrollHeight;

  abortController = new AbortController();
  
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: message }],
        stream: true
      }),
      signal: abortController.signal
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = JSON.parse(line.replace('data: ', ''));
          const content = data.choices[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            updateTypingIndicator(fullResponse);
          }
        }
      }
    }

    typingIndicator.remove();
    addMessage('bot', fullResponse);
  } catch (err) {
    if (err.name === 'AbortError') {
      addMessage('bot', 'Antwort abgebrochen');
    } else {
      addMessage('bot', 'Fehler: ' + err.message);
    }
  }
}

// ==== UI Funktionen ====
document.getElementById('send-btn').addEventListener('click', async () => {
  const input = document.getElementById('user-input');
  const message = input.value.trim();
  if (!message) return;

  addMessage('user', message);
  input.value = '';
  await sendToAI(message);
});

// ==== Login System (Discord Beispiel) ====
document.getElementById('login-discord').addEventListener('click', () => {
  window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify`;
});

// ==== Hilfsfunktionen ====
function addMessage(role, content) {
  const chat = document.getElementById('chat');
  const msg = document.createElement('div');
  msg.className = `message ${role}`;
  msg.textContent = content;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function updateTypingIndicator(text) {
  const typingIndicator = document.querySelector('.typing-animation');
  if (typingIndicator) {
    typingIndicator.textContent = text;
  }
}

// Lucide Icons initialisieren
lucide.createIcons();
