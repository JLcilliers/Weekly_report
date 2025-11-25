"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Scene,
  SummaryLength,
  ToneOption,
  SummariseResponse,
  GenerateVideoResponse,
  StatusResponse,
  BackgroundMedia,
} from "@/types";

interface MusicUpload {
  url: string;
  fileName: string;
}

type ProcessingStep = "idle" | "summarising" | "generating" | "rendering" | "completed" | "error";

const SUMMARY_LENGTH_OPTIONS: { value: SummaryLength; label: string }[] = [
  { value: "short", label: "Short (3 scenes)" },
  { value: "medium", label: "Medium (4-5 scenes)" },
  { value: "long", label: "Long (5-6 scenes)" },
];

const TONE_OPTIONS: { value: ToneOption; label: string; description: string }[] = [
  { value: "Professional", label: "Professional", description: "Clean and corporate" },
  { value: "Casual", label: "Casual", description: "Relaxed and approachable" },
  { value: "Friendly", label: "Friendly", description: "Warm and welcoming" },
  { value: "Energetic", label: "Energetic", description: "Upbeat and exciting" },
  { value: "Savage", label: "Savage", description: "Cheeky with swear words" },
];

export default function Home() {
  const [title, setTitle] = useState("");
  const [newsletterText, setNewsletterText] = useState("");
  const [summaryLength, setSummaryLength] = useState<SummaryLength>("medium");
  const [tone, setTone] = useState<ToneOption>("Professional");
  const [background, setBackground] = useState<BackgroundMedia | null>(null);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [backgroundMusic, setBackgroundMusic] = useState<MusicUpload | null>(null);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [musicVolume, setMusicVolume] = useState(15); // Default 15% volume

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
      const generateResponse = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: summariseData.scenes,
          background: background || undefined,
          title,
          backgroundMusic: backgroundMusic ? {
            url: backgroundMusic.url,
            volume: musicVolume,
          } : undefined,
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

  const handleBackgroundUpload = async (file: File) => {
    setUploadingBackground(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data: BackgroundMedia = await response.json();
      setBackground(data);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleBackgroundDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleBackgroundUpload(file);
    }
  };

  const handleBackgroundInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleBackgroundUpload(file);
    }
  };

  const handleMusicUpload = async (file: File) => {
    setUploadingMusic(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      setBackgroundMusic({
        url: data.url,
        fileName: file.name,
      });
    } catch (err) {
      console.error("Music upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload music");
    } finally {
      setUploadingMusic(false);
    }
  };

  const handleMusicInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleMusicUpload(file);
    }
  };

  const handleMusicDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleMusicUpload(file);
    }
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
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Voice Tone
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TONE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTone(option.value)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
                        tone === option.value
                          ? option.value === "Savage"
                            ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                            : "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                      }`}
                    >
                      <span className="block">{option.label}</span>
                      <span className="block text-xs opacity-70">{option.description}</span>
                    </button>
                  ))}
                </div>
                {tone === "Savage" && (
                  <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                    Warning: This mode includes swear words and cheeky commentary!
                  </p>
                )}
              </div>

              {/* Video Background (collapsible) */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition">
                  Video Background (optional)
                  <span className="ml-2 text-zinc-500">+</span>
                </summary>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Upload an image or video to use as background for the entire video
                </p>
                <div className="mt-4">
                  {background ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-green-500 bg-zinc-900 max-w-sm">
                      {background.type === "video" ? (
                        <video
                          src={background.url}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          autoPlay
                          playsInline
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={background.url}
                          alt="Video background"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-xs text-white truncate">{background.fileName || "Uploaded"}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${background.type === "video" ? "bg-purple-500" : "bg-blue-500"} text-white`}>
                          {background.type}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBackground(null)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="background-upload"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleBackgroundDrop}
                      className={`flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed cursor-pointer transition ${
                        uploadingBackground
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500"
                      }`}
                    >
                      <input
                        id="background-upload"
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleBackgroundInputChange}
                        className="sr-only"
                      />
                      {uploadingBackground ? (
                        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <svg className="w-10 h-10 text-zinc-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">Drop image or video here</span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">or click to browse</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </details>

              {/* Background Music (collapsible) */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition">
                  Background Music (optional)
                  <span className="ml-2 text-zinc-500">+</span>
                </summary>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Add music that plays softly under the voiceover
                </p>
                <div className="mt-4 space-y-4">
                  {backgroundMusic ? (
                    <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500 rounded-lg">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{backgroundMusic.fileName}</p>
                        <p className="text-xs text-zinc-500">Uploaded</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBackgroundMusic(null)}
                        className="p-1 rounded-full bg-red-500 hover:bg-red-600 text-white"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="music-upload"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleMusicDrop}
                      className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed cursor-pointer transition ${
                        uploadingMusic
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500"
                      }`}
                    >
                      <input
                        id="music-upload"
                        type="file"
                        accept="audio/*"
                        onChange={handleMusicInputChange}
                        className="sr-only"
                      />
                      {uploadingMusic ? (
                        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <svg className="w-8 h-8 text-zinc-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">Drop music file or click to browse</span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">MP3, WAV, AAC supported</span>
                        </>
                      )}
                    </label>
                  )}

                  {/* Volume Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="music-volume" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Music Volume
                      </label>
                      <span className="text-xs text-zinc-500">{musicVolume}%</span>
                    </div>
                    <input
                      id="music-volume"
                      type="range"
                      min="5"
                      max="50"
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(Number(e.target.value))}
                      className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      Lower = voice clearer, Higher = music more prominent
                    </p>
                  </div>
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
                    href={`/api/download?url=${encodeURIComponent(videoUrl)}`}
                    download
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
