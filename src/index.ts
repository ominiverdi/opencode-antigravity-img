import { type Plugin, tool } from "@opencode-ai/plugin";
import * as fs from "fs/promises";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { CONFIG_PATHS, COMMAND_DIR, COMMAND_FILE, COMMAND_CONTENT, QUOTA_COMMAND_FILE, QUOTA_COMMAND_CONTENT, IMAGE_MODEL } from "./constants";
import type { AccountsConfig, Account, ImageGenerationOptions, AspectRatio, ImageSize } from "./types";
import { generateImage, getImageModelQuota } from "./api";
import { selectAccount, markUsed, markRateLimited, MAX_RETRIES, RATE_LIMIT_COOLDOWN_MS } from "./accounts";

// Create command file for opencode discovery
try {
  if (!existsSync(COMMAND_DIR)) {
    mkdirSync(COMMAND_DIR, { recursive: true });
  }
  if (!existsSync(COMMAND_FILE)) {
    writeFileSync(COMMAND_FILE, COMMAND_CONTENT, "utf-8");
  }
  if (!existsSync(QUOTA_COMMAND_FILE)) {
    writeFileSync(QUOTA_COMMAND_FILE, QUOTA_COMMAND_CONTENT, "utf-8");
  }
} catch {
  // Non-fatal if command file creation fails
}

// Track which config file was loaded so we can write back to it
let loadedConfigPath: string | null = null;

/**
 * Load accounts from config file
 */
