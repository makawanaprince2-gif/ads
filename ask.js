// Runs on Vercel's servers. Receives the FULL conversation so far (sent
// fresh by the browser on every request — the server itself stores nothing
// between requests), builds a multi-turn prompt, and returns the next reply.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Send a non-empty messages array." });
  }

  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    return res.status(500).json({
      error: "Server is missing HF_TOKEN. Add it in Vercel → Project → Settings → Environment Variables.",
    });
  }

  const MODEL = "mistralai/Mistral-7B-Instruct-v0.2";

  const systemPrompt =
    "You are a precise coding tutor. You help with Python, R/RStudio, " +
    "machine learning, and web development. Give correct, working code. " +
    "When the user pastes an exam question, past paper, or assignment text, " +
    "solve it step by step and explain the reasoning in plain, simple " +
    "language as you go -- as if teaching a friend who has never seen it " +
    "before -- not just the final code. Break down what each part of the " +
    "code does and why, not only what it outputs. When the user asks you to " +
    "fix or change one part of something you already wrote, apply exactly " +
    "that change and leave the rest as it was. If the message includes text " +
    "extracted from a photo or screenshot (it may contain OCR errors, odd " +
    "spacing, or misread characters), do your best to infer the intended " +
    "question and mention briefly if anything looked unclear or garbled.";

  // Build a Mistral-style multi-turn prompt:
  // <s>[INST] system + first user msg [/INST] assistant reply</s>
  // [INST] next user msg [/INST] assistant reply</s> ...
  // [INST] latest user msg [/INST]   <- model completes this
  let prompt = "";
  messages.forEach((m, i) => {
    if (m.role === "user") {
      const content = i === 0 ? `${systemPrompt}\n\n${m.content}` : m.content;
      prompt += `<s>[INST] ${content} [/INST]`;
    } else if (m.role === "assistant") {
      prompt += ` ${m.content}</s>`;
    }
  });

  try {
    const hfResponse = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 800,
            temperature: 0.3,
            return_full_text: false,
          },
          options: {
            wait_for_model: true,
          },
        }),
      }
    );

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      return res.status(hfResponse.status).json({
        error: `Hugging Face API error: ${errText}`,
      });
    }

    const data = await hfResponse.json();
    const answer = Array.isArray(data)
      ? data[0]?.generated_text
      : data.generated_text || JSON.stringify(data);

    return res.status(200).json({ answer: (answer || "").trim() });
  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
