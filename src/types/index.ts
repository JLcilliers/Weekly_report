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
  background?: BackgroundMedia;
  title?: string;
  backgroundMusic?: BackgroundMusicConfig;
  voiceId?: string; // Eleven Labs voice ID
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

// Eleven Labs voice configuration
export interface ElevenLabsVoice {
  id: string;
  name: string;
  description: string;
  gender: "male" | "female";
  accent: string;
}

export const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Warm & natural", gender: "female", accent: "American" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", description: "Deep & authoritative", gender: "male", accent: "American" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", description: "Well-rounded & expressive", gender: "male", accent: "American" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", description: "Soft & gentle", gender: "female", accent: "American" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", description: "Young & bright", gender: "female", accent: "American" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", description: "Young & energetic", gender: "male", accent: "American" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", description: "Confident & bold", gender: "male", accent: "American" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", description: "Raspy & dynamic", gender: "male", accent: "American" },
  { id: "ThT5KcBeYPX3keUQqHPh", name: "Dorothy", description: "Pleasant & friendly", gender: "female", accent: "British" },
  { id: "oWAxZDx7w5VEj9dCyTzz", name: "Grace", description: "Southern & soothing", gender: "female", accent: "American Southern" },
];

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
