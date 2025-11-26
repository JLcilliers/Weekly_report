import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// Force Node.js runtime (required for cloudinary)
export const runtime = "nodejs";

// Increase body size limit for large file uploads (50MB)
export const maxDuration = 60;

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed file types (including common variations)
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/mpeg"];
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/aac",
  "audio/mp4", "audio/ogg", "audio/x-m4a", "audio/m4a", "audio/webm",
  "application/octet-stream" // Fallback for when browser doesn't detect type correctly
];

// Allowed file extensions (as fallback for MIME type detection)
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v"];
const ALLOWED_AUDIO_EXTENSIONS = [".mp3", ".wav", ".aac", ".m4a", ".ogg"];

export async function POST(request: NextRequest) {
  try {
    // Check for Cloudinary configuration
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    console.log("Cloudinary config check:", {
      hasCloudName: !!cloudName,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
    });

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Missing Cloudinary environment variables");
      return NextResponse.json(
        { error: "Server misconfiguration: missing Cloudinary credentials" },
        { status: 500 }
      );
    }

    // Configure Cloudinary (do this on each request to ensure env vars are loaded)
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log(`Received file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB" },
        { status: 400 }
      );
    }

    // Determine file type by MIME type or extension fallback
    const fileExt = "." + (file.name.split(".").pop()?.toLowerCase() || "");

    const isImageByType = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isImageByExt = ALLOWED_IMAGE_EXTENSIONS.includes(fileExt);
    const isImage = isImageByType || isImageByExt;

    const isVideoByType = ALLOWED_VIDEO_TYPES.includes(file.type);
    const isVideoByExt = ALLOWED_VIDEO_EXTENSIONS.includes(fileExt);
    const isVideo = isVideoByType || isVideoByExt;

    const isAudioByType = ALLOWED_AUDIO_TYPES.includes(file.type);
    const isAudioByExt = ALLOWED_AUDIO_EXTENSIONS.includes(fileExt);
    const isAudio = isAudioByType || isAudioByExt;

    if (!isImage && !isVideo && !isAudio) {
      console.log(`Rejected file: ${file.name}, type: ${file.type}, ext: ${fileExt}`);
      return NextResponse.json(
        {
          error: "Invalid file type. Allowed: JPG, PNG, GIF, WebP, MP4, WebM, MOV, MP3, WAV, AAC",
        },
        { status: 400 }
      );
    }

    // Convert file to base64 data URL for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    // Determine MIME type for data URL
    let mimeType = file.type;
    if (!mimeType || mimeType === "application/octet-stream") {
      // Fallback based on extension
      if (isImage) mimeType = "image/jpeg";
      else if (isVideo) mimeType = "video/mp4";
      else if (isAudio) mimeType = "audio/mpeg";
    }

    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Determine resource type for Cloudinary
    let resourceType: "image" | "video" | "auto" = "auto";
    if (isImage) {
      resourceType = "image";
    } else if (isVideo || isAudio) {
      // Cloudinary treats audio as video resource type
      resourceType = "video";
    }

    // Upload to Cloudinary using base64 data URL
    console.log(`Uploading ${file.name} (${resourceType}) to Cloudinary...`);

    let uploadResult: UploadApiResponse;
    try {
      uploadResult = await cloudinary.uploader.upload(dataUrl, {
        resource_type: resourceType,
        folder: "newsletter-video-reels",
        type: "upload",
      });
    } catch (uploadError) {
      console.error("Cloudinary upload error:", JSON.stringify(uploadError, null, 2));
      throw uploadError;
    }

    console.log("Cloudinary upload successful:", uploadResult.secure_url);

    // Return the cloud URL (publicly accessible)
    return NextResponse.json({
      url: uploadResult.secure_url,
      type: isImage ? "image" : isVideo ? "video" : "audio",
      fileName: file.name,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message :
                        typeof error === 'object' ? JSON.stringify(error) :
                        "Failed to upload file";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
