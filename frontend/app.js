const form = document.querySelector("#prompt-form");
const promptInput = document.querySelector("#prompt");
const output = document.querySelector("#output");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const prompt = promptInput.value.trim();
  if (!prompt) {
    output.textContent = "Enter a prompt first.";
    return;
  }

  output.textContent = "Contacting local backend...";

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt, sessionId: crypto.randomUUID() })
    });

    const payload = await response.json();

    if (!response.ok) {
      output.textContent = payload.detail || payload.error || "Request failed.";
      return;
    }

    output.textContent = payload.text || JSON.stringify(payload, null, 2);
  } catch (error) {
    output.textContent = error.message;
  }
});
