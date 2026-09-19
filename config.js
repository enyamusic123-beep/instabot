const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const integer = (name, fallback, min, max) => {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
};

function loadConfig() {
  const port = integer("PORT", 3000, 1, 65535);
  const timezone = process.env.WAKING_TIMEZONE || "UTC";
  let formatter;
  try { formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }); } catch {
    throw new Error("WAKING_TIMEZONE must be a valid IANA timezone");
  }
  formatter.format();
  return Object.freeze({
    port,
    dataFile: process.env.QUEUE_FILE || "data/instagram-queue.json",
    openaiApiKey: required("OPENAI_API_KEY"),
    openaiModel: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
    instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN || "",
    instagramUserId: process.env.INSTAGRAM_USER_ID || "",
    instagramApiVersion: process.env.INSTAGRAM_API_VERSION || "v20.0",
    wakingTimezone: timezone,
    wakingStart: integer("WAKING_START_HOUR", 8, 0, 23),
    wakingEnd: integer("WAKING_END_HOUR", 22, 1, 24),
    retryLimit: integer("PUBLISH_RETRY_LIMIT", 3, 0, 10)
  });
}

module.exports = { loadConfig };
