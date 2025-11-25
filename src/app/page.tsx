"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Scene,
  SummaryLength,
  ToneOption,
  SummariseResponse,
  GenerateVideoResponse,
  StatusResponse,
} from "@/types";

type ProcessingStep = "idle" | "summarising" | "generating" | "rendering" | "completed" | "error";

const SUMMARY_LENGTH_OPTIONS: { value: SummaryLength; label: string }[] = [
  { value: "short", label: "Short (3 scenes)" },
  { value: "medium", label: "Medium (4-5 scenes)" },
  { value: "long", label: "Long (5-6 scenes)" },
];

const TONE_OPTIONS: ToneOption[] = ["Professional", "Casual", "Friendly", "Energetic"];

export default function Home() {
  const [title, setTitle] = useState("");
  const [newsletterText, setNewsletterText] = useState("");
  const [summaryLength, setSummaryLength] = useState<SummaryLength>("medium");
  const [tone, setTone] = useState<ToneOption>("Professional");
  const [backgrounds, setBackgrounds] = useState<string[]>(["", "", "", "", "", ""]);

  const [step, setStep] = useState<ProcessingStep>("idle");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [renderId, setRenderId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/status?renderId=${id}`);
      const data: StatusResponse = await response.json();

      if (data.status === "succeeded" && data.url) {
        setVideoUrl(data.url);
        setStep("completed");
        stopPolling();
      } else if (data.status === "failed") {
        setError(data.error || "Video rendering failed");
        setStep("error");
        stopPolling();
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVideoUrl(null);
    setScenes([]);
    stopPolling();

    if (!newsletterText.trim()) {
      setError("Please enter newsletter content");
      return;
    }

    try {
      // Step 1: Summarise
      setStep("summarising");
      const summariseResponse = await fetch("/api/summarise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newsletterText,
          summaryLength,
          tone,
        }),
      });

      if (!summariseResponse.ok) {
        const errorData = await summariseResponse.json();
        throw new Error(errorData.error || "Failed to summarise newsletter");
      }

      const summariseData: SummariseResponse = await summariseResponse.json();
      setScenes(summariseData.scenes);

      // Step 2: Generate video
      setStep("generating");
      const filteredBackgrounds = backgrounds.filter((bg) => bg.trim() !== "");
      const generateResponse = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: summariseData.scenes,
          backgrounds: filteredBackgrounds.length > 0 ? filteredBackgrounds : undefined,
          title,
        }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(errorData.error || "Failed to generate video");
      }

      const generateData: GenerateVideoResponse = await generateResponse.json();
      setRenderId(generateData.renderId);

      if (generateData.status === "succeeded" && generateData.url) {
        setVideoUrl(generateData.url);
        setStep("completed");
      } else {
        // Step 3: Poll for status
        setStep("rendering");
        pollingRef.current = setInterval(() => {
          pollStatus(generateData.renderId);
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStep("error");
    }
  };

  const handleReset = () => {
    setStep("idle");
    setScenes([]);
    setRenderId(null);
    setVideoUrl(null);
    setError(null);
    stopPolling();
  };

  const handleBackgroundChange = (index: number, value: string) => {
    const newBackgrounds = [...backgrounds];
    newBackgrounds[index] = value;
    setBackgrounds(newBackgrounds);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            Newsletter Video Reels
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Transform your weekly newsletters into engaging vertical video reels with AI-powered
            summaries and professional voiceovers.
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Left Column - Form */}
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-6">
              Newsletter Input
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Newsletter Title (optional)
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Weekly Update #42"
                  className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {/* Newsletter Content */}
              <div>
                <label
                  htmlFor="content"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Newsletter Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="content"
                  value={newsletterText}
                  onChange={(e) => setNewsletterText(e.target.value)}
                  placeholder="Paste your newsletter content here..."
                  rows={8}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                />
              </div>

              {/* Summary Length */}
              <div>
                <label
                  htmlFor="length"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Summary Length
                </label>
                <select
                  id="length"
                  value={summaryLength}
                  onChange={(e) => setSummaryLength(e.target.value as SummaryLength)}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  {SUMMARY_LENGTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tone */}
              <div>
                <label
                  htmlFor="tone"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  Voice Tone
                </label>
                <select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as ToneOption)}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  {TONE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Background Images (collapsible) */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition">
                  Background Images (optional)
                  <span className="ml-2 text-zinc-500">+</span>
                </summary>
                <div className="mt-4 space-y-3">
                  {backgrounds.slice(0, summaryLength === "short" ? 3 : summaryLength === "medium" ? 5 : 6).map((bg, index) => (
                    <div key={index}>
                      <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                        Scene {index + 1} Background URL
                      </label>
                      <input
                        type="url"
                        value={bg}
                        onChange={(e) => handleBackgroundChange(index, e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                  ))}
                </div>
              </details>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={step !== "idle" && step !== "error" && step !== "completed"}
                className="w-full py-4 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-semibold text-lg transition transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {step === "idle" || step === "error" || step === "completed"
                  ? "Generate Video Reel"
                  : "Processing..."}
              </button>
            </form>
          </div>

          {/* Right Column - Preview & Status */}
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-6">
              Preview
            </h2>

            {/* Phone-like preview frame */}
            <div className="mx-auto w-full max-w-[280px] aspect-[9/16] bg-zinc-900 rounded-[2rem] p-2 shadow-2xl">
              <div className="w-full h-full bg-zinc-800 rounded-[1.5rem] overflow-hidden flex items-center justify-center">
                {step === "idle" && (
                  <div className="text-center p-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-700 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-zinc-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-zinc-400 text-sm">
                      Your video preview will appear here
                    </p>
                  </div>
                )}

                {(step === "summarising" || step === "generating" || step === "rendering") && (
                  <div className="text-center p-4">
                    <div className="w-16 h-16 mx-auto mb-4">
                      <svg
                        className="animate-spin w-full h-full text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    </div>
                    <p className="text-white font-medium mb-2">
                      {step === "summarising" && "Summarising newsletter..."}
                      {step === "generating" && "Generating video..."}
                      {step === "rendering" && "Rendering video..."}
                    </p>
                    <p className="text-zinc-400 text-sm">
                      {step === "summarising" && "Creating scene summaries with AI"}
                      {step === "generating" && "Preparing video template"}
                      {step === "rendering" && "This may take a minute"}
                    </p>
                  </div>
                )}

                {step === "completed" && videoUrl && (
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-cover"
                  />
                )}

                {step === "error" && (
                  <div className="text-center p-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/50 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status & Actions */}
            <div className="mt-8 space-y-4">
              {step === "completed" && videoUrl && (
                <>
                  <a
                    href={videoUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-center transition"
                  >
                    Download Video
                  </a>
                  <button
                    onClick={handleReset}
                    className="block w-full py-3 px-4 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-medium text-center transition"
                  >
                    Create Another
                  </button>
                </>
              )}

              {step === "error" && (
                <button
                  onClick={handleReset}
                  className="block w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-center transition"
                >
                  Try Again
                </button>
              )}

              {renderId && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                  Render ID: {renderId}
                </p>
              )}
            </div>

            {/* Scene Preview */}
            {scenes.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                  Generated Scenes
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {scenes.map((scene) => (
                    <div
                      key={scene.id}
                      className="p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg"
                    >
                      <p className="font-medium text-zinc-900 dark:text-white text-sm">
                        {scene.id}. {scene.heading}
                      </p>
                      <ul className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                        {scene.bulletPoints.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
