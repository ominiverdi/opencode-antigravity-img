import { homedir } from "os";
import { join } from "path";
import { platform } from "process";

// OAuth credentials (same as antigravity-auth plugin)
export const ANTIGRAVITY_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
export const ANTIGRAVITY_CLIENT_SECRET = "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";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// CloudCode API
export const CLOUDCODE_BASE_URL = "https://daily-cloudcode-pa.googleapis.com";
export const CLOUDCODE_FALLBACK_URLS = [
  "https://daily-cloudcode-pa.googleapis.com",
  "https://daily-cloudcode-pa.sandbox.googleapis.com",
  "https://cloudcode-pa.googleapis.com",
];

export const CLOUDCODE_METADATA = {
  ideType: "ANTIGRAVITY",
  platform: "PLATFORM_UNSPECIFIED",
  pluginType: "GEMINI",
};

// Image generation
export const IMAGE_MODEL = "gemini-3-pro-image";
export const IMAGE_GENERATION_TIMEOUT_MS = 120_000;

// Config directory (match opencode-antigravity-auth behavior)
function getConfigDir(): string {
  if (platform === "win32") {
    return join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "opencode");
  }
  const xdgConfig = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(xdgConfig, "opencode");
}

// Config file paths (primary path matches auth plugin, fallback for legacy)
export const CONFIG_PATHS = [
  join(getConfigDir(), "antigravity-accounts.json"),
  join(homedir(), ".opencode", "antigravity-accounts.json"),
];

// Command file for opencode discovery
export const COMMAND_DIR = join(getConfigDir(), "commands");
export const COMMAND_FILE = join(COMMAND_DIR, "generate-image.md");
export const COMMAND_CONTENT = `# Generate Image

Generate an image using Gemini 3 Pro Image model.

Prompt: $PROMPT
Output filename (optional): $FILENAME
`;
