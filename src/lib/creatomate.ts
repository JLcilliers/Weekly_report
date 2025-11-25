import { Scene } from "@/types";

const CREATOMATE_API_URL = "https://api.creatomate.com/v1";

interface CreatomateRenderResponse {
  id: string;
  status: "planned" | "rendering" | "succeeded" | "failed";
  url?: string;
  error_message?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RenderScriptElement = any;

function buildSceneComposition(
  scene: Scene,
  sceneIndex: number,
  backgroundUrl?: string
): RenderScriptElement {
  const elements: RenderScriptElement[] = [];

  // Background image or solid color
  if (backgroundUrl) {
    elements.push({
      type: "image",
      source: backgroundUrl,
      fit: "cover",
    });
  } else {
    elements.push({
      type: "shape",
      path: "M 0 0 L 100 0 L 100 100 L 0 100 Z",
      fill_color: ["#1a1a2e", "#16213e", "#0f3460", "#1a1a2e"][sceneIndex % 4],
    });
  }

  // Heading text at top
  elements.push({
    type: "text",
    text: scene.heading,
    font_family: "Inter",
    font_weight: "700",
    font_size: "8 vmin",
    fill_color: "#ffffff",
    x: "50%",
    y: "15%",
    width: "90%",
    x_alignment: "50%",
    y_alignment: "50%",
    text_alignment: "center",
    shadow_color: "rgba(0,0,0,0.5)",
    shadow_blur: "2 vmin",
    enter: { type: "text-slide", direction: "up", duration: 0.5 },
  });

  // Bullet points in the middle
  elements.push({
    type: "text",
    text: scene.bulletPoints.map((bp) => `• ${bp}`).join("\n"),
    font_family: "Inter",
    font_weight: "400",
    font_size: "4.5 vmin",
    line_height: "180%",
    fill_color: "#ffffff",
    x: "50%",
    y: "50%",
    width: "85%",
    x_alignment: "50%",
    y_alignment: "50%",
    text_alignment: "left",
    shadow_color: "rgba(0,0,0,0.5)",
    shadow_blur: "1 vmin",
    enter: { type: "text-appear", duration: 0.8 },
  });

  // AI Voiceover using ElevenLabs TTS
  elements.push({
    type: "audio",
    source: {
      provider: "elevenlabs",
      voice_id: "21m00Tcm4TlvDq8ikWAM", // Rachel voice - natural sounding
      text: scene.voiceoverText,
    },
  });

  return {
    type: "composition",
    track: 1,
    duration: null, // Auto-duration based on voiceover
    elements,
  };
}

export async function createVideoRender(
  scenes: Scene[],
  backgrounds?: string[]
): Promise<CreatomateRenderResponse> {
  const apiKey = process.env.CREATOMATE_API_KEY;

  if (!apiKey) {
    throw new Error("CREATOMATE_API_KEY environment variable is not set");
  }

  // Build RenderScript with compositions for each scene
  const compositions = scenes.map((scene, index) =>
    buildSceneComposition(scene, index, backgrounds?.[index])
  );

  const renderScript = {
    output_format: "mp4",
    width: 1080,
    height: 1920,
    frame_rate: 30,
    elements: compositions,
  };

  const response = await fetch(`${CREATOMATE_API_URL}/renders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source: renderScript }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Creatomate API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Creatomate returns an array for batch renders, but we're doing single renders
  const render = Array.isArray(data) ? data[0] : data;

  return {
    id: render.id,
    status: render.status,
    url: render.url,
    error_message: render.error_message,
  };
}

export async function getRenderStatus(
  renderId: string
): Promise<CreatomateRenderResponse> {
  const apiKey = process.env.CREATOMATE_API_KEY;

  if (!apiKey) {
    throw new Error("CREATOMATE_API_KEY environment variable is not set");
  }

  const response = await fetch(`${CREATOMATE_API_URL}/renders/${renderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Creatomate API error: ${response.status} - ${errorText}`);
  }

  const render = await response.json();

  return {
    id: render.id,
    status: render.status,
    url: render.url,
    error_message: render.error_message,
  };
}
