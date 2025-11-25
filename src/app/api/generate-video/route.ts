import { NextRequest, NextResponse } from "next/server";
import { createVideoRender } from "@/lib/creatomate";
import { GenerateVideoRequest, GenerateVideoResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateVideoRequest = await request.json();

    const { scenes, backgrounds } = body;

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
