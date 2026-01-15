import { homedir } from "os";
import { join } from "path";

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

// Config file paths
export const CONFIG_PATHS = [
  join(homedir(), ".config", "opencode", "antigravity-accounts.json"),
  join(homedir(), ".opencode", "antigravity-accounts.json"),
];

// Command file for opencode discovery
export const COMMAND_DIR = join(homedir(), ".config", "opencode", "commands");
export const COMMAND_FILE = join(COMMAND_DIR, "generate-image.md");
export const COMMAND_CONTENT = `# Generate Image

Generate an image using Gemini 3 Pro Image model.

Prompt: $PROMPT
Output filename (optional): $FILENAME
`;
