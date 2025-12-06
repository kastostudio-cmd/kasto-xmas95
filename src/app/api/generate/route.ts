import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const maxDuration = 60;
export const runtime = "nodejs";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

type Vibe = "PARTY" | "HOME" | "COUPLE";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 5;
const RATE_LIMIT_WINDOW = 60000;
const MAX_IMAGE_SIZE = 10_000_000;
const TIMEOUT_BUFFER = 3000;
const MODEL_VERSION =
  "zsxkib/flux-pulid:46117eb1393661eb3d4899981881736b414e8608823293e6d8a2a537d7a82b3d";

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || realIp || "unknown_client";
}

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (userLimit.count >= MAX_REQUESTS_PER_MINUTE) return false;

  userLimit.count++;
  return true;
}

function validateBase64Image(dataUrl: string): boolean {
  if (!dataUrl || typeof dataUrl !== "string") return false;

  const isUrl = /^https?:\/\//.test(dataUrl);
  if (isUrl) return true;

  const match =
    /^data:image\/(png|jpeg|jpg|webp|heic);base64,(.+)$/.exec(dataUrl);
  if (!match) return false;

  const base64Data = match[2];
  const estimatedBytes = (base64Data.length * 3) / 4;

  return estimatedBytes <= MAX_IMAGE_SIZE;
}

function validateVibe(vibe: any): vibe is Vibe {
  return vibe === "PARTY" || vibe === "HOME" || vibe === "COUPLE";
}

function buildPrompt(vibe: Vibe): string {
  const identityLock =
    "keep the exact same person from the input photo, preserve their facial features, skin tone, hairline, hairstyle and hair color, same identity, no face warp, no face change";
  const baseStyle = [
    "authentic candid snapshot from Christmas 1995",
    "shot on a cheap disposable Kodak film camera with built-in flash",
    "slightly overexposed, harsh direct flash, red-eye effect",
    "visible film grain, slight motion blur, chromatic aberration on edges",
    "yellowish tungsten color cast with a slight green tint in the shadows",
    "vignette on the corners, low dynamic range, blown highlights",
    "scanned from an old glossy photo print, tiny dust and scratches",
    "faded colors, very subtle crease line, slight fingerprint smudges",
  ].join(", ");

  if (vibe === "PARTY") {
    return [
      identityLock,
      baseStyle,
      "a chaotic office Christmas party in the mid-90s",
      "exactly one clearly visible main person in the foreground, no other fully visible faces, all other faces cropped, turned away, or blurred",
      "not a formal group portrait, not a posed studio shot",
      "the subject is caught mid-laugh with mouth open in a slightly unflattering way",
      "holding a cheap plastic cup with some drink almost spilling",
      "wearing an ugly oversized knitted Christmas sweater with reindeer and snowflakes",
      "background: crowded smoky office, coworkers dancing badly, some people half-cut off by the frame",
      "cheap tinsel hanging from a drop ceiling, multicolored string lights, cigarette smoke haze",
      "flash reflection on slightly oily skin, a bit embarrassing but funny atmosphere",
    ].join(", ");
  }

  if (vibe === "HOME") {
    return [
      identityLock,
      baseStyle,
      "a cozy but slightly messy living room on Christmas morning 1995",
      "exactly one clearly visible main person sitting in the foreground, no other fully visible people, any other people only partially visible or out of focus",
      "not a group photo, not multiple main subjects",
      "subject sitting on an old floral patterned sofa, wrapped in a blanket, messy hair, sleepy but happy expression",
      "background: real pine tree with mismatched handmade ornaments and tinsel",
      "torn wrapping paper scattered all over the carpet",
      "an old CRT TV glowing in the corner with a Christmas movie paused",
      "warm tungsten lamp mixed with cold blue daylight coming from the window",
      "looks exactly like a photo from a 90s family album, nostalgic and imperfect in a charming way",
    ].join(", ");
  }

  if (vibe === "COUPLE") {
    return [
      identityLock,
      baseStyle,
      "an awkward romantic couple photo taken at a cheap mall photo booth in the 90s",
      "exactly two people clearly visible in the frame, no extra people",
      "the main subject from the input photo is hugging their partner in a slightly stiff, uncomfortable pose",
      "both wearing tacky matching Christmas sweaters that look a bit too big",
      "background: cheesy airbrushed snowy landscape backdrop, fake snow, plastic mistletoe hanging overhead",
      "overly bright flash creating hard shadows on the backdrop",
      "slightly crooked framing like a friend quickly snapped the picture",
    ].join(", ");
  }

  return [identityLock, baseStyle].join(", ");
}

