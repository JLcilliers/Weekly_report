import Anthropic from "@anthropic-ai/sdk";
import { Scene, SummaryLength } from "@/types";

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

function getSceneCount(length: SummaryLength): { min: number; max: number } {
  switch (length) {
    case "short":
      return { min: 3, max: 3 };
    case "medium":
      return { min: 4, max: 5 };
    case "long":
      return { min: 5, max: 6 };
  }
}

function getToneInstructions(tone: string): string {
  if (tone === "Savage") {
    return `SAVAGE MODE ACTIVATED! You are a brutally honest, hilariously cheeky content creator who doesn't give a damn about being polite. Your job is to roast the newsletter content while still delivering the key info.

RULES FOR SAVAGE MODE:
- Use swear words naturally (damn, hell, shit, bloody hell, for fuck's sake, etc.) - don't overdo it, but sprinkle them in
- Be sarcastic and witty - mock corporate speak and buzzwords
- Call out bullshit when you see it
- Make fun of the obvious while still informing
- Use phrases like "holy shit", "no fucking way", "are you kidding me", "what the actual hell"
- Be the friend who tells it like it is after a few drinks
- Make people laugh while they learn
- If something is boring, SAY it's boring then make it interesting
- Channel your inner Gordon Ramsay meets drunk best friend

The goal: People should be snorting with laughter while actually learning something. Make it MEMORABLE.`;
  }

  return `The tone should be: ${tone}`;
}

export async function summariseNewsletter(
  newsletterText: string,
  summaryLength: SummaryLength,
  tone: string
): Promise<Scene[]> {
  const { min, max } = getSceneCount(summaryLength);
  const toneInstructions = getToneInstructions(tone);

  const systemPrompt = `You are an expert content summarizer specializing in creating engaging video scripts for social media reels. Your task is to transform newsletter content into a series of scenes for a vertical video reel.

Each scene should:
- Have a clear, catchy heading (max 6 words)
- Include 2-3 brief bullet points summarizing key information
- Have voiceover text that sounds natural when spoken (1-2 sentences, max 250 characters)

${toneInstructions}

Output ONLY valid JSON in this exact format, with no additional text:
{
  "scenes": [
    {
      "id": 1,
      "heading": "Scene heading here",
      "bulletPoints": ["First point", "Second point"],
      "voiceoverText": "The voiceover script for this scene."
    }
  ]
}`;

  const userPrompt = `Create ${min} to ${max} scenes from this newsletter content. Remember to output ONLY the JSON, nothing else:

${newsletterText}`;

  const anthropic = getAnthropicClient();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  try {
    const parsed = JSON.parse(content.text);
    return parsed.scenes as Scene[];
  } catch {
    // Try to extract JSON from the response if it contains extra text
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.scenes as Scene[];
    }
    throw new Error("Failed to parse Claude response as JSON");
  }
}
