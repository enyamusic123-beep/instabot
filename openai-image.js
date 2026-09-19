const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

async function generateImage(prompt, config) {
  if (!prompt || prompt.length > 4000) throw new Error("prompt is required and must be 4000 characters or fewer");
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { authorization: `Bearer ${config.openaiApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: config.openaiModel, prompt, size: "1024x1024" })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OpenAI image generation failed (${response.status}): ${body.error?.message || "unknown error"}`);
  const generated = body.data?.[0];
  if (generated?.url) return generated.url;
  if (!generated?.b64_json) throw new Error("OpenAI image generation returned no usable image");
  if (!config.publicBaseUrl) throw new Error("PUBLIC_BASE_URL is required to publish generated images to Instagram");
  const filename = `${crypto.randomUUID()}.png`;
  await fs.mkdir(path.join(__dirname, "..", "generated"), { recursive: true });
  await fs.writeFile(path.join(__dirname, "..", "generated", filename), Buffer.from(generated.b64_json, "base64"));
  return `${config.publicBaseUrl.replace(/\/$/, "")}/generated/${filename}`;
}

module.exports = { generateImage };
