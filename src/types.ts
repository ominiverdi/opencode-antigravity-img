// Account configuration (from antigravity-accounts.json)
export interface Account {
  email: string;
  refreshToken: string;
  accessToken?: string;
  projectId?: string;
  managedProjectId?: string;
}

export interface AccountsConfig {
  accounts: Account[];
}

// API responses
export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface LoadCodeAssistResponse {
  cloudaicompanionProject?: string | { id?: string };
  currentTier?: { id?: string; name?: string };
  paidTier?: { id?: string; name?: string };
}

export interface CloudCodeQuotaResponse {
  models?: Record<string, ModelInfo>;
}

export interface ModelInfo {
  displayName?: string;
  model?: string;
  quotaInfo?: {
    remainingFraction?: number;
    resetTime?: string;
  };
}

// Image generation options
export type AspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9";
export type ImageSize = "1K" | "2K" | "4K";

export interface ImageConfig {
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
}

export interface ImageGenerationOptions {
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
}

export interface GenerateContentRequest {
  project: string;
  requestId: string;
  model: string;
  userAgent: string;
  requestType: string;
  request: {
    contents: Array<{
      role: string;
      parts: Array<{ text: string }>;
    }>;
    session_id: string;
    generationConfig: {
      responseModalities: string[];
      imageConfig?: ImageConfig;
    };
  };
}

export interface GenerateContentResponse {
  response?: {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          thought?: boolean;
          inlineData?: {
            mimeType: string;
            data: string;
          };
        }>;
      };
      finishReason?: string;
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export interface ImageGenerationResult {
  success: boolean;
  imagePath?: string;
  imageData?: string;  // base64
  mimeType?: string;
  sizeBytes?: number;
  error?: string;
  quota?: {
    remainingPercent: number;
    resetTime: string;
  };
}

export interface QuotaInfo {
  modelName: string;
  remainingPercent: number;
  resetTime: string;
  resetIn: string;
}
