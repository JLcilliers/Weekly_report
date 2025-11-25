import { NextRequest, NextResponse } from "next/server";
import { summariseNewsletter } from "@/lib/summarise";
import { SummariseRequest, SummariseResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: SummariseRequest = await request.json();

    const { newsletterText, summaryLength, tone } = body;

    if (!newsletterText || newsletterText.trim().length === 0) {
      return NextResponse.json(
        { error: "Newsletter text is required" },
        { status: 400 }
      );
    }

    if (!["short", "medium", "long"].includes(summaryLength)) {
      return NextResponse.json(
        { error: "Invalid summary length. Must be short, medium, or long" },
        { status: 400 }
      );
    }

    const scenes = await summariseNewsletter(
      newsletterText,
      summaryLength,
      tone || "Professional"
    );

    const response: SummariseResponse = { scenes };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Summarisation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to summarise newsletter",
      },
      { status: 500 }
    );
  }
}
