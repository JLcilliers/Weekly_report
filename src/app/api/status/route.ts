import { NextRequest, NextResponse } from "next/server";
import { getRenderStatus } from "@/lib/creatomate";
import { StatusResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const renderId = searchParams.get("renderId");

    if (!renderId) {
      return NextResponse.json(
        { error: "renderId query parameter is required" },
        { status: 400 }
      );
    }

    const render = await getRenderStatus(renderId);

    const response: StatusResponse = {
      renderId: render.id,
      status: render.status,
      url: render.url,
      error: render.error_message,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to check render status",
      },
      { status: 500 }
    );
  }
}
