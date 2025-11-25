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

export interface GenerateVideoRequest {
  scenes: Scene[];
  backgrounds?: string[];
  title?: string;
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

export type ToneOption = "Professional" | "Casual" | "Friendly" | "Energetic";

export interface FormState {
  title: string;
  newsletterText: string;
  summaryLength: SummaryLength;
  tone: ToneOption;
  backgrounds: string[];
}
