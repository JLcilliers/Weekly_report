import { Scene, BackgroundMedia, BackgroundMusicConfig } from "@/types";

const CREATOMATE_API_URL = "https://api.creatomate.com/v1";

interface CreatomateRenderResponse {
  id: string;
  status: "planned" | "rendering" | "succeeded" | "failed";
  url?: string;
  error_message?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RenderScriptElement = any;

// Default voice ID (Rachel)
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

function buildSceneComposition(
  scene: Scene,
  sceneIndex: number,
  background?: BackgroundMedia,
  voiceId?: string
): RenderScriptElement {
  const elements: RenderScriptElement[] = [];

  // Background video, image, or solid color
  if (background) {
    if (background.type === "video") {
      elements.push({
        type: "video",
        source: background.url,
        fit: "cover",
        volume: "0%", // Mute background video
      });
    } else {
      elements.push({
        type: "image",
        source: background.url,
        fit: "cover",
      });
    }
  } else {
    elements.push({
      type: "shape",
      path: "M 0 0 L 100 0 L 100 100 L 0 100 Z",
      fill_color: ["#1a1a2e", "#16213e", "#0f3460", "#1a1a2e"][sceneIndex % 4],
    });
  }

  // Heading text at top - HD quality with larger fonts
  elements.push({
    type: "text",
    text: scene.heading,
    font_family: "Inter",
    font_weight: "700",
    font_size: "10 vmin", // Increased from 8 vmin for better readability
    fill_color: "#ffffff",
    x: "50%",
    y: "12%",
    width: "90%",
    x_alignment: "50%",
    y_alignment: "50%",
    text_alignment: "center",
    shadow_color: "rgba(0,0,0,0.7)",
    shadow_blur: "3 vmin",
    shadow_x: "0.5 vmin",
    shadow_y: "0.5 vmin",
    enter: { type: "text-slide", direction: "up", duration: 0.5 },
  });

  // Bullet points in the middle - HD quality with larger fonts
  elements.push({
    type: "text",
    text: scene.bulletPoints.map((bp) => `• ${bp}`).join("\n"),
    font_family: "Inter",
    font_weight: "500", // Slightly bolder for better readability
    font_size: "5.5 vmin", // Increased from 4.5 vmin for HD readability
    line_height: "185%",
    fill_color: "#ffffff",
    x: "50%",
    y: "50%",
    width: "85%",
    x_alignment: "50%",
    y_alignment: "50%",
    text_alignment: "left",
    shadow_color: "rgba(0,0,0,0.7)",
    shadow_blur: "2 vmin",
    shadow_x: "0.3 vmin",
    shadow_y: "0.3 vmin",
    enter: { type: "text-appear", duration: 0.8 },
  });

  // AI Voiceover using ElevenLabs TTS with selectable voice
  const selectedVoiceId = voiceId || DEFAULT_VOICE_ID;
  elements.push({
    type: "audio",
    provider: `elevenlabs model_id=eleven_multilingual_v2 voice_id=${selectedVoiceId}`,
    dynamic: true,
    source: scene.voiceoverText,
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
  background?: BackgroundMedia,
  backgroundMusic?: BackgroundMusicConfig,
  voiceId?: string
): Promise<CreatomateRenderResponse> {
  const apiKey = process.env.CREATOMATE_API_KEY;

  if (!apiKey) {
    throw new Error("CREATOMATE_API_KEY environment variable is not set");
  }

  // Build RenderScript with compositions for each scene (same background for all)
  const compositions = scenes.map((scene, index) =>
    buildSceneComposition(scene, index, background, voiceId)
  );

  // Build elements array - compositions plus optional background music
  const elements: RenderScriptElement[] = [...compositions];

  // Add background music on a separate track if provided
  if (backgroundMusic) {
    // Scale down volume for background music - should be very subtle behind voiceover
    // UI shows 5-50%, we scale to 1-10% actual volume
    // This keeps music as faint background, not competing with voiceover
    const actualVolume = (backgroundMusic.volume / 5).toFixed(1);
    console.log(`Music volume: UI=${backgroundMusic.volume}% -> actual=${actualVolume}%`);
    elements.push({
      type: "audio",
      track: 2, // Separate track from scene compositions
      source: backgroundMusic.url,
      volume: `${actualVolume}%`,
      // Loop the music to fill the entire video duration
      loop: true,
    });
  }

  const renderScript = {
    output_format: "mp4",
    width: 1080,
    height: 1920,
    frame_rate: 30,
    // HD quality settings
    render_scale: 1,
    // High quality H.264 encoding
    h264_profile: "high",
    h264_level: "4.2",
    // Higher bitrate for crisp video (8 Mbps)
    video_bitrate: "8000 kbps",
    // Quality pixel format
    pixel_format: "yuv420p",
    elements,
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