async function loadAccounts(): Promise<AccountsConfig | null> {
  for (const configPath of CONFIG_PATHS) {
    if (existsSync(configPath)) {
      try {
        const content = await fs.readFile(configPath, "utf-8");
        loadedConfigPath = configPath;
        return JSON.parse(content) as AccountsConfig;
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * Save accounts config back to the file it was loaded from
 */
async function saveAccounts(config: AccountsConfig): Promise<void> {
  const savePath = loadedConfigPath || CONFIG_PATHS[0];
  const dirPath = dirname(savePath);
  if (!existsSync(dirPath)) {
    await fs.mkdir(dirPath, { recursive: true });
  }
  await fs.writeFile(savePath, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Mark an account as recently used and persist to disk
 */
async function markAccountUsed(config: AccountsConfig, email: string): Promise<void> {
  markUsed(config, email);
  await saveAccounts(config);
}

/**
 * Mark an account as rate-limited with a cooldown and persist to disk
 */
async function markAccountRateLimited(config: AccountsConfig, email: string): Promise<void> {
  markRateLimited(config, email);
  await saveAccounts(config);
}

/**
 * Format file size for display
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format quota for display
 */
function formatQuota(percent: number): string {
  if (percent <= 10) return `${percent.toFixed(0)}% (low)`;
  if (percent <= 30) return `${percent.toFixed(0)}% (medium)`;
  return `${percent.toFixed(0)}%`;
}

export const plugin: Plugin = async (ctx) => {
  return {
    tool: {
      /**
       * Generate an image using Gemini 3 Pro Image
       */
      generate_image: tool({
        description:
          "Generate an image using Gemini 3 Pro Image model. " +
          "Provide a text prompt describing the image you want. " +
          "IMPORTANT: Output is always JPEG format regardless of filename extension. " +
          "Returns the path to the generated image file.",
        args: {
          prompt: tool.schema.string().describe("Text description of the image to generate"),
          filename: tool.schema
            .string()
            .optional()
            .describe("Output filename (default: generated_<timestamp>.jpg). Note: format is always JPEG regardless of extension"),
          output_dir: tool.schema
            .string()
            .optional()
            .describe("Output directory (default: current working directory)"),
          aspect_ratio: tool.schema
            .string()
            .optional()
            .describe("Aspect ratio: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 (default: 1:1)"),
          image_size: tool.schema
            .string()
            .optional()
            .describe("Image resolution: 1K, 2K, 4K (default: 1K)"),
        },
        async execute(args, context) {
          const { prompt, filename, output_dir, aspect_ratio, image_size } = args;

          if (!prompt?.trim()) {
            return "Error: Please provide a prompt describing the image to generate.";
          }

          // Load all accounts
          const config = await loadAccounts();
          if (!config?.accounts?.length) {
            return (
              "Error: No Antigravity account found.\n\n" +
              "Please install and configure opencode-antigravity-auth first:\n" +
              "  1. Add 'opencode-antigravity-auth' to your opencode plugins\n" +
              "  2. Authenticate with your Google account\n\n" +
              `Checked paths:\n${CONFIG_PATHS.map((p) => `  - ${p}`).join("\n")}`
            );
          }

          context.metadata({ title: "Generating image..." });

          // Build generation options
          const options: ImageGenerationOptions = {};
          if (aspect_ratio) options.aspectRatio = aspect_ratio as AspectRatio;
          if (image_size) options.imageSize = image_size as ImageSize;
          const genOptions = Object.keys(options).length > 0 ? options : undefined;

          // Retry loop: rotate through accounts on any failure
          const excludeEmails: string[] = [];
          const errors: string[] = [];

          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const account = selectAccount(config, excludeEmails);
            if (!account) break;

            const result = await generateImage(account, prompt, genOptions);

            if (result.success && result.imageData) {
              // Mark account as used for round-robin rotation
              await markAccountUsed(config, account.email);

              // Determine output path (always JPEG regardless of extension)
              const dir = output_dir || ctx.directory;
              const name = filename || `generated_${Date.now()}.jpg`;
              const outputPath = join(dir, name);

              // Ensure directory exists
              const outDir = dirname(outputPath);
              if (!existsSync(outDir)) {
                await fs.mkdir(outDir, { recursive: true });
              }

              // Decode and save image
              const imageBuffer = Buffer.from(result.imageData, "base64");
              await fs.writeFile(outputPath, imageBuffer);

              const sizeStr = formatSize(imageBuffer.length);
              const totalAccounts = config.accounts.length;
              const usedLabel = totalAccounts > 1 ? ` (account: ${account.email})` : "";

              context.metadata({
                title: "Image generated",
                metadata: {
                  path: outputPath,
                  size: sizeStr,
                  format: result.mimeType,
                },
              });

              // Build response
              let response = `Image generated successfully!${usedLabel}\n\n`;
              response += `Path: ${outputPath}\n`;
              response += `Size: ${sizeStr}\n`;
              response += `Format: ${result.mimeType}\n`;

              if (result.quota) {
                response += `\nQuota: ${formatQuota(result.quota.remainingPercent)} remaining`;
              }

              return response;
            }

            // Rate-limited: mark with cooldown so future calls skip it too
            if (result.isRateLimited) {
              await markAccountRateLimited(config, account.email);
            }

            // Any failure: log it and try the next account
            const reason = result.isRateLimited ? "rate-limited" : (result.error || "unknown error");
            errors.push(`${account.email}: ${reason}`);
            excludeEmails.push(account.email);
          }

          // All accounts failed -- build a helpful summary
          let msg = "Error: Image generation failed.\n\n";
          if (errors.length > 0) {
            msg += "Accounts tried:\n";
            msg += errors.map((e) => `  - ${e}`).join("\n") + "\n\n";
          } else {
            msg += "No accounts available to try.\n\n";
          }
          msg += "Possible fixes:\n";
          msg += "  - If rate-limited, wait a few minutes for quota to reset\n";
          msg += "  - If project ID errors, open the Antigravity IDE once with that Google account\n";
          msg += "  - Run image_quota to check account status";
          return msg;
        },
      }),

      /**
       * Check quota for image generation model
       */
      image_quota: tool({
        description:
          "Check the remaining quota for the Gemini 3 Pro Image model. " +
          "Shows percentage remaining and time until reset.",
        args: {},
        async execute(args, context) {
          const config = await loadAccounts();
          if (!config?.accounts?.length) {
            return (
              "Error: No Antigravity account found.\n" +
              "Please configure opencode-antigravity-auth first."
            );
          }

          context.metadata({ title: "Checking quota..." });

          const accounts = config.accounts;
          const isSingle = accounts.length === 1;

          // Single account: keep the original compact output
          if (isSingle) {
            const quota = await getImageModelQuota(accounts[0]);
            if (!quota) return "Error: Could not fetch quota information.";

            context.metadata({
              title: "Quota",
              metadata: {
                remaining: `${quota.remainingPercent.toFixed(0)}%`,
                resetIn: quota.resetIn,
              },
            });

            const barWidth = 20;
            const filled = Math.round((quota.remainingPercent / 100) * barWidth);
            const bar = "#".repeat(filled) + ".".repeat(barWidth - filled);

            let response = `${quota.modelName}\n\n`;
            response += `[${bar}] ${quota.remainingPercent.toFixed(0)}% remaining\n`;
            response += `Resets in: ${quota.resetIn}`;
            if (quota.resetTime) {
              const resetDate = new Date(quota.resetTime);
              response += ` (at ${resetDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;
            }
            return response;
          }

          // Multi-account: show per-account breakdown
          let response = `Image quota -- ${accounts.length} accounts\n\n`;
          const now = Date.now();

          for (const account of accounts) {
            const quota = await getImageModelQuota(account);
            const rateLimited = account.rateLimitedUntil && account.rateLimitedUntil > now;

            if (quota) {
              const barWidth = 20;
              const filled = Math.round((quota.remainingPercent / 100) * barWidth);
              const bar = "#".repeat(filled) + ".".repeat(barWidth - filled);
              const flag = rateLimited ? " [rate-limited]" : "";
              response += `${account.email}${flag}\n`;
              response += `  [${bar}] ${quota.remainingPercent.toFixed(0)}% -- resets in ${quota.resetIn}\n`;
            } else {
              response += `${account.email}\n`;
              response += `  [error fetching quota]\n`;
            }
          }

          context.metadata({
            title: "Quota",
            metadata: { accounts: String(accounts.length) },
          });

          return response;
        },
      }),
    },
  };
};

export default plugin;
