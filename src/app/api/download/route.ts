import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get("url");

    if (!videoUrl) {
      return NextResponse.json(
        { error: "Video URL is required" },
        { status: 400 }
      );
    }

    // Validate URL is from Creatomate's storage
    const url = new URL(videoUrl);
    const allowedHosts = [
      "cdn.creatomate.com",
      "f002.backblazeb2.com",
      "creatomate-c8xg3hsxdu.s3.amazonaws.com",
    ];

    if (!allowedHosts.some((host) => url.hostname.includes(host))) {
      return NextResponse.json(
        { error: "Invalid video URL" },
        { status: 400 }
      );
    }

    // Fetch the video from Creatomate's storage
    const response = await fetch(videoUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`);
    }

    const videoBuffer = await response.arrayBuffer();

    // Generate filename with timestamp
    const filename = `newsletter-reel-${Date.now()}.mp4`;

    // Return the video with download headers
    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": videoBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to download video",
      },
      { status: 500 }
    );
  }
}
