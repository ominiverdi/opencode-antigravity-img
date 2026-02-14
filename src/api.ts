import {
  ANTIGRAVITY_CLIENT_ID,
  ANTIGRAVITY_CLIENT_SECRET,
  GOOGLE_TOKEN_URL,
  CLOUDCODE_BASE_URL,
  CLOUDCODE_FALLBACK_URLS,
  CLOUDCODE_METADATA,
  IMAGE_MODEL,
  IMAGE_GENERATION_TIMEOUT_MS,
} from "./constants";
import type {
  Account,
  TokenResponse,
  LoadCodeAssistResponse,
  CloudCodeQuotaResponse,
  GenerateContentResponse,
  ImageGenerationResult,
  ImageGenerationOptions,
  QuotaInfo,
} from "./types";

/**
 * Refresh an access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: ANTIGRAVITY_CLIENT_ID,
    client_secret: ANTIGRAVITY_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed (${response.status})`);
  }

  const data = (await response.json()) as TokenResponse;
  return data.access_token;
}

/**
 * Load code assist info to get project ID
 */
export async function loadCodeAssist(accessToken: string): Promise<LoadCodeAssistResponse> {
  const response = await fetch(`${CLOUDCODE_BASE_URL}/v1internal:loadCodeAssist`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "antigravity",
    },
    body: JSON.stringify({ metadata: CLOUDCODE_METADATA }),
  });

  if (!response.ok) {
    throw new Error(`loadCodeAssist failed (${response.status})`);
  }

  return (await response.json()) as LoadCodeAssistResponse;
}

/**
 * Extract project ID from cloudaicompanionProject field
 */
export function extractProjectId(project: string | { id?: string } | undefined): string | undefined {
  if (!project) return undefined;
  if (typeof project === "string") return project;
  return project.id;
}

/**
 * Fetch available models with quota info
 */
export async function fetchAvailableModels(
  accessToken: string,
  projectId?: string
): Promise<CloudCodeQuotaResponse> {
  const payload = projectId ? { project: projectId } : {};

  const response = await fetch(`${CLOUDCODE_BASE_URL}/v1internal:fetchAvailableModels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "antigravity",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`fetchAvailableModels failed (${response.status})`);
  }

  return (await response.json()) as CloudCodeQuotaResponse;
}

/**
 * Get quota info for the image model
 */
export async function getImageModelQuota(account: Account): Promise<QuotaInfo | null> {
  try {
    const accessToken = await refreshAccessToken(account.refreshToken);
    let projectId = account.projectId || account.managedProjectId;

    if (!projectId) {
      const codeAssist = await loadCodeAssist(accessToken);
      projectId = extractProjectId(codeAssist.cloudaicompanionProject);
    }

    const models = await fetchAvailableModels(accessToken, projectId);
    const imageModel = models.models?.[IMAGE_MODEL];

    if (!imageModel?.quotaInfo) {
      return null;
    }

    const quota = imageModel.quotaInfo;
    const remainingPercent = (quota.remainingFraction ?? 0) * 100;
    const resetTime = quota.resetTime || "";

    // Calculate reset in human readable
    let resetIn = "N/A";
    if (resetTime) {
      const resetDate = new Date(resetTime);
      const now = Date.now();
      const diffMs = resetDate.getTime() - now;
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        resetIn = `${hours}h ${mins}m`;
      } else {
        resetIn = "now";
      }
    }

    return {
      modelName: imageModel.displayName || IMAGE_MODEL,
      remainingPercent,
      resetTime,
      resetIn,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Build imageConfig from options
 */
function buildImageConfig(options?: ImageGenerationOptions): ImageGenerationOptions | undefined {
  if (!options) return undefined;

  const { aspectRatio, imageSize } = options;

  // Only include if at least one option is set
  if (!aspectRatio && !imageSize) {
    return undefined;
  }

  const imageConfig: ImageGenerationOptions = {};

  if (aspectRatio) imageConfig.aspectRatio = aspectRatio;
  if (imageSize) imageConfig.imageSize = imageSize;

  return imageConfig;
}

/**
 * Generate an image using the Gemini 3 Pro Image model
 */
export async function generateImage(
  account: Account,
  prompt: string,
  options?: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  try {
    // Get access token
    const accessToken = await refreshAccessToken(account.refreshToken);

    // Get project ID
    let projectId = account.projectId || account.managedProjectId;
    if (!projectId) {
      const codeAssist = await loadCodeAssist(accessToken);
      projectId = extractProjectId(codeAssist.cloudaicompanionProject);
    }

    if (!projectId) {
      return { success: false, error: "Could not determine project ID" };
    }

    // Build request
    const imageConfig = buildImageConfig(options);
    const requestBody = {
      project: projectId,
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      model: IMAGE_MODEL,
      userAgent: "antigravity",
      requestType: "agent",
      request: {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        session_id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          ...(imageConfig && { imageConfig }),
        },
      },
    };

    // Try each endpoint
    let allRateLimited = true;

    for (const baseUrl of CLOUDCODE_FALLBACK_URLS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), IMAGE_GENERATION_TIMEOUT_MS);

        const response = await fetch(
          `${baseUrl}/v1internal:streamGenerateContent?alt=sse`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "User-Agent": "antigravity",
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          }
        );

        clearTimeout(timeout);

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited, try next endpoint
            continue;
          }
          allRateLimited = false;
          const errorText = await response.text();
          return { success: false, error: `HTTP ${response.status}: ${errorText.slice(0, 200)}` };
        }

        allRateLimited = false;

        // Parse SSE response
        const text = await response.text();
        const result = parseSSEResponse(text);

        if (result.success && result.imageData) {
          // Get updated quota info
          const quota = await getImageModelQuota(account);

          return {
            ...result,
            quota: quota
              ? {
                  remainingPercent: quota.remainingPercent,
                  resetTime: quota.resetTime,
                }
              : undefined,
          };
        }

        return result;
      } catch (err) {
        allRateLimited = false;
        if (err instanceof Error && err.name === "AbortError") {
          continue; // Timeout, try next endpoint
        }
        // Network error, try next endpoint
        continue;
      }
    }

    return { success: false, error: "All endpoints failed", isRateLimited: allRateLimited };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Parse SSE response and extract image data
 */
function parseSSEResponse(text: string): ImageGenerationResult {
  const lines = text.split("\n");

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;

    const jsonStr = line.slice(6);
    if (jsonStr === "[DONE]") continue;

    try {
      const data = JSON.parse(jsonStr) as GenerateContentResponse;

      // Check for error
      if (data.error) {
        return {
          success: false,
          error: `${data.error.code}: ${data.error.message}`,
        };
      }

      // Look for image in response
      const candidates = data.response?.candidates || [];
      for (const candidate of candidates) {
        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("image/")) {
            return {
              success: true,
              imageData: part.inlineData.data,
              mimeType: part.inlineData.mimeType,
              sizeBytes: Math.round((part.inlineData.data.length * 3) / 4), // Approximate decoded size
            };
          }
        }
      }
    } catch {
      // Skip unparseable lines
    }
  }

  return { success: false, error: "No image in response" };
}
