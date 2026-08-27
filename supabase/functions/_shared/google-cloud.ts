import { requiredEnv } from "./funded-cleanup.ts";

export const geminiRelayConfig = () => {
  const configuredUrl = requiredEnv("GEMINI_RELAY_URL");
  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error("GEMINI_RELAY_URL is invalid");
  }
  if (
    url.protocol !== "https:" || url.origin !== configuredUrl ||
    url.pathname !== "/" || url.username || url.password || url.search ||
    url.hash
  ) {
    throw new Error("GEMINI_RELAY_URL must be an exact HTTPS origin");
  }
  const sharedSecret = requiredEnv("GEMINI_RELAY_SHARED_SECRET");
  if (sharedSecret.length < 32 || /\s/.test(sharedSecret)) {
    throw new Error("GEMINI_RELAY_SHARED_SECRET is invalid");
  }
  return {
    endpoint: new URL("/v1/review", url).toString(),
    sharedSecret,
  };
};
