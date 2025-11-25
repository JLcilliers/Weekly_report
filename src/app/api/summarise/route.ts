import { NextRequest, NextResponse } from "next/server";
import { summariseNewsletter } from "@/lib/summarise";
import { SummariseRequest, SummariseResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Defensive check for Anthropic API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("Missing ANTHROPIC_API_KEY environment variable");
      return NextResponse.json(
        { error: "Server misconfiguration: missing Anthropic API key" },
        { status: 500 }
      );
    }

    // Log that we have the key (masked for security)
    console.log(
      "Anthropic API key prefix:",
      process.env.ANTHROPIC_API_KEY.slice(0, 10) + "..."
    );

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

    console.log("Summarising newsletter with length:", summaryLength);
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
