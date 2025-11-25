import { NextRequest, NextResponse } from "next/server";
import { createVideoRender } from "@/lib/creatomate";
import { GenerateVideoRequest, GenerateVideoResponse, BackgroundMedia } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Defensive check for Creatomate API key
    if (!process.env.CREATOMATE_API_KEY) {
      console.error("Missing CREATOMATE_API_KEY environment variable");
      return NextResponse.json(
        { error: "Server misconfiguration: missing Creatomate API key" },
        { status: 500 }
      );
    }

    // Log that we have the key (masked for security)
    console.log(
      "Creatomate API key prefix:",
      process.env.CREATOMATE_API_KEY.slice(0, 8) + "..."
    );

    const body: GenerateVideoRequest = await request.json();

    // Get the origin from the request for converting relative URLs
    const origin = request.headers.get("origin") || request.headers.get("host") || "";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = origin.startsWith("http") ? origin : `${protocol}://${origin}`;

    // Convert relative URLs to absolute URLs for Creatomate
    let { scenes, backgrounds } = body;

    if (backgrounds) {
      backgrounds = backgrounds.map((bg) => {
        if (typeof bg === "string") {
          // String URL
          if (bg.startsWith("/")) {
            return { url: `${baseUrl}${bg}`, type: "image" as const };
          }
          return { url: bg, type: "image" as const };
        } else {
          // BackgroundMedia object
          const bgMedia = bg as BackgroundMedia;
          if (bgMedia.url.startsWith("/")) {
            return { ...bgMedia, url: `${baseUrl}${bgMedia.url}` };
          }
          return bgMedia;
        }
      });
    }

    if (!scenes || scenes.length === 0) {
      return NextResponse.json(
        { error: "Scenes are required" },
        { status: 400 }
      );
    }

    if (scenes.length < 3 || scenes.length > 6) {
      return NextResponse.json(
        { error: "Must have between 3 and 6 scenes" },
        { status: 400 }
      );
    }

    console.log("Creating video render with", scenes.length, "scenes");
    const render = await createVideoRender(scenes, backgrounds);

    const response: GenerateVideoResponse = {
      renderId: render.id,
      status: render.status,
      url: render.url,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate video",
      },
      { status: 500 }
    );
  }
}