function buildNegativePrompt(vibe: Vibe): string {
  const baseNegatives = [
    "digital painting",
    "illustration",
    "cartoon",
    "anime",
    "3d render",
    "plastic skin",
    "airbrushed skin",
    "beauty filter",
    "instagram filter",
    "face smoothing",
    "professional studio lighting",
    "softbox",
    "rim light",
    "modern smartphone camera",
    "hdr",
    "4k",
    "8k",
    "cinema lighting",
    "futuristic clothes",
    "modern interior",
    "neon lights",
    "cyberpunk",
  ];

  if (vibe === "PARTY" || vibe === "HOME") {
    baseNegatives.push(
      "group photo",
      "large group photo",
      "big family group",
      "many people",
      "multiple main subjects",
      "several clearly visible faces in the foreground"
    );
  }

  if (vibe === "COUPLE") {
    baseNegatives.push(
      "large group photo",
      "big crowd",
      "more than two people",
      "wedding group shot",
      "many people in the frame",
      "multiple couples"
    );
  }

  return baseNegatives.join(", ");
}

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientIdentifier(req);
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { userImage, vibe } = body as { userImage?: string; vibe?: Vibe };

    if (!userImage || !vibe) {
      return NextResponse.json(
        { error: "Missing image or vibe mode." },
        { status: 400 }
      );
    }

    if (!validateVibe(vibe)) {
      return NextResponse.json(
        {
          error: "Invalid vibe mode. Must be PARTY, HOME, or COUPLE.",
        },
        { status: 400 }
      );
    }

    if (!validateBase64Image(userImage)) {
      return NextResponse.json(
        {
          error: "Invalid image format or image too large (max 10MB).",
        },
        { status: 400 }
      );
    }

    const input = {
      main_face_image: userImage,
      prompt: buildPrompt(vibe),
      guidance_scale: 2.8,
      num_inference_steps: 28,
      identity_weight: 0.9,
      start_step: 4,
      true_guidance: 2.8,
      width: 896,
      height: 1152,
      negative_prompt: buildNegativePrompt(vibe),
    };

    const prediction = await replicate.predictions.create({
      version: MODEL_VERSION.split(":")[1],
      input,
    });

    let result = await replicate.predictions.get(prediction.id);
    const startedAt = Date.now();
    const timeoutMs = maxDuration * 1000 - TIMEOUT_BUFFER;

    while (["starting", "processing", "queued"].includes(result.status)) {
      if (Date.now() - startedAt > timeoutMs) {
        try {
          await replicate.predictions.cancel(prediction.id);
        } catch {
        }
        return NextResponse.json(
          { error: "Generation timed out. Please try again!" },
          { status: 504 }
        );
      }

      await new Promise((r) => setTimeout(r, 1000));
      result = await replicate.predictions.get(prediction.id);
    }

    if (result.status === "failed") {
      const errorMessage = result.error || "Unknown error occurred";
      return NextResponse.json(
        { error: `Generation failed: ${errorMessage}` },
        { status: 500 }
      );
    }

    if (result.status === "canceled") {
      return NextResponse.json(
        { error: "Generation was canceled." },
        { status: 500 }
      );
    }

    if (result.status !== "succeeded" || !result.output) {
      return NextResponse.json(
        { error: "Generation failed. Try a different photo!" },
        { status: 500 }
      );
    }

    const outputUrl = Array.isArray(result.output)
      ? result.output[0]
      : result.output;

    if (typeof outputUrl !== "string") {
      return NextResponse.json(
        { error: "Invalid output received from generation service." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        status: "success",
        output: outputUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request format." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
