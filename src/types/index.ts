export interface Scene {
  id: number;
  heading: string;
  bulletPoints: string[];
  voiceoverText: string;
}

export interface SummariseRequest {
  newsletterText: string;
  summaryLength: "short" | "medium" | "long";
  tone: string;
}

export interface SummariseResponse {
  scenes: Scene[];
}

export interface BackgroundMusicConfig {
  url: string;
  volume: number; // 0-100
}

export interface GenerateVideoRequest {
  scenes: Scene[];
  backgrounds?: (BackgroundMedia | string)[];
  title?: string;
  backgroundMusic?: BackgroundMusicConfig;
}

export interface GenerateVideoResponse {
  renderId: string;
  status: "planned" | "rendering" | "succeeded" | "failed";
  url?: string;
}

export interface StatusResponse {
  renderId: string;
  status: "planned" | "rendering" | "succeeded" | "failed";
  url?: string;
  error?: string;
}

export type SummaryLength = "short" | "medium" | "long";

export type ToneOption = "Professional" | "Casual" | "Friendly" | "Energetic" | "Savage";

export interface BackgroundMedia {
  url: string;
  type: "image" | "video";
  fileName?: string;
}

export interface FormState {
  title: string;
  newsletterText: string;
  summaryLength: SummaryLength;
  tone: ToneOption;
  backgrounds: string[];
}
