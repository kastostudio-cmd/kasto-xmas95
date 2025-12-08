import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { Redis } from "@upstash/redis";

export const maxDuration = 60;
export const runtime = "nodejs";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || ""
});

let redis: Redis | null = null;
try {
  redis = Redis.fromEnv();
} catch {
  redis = null;
}

type Vibe = "PARTY" | "HOME" | "COUPLE";

const REPLICATE_MODEL_VERSION =
  "15589a1a9e6b240d246752fc688267b847db48589110cc390794703384b6a5443";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 5;
const RATE_LIMIT_WINDOW = 60000;
const MAX_IMAGE_SIZE = 10_000_000;
const TIMEOUT_BUFFER = 3000;

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || realIp || "unknown";
}

async function checkRateLimit(id: string): Promise<boolean> {
  if (redis) {
    const key = `rate-limit:${id}`;
    const windowSeconds = Math.ceil(RATE_LIMIT_WINDOW / 1000);
    const tx = redis.multi();
    tx.incr(key);
    tx.expire(key, windowSeconds);
    const [count] = (await tx.exec()) as [number, unknown];
    return typeof count === "number" ? count <= MAX_REQUESTS_PER_MINUTE : true;
  } else {
    const now = Date.now();
    const info = rateLimitMap.get(id);
    if (!info || now > info.resetTime) {
      rateLimitMap.set(id, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      return true;
    }
    if (info.count >= MAX_REQUESTS_PER_MINUTE) return false;
    info.count += 1;
    return true;
  }
}

function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) rateLimitMap.delete(key);
  }
}

function validateBase64Image(dataUrl: string): boolean {
  if (!dataUrl || typeof dataUrl !== "string") return false;

  const isUrl = /^https?:\/\//.test(dataUrl);
  if (isUrl) {
    try {
      const url = new URL(dataUrl);
      if (url.protocol !== "https:") return false;
      if (!/\.(png|jpg|jpeg|webp|heic)$/i.test(url.pathname)) return false;
      return true;
    } catch {
      return false;
    }
  }

  const match = /^data:image\/(png|jpeg|jpg|webp|heic);base64,(.+)$/.exec(
    dataUrl
  );
  if (!match) return false;

  const base64Data = match[2];
  const estimatedBytes = (base64Data.length * 3) / 4;
  return estimatedBytes <= MAX_IMAGE_SIZE;
}

function normalizeVibe(v: any): Vibe | null {
  if (!v) return null;
  const upper = String(v).toUpperCase();
  if (upper === "PARTY" || upper === "HOME" || upper === "COUPLE") {
    return upper as Vibe;
  }
  return null;
}

function getPromptStrength(vibe: Vibe): number {
  switch (vibe) {
    case "COUPLE":
      return 0.7;
    case "PARTY":
      return 0.89;
    case "HOME":
      return 0.88;
    default:
      return 0.88;
  }
}

function getGuidanceScale(vibe: Vibe): number {
  switch (vibe) {
    case "COUPLE":
      return 6.5;
    default:
      return 7.5;
  }
}

function getNumInferenceSteps(vibe: Vibe): number {
  return 60;
}

function buildPrompt(vibe: Vibe): string {
  const absoluteFacePreservation = [
    "Input face is the absolute ground truth",
    "Preserve the exact facial identity, bone structure, and unique features of the input person strictly",
    "Skin texture must look distinctively human with visible pores, not smooth or waxy",
    "Eyes must be perfectly sharp, symmetrical, and alive with a natural reflection (catchlight)",
    "Eyes must look completely natural with visible iris and pupil, no glowing eyes, no light emitting from the eyes",
    "Do not genericize the face, keep the character and specific look of the original person",
    "No plastic surgery look, no AI beautification filter, keep it raw and authentic",
    "Facial proportions, expression, and age must remain exactly consistent with the input",
    "Do not change the jawline, nose, lips, or eye shape at all",
    "Do not alter makeup style, freckles, moles, scars, or facial hair patterns"
  ].join(", ");

  const cinematicQuality = [
    "Shot on Kodak Portra 400 film",
    "Cinematic lighting",
    "High-end fashion editorial look",
    "Incredible depth of field",
    "Detailed textures",
    "Atmospheric lighting",
    "Film grain",
    "8k resolution",
    "Masterpiece"
  ].join(", ");

  const physicalIntegration = [
    "The subject is fully and naturally integrated into the environment",
    "Perspective, scale, and camera angle are perfectly matched between subject and room",
    "The subject stands or sits on real ground or furniture with correct contact points",
    "Natural, realistic shadows are cast on the floor and nearby objects from the scene lighting",
    "Lighting color, intensity, and direction on the subject match the room lighting flawlessly",
    "No cut-out look, no sticker effect, no collage feeling, no floating or detached subject",
    "The whole image looks like a single cohesive photograph captured in-camera in that space"
  ].join(", ");

  const christmasClothingRequirement = [
    "COMPLETELY REPLACE ORIGINAL OUTFIT",
    "The subject is wearing high-quality, unisex, premium Christmas attire",
    "Clothing must be gender-neutral and stylish",
    "Fabric texture must be visible and look expensive",
    "Colors: Deep festive reds, forest greens, snowy whites, navy blues, and warm earthy tones",
    "No graphic tees, no logos, only timeless patterns or solid festive textures"
  ].join(", ");

  const perfectFraming = [
    "Wide environmental portrait",
    "Camera is significantly pulled back to show the entire festive scene",
    "The subject occupies a smaller portion of the frame, fully immersed and integrated into the surroundings",
    "Rule of thirds composition with plenty of space around the person",
    "Not a headshot, not a passport photo, not a tight crop",
    "Dynamic angle, candid feel showing the person within the room",
    "The floor, furniture, and background architecture are clearly visible around the subject"
  ].join(", ");

  if (vibe === "PARTY") {
    return [
      "Wide flash photography style captured at a trendy 90s office Christmas party",
      "Direct flash lighting with a slight vignette, creating a cool, retro celebrity snapshot vibe",
      "Background: a large office or loft space with a clearly visible decorated Christmas tree, hanging garlands, fairy lights, and festive ornaments everywhere",
      "Atmosphere: Energetic, fun, slightly chaotic but chic, people dancing blurred in the distance with Christmas drinks and props",
      "Lighting: High contrast flash on the subject, dark moody background with neon party lights and warm Christmas tree glow widely visible",
      "Keep the outfit clearly Christmas-themed, not generic clubwear",
      "If the subject is a man: sharp 90s-style dark tailored holiday suit or blazer with a shirt or knit turtleneck, maybe a subtle tie, polished but relaxed",
      "If the subject is a woman: chic 90s-inspired holiday look such as a satin slip dress, sequin top with tailored trousers, or a little black dress with sheer tights and festive accessories",
      "Male and female styling must feel clearly different but belong to the same high-end Christmas party scene",
      "The subject is clearly standing or moving among other guests on the party floor, not isolated",
      "The subject looks like a guest enjoying a high-end Christmas event surrounded by decorations and people",
      cinematicQuality,
      christmasClothingRequirement,
      absoluteFacePreservation,
      physicalIntegration,
      "Skin should glisten slightly under the flash, looking realistic and hydrated",
      perfectFraming
    ].join(", ");
  }

  if (vibe === "HOME") {
    return [
      "Wide, intimate Christmas Eve scene in a large, ultra-cozy living room",
      "Lighting: Warm, soft, golden hour glow coming from a large fireplace and massive Christmas tree lights filling the room",
      "Atmosphere: Peaceful, silent night, heavy 'hygge' feeling, viewing the person in their comfortable environment",
      "Background: A wide view of a decorated Christmas tree, stocked fireplace, plush furniture, blankets, and gifts",
      "Clothing: A unisex, comfortable, oversized, chunky knit Christmas sweater in neutral festive tones (cream, deep green, or charcoal)",
      "Subject sits or lounges naturally on a sofa, armchair, or thick rug inside the room, with feet or body clearly anchored in the space",
      "The subject appears genuinely at home, relaxed and small within the large warm room",
      cinematicQuality,
      christmasClothingRequirement,
      absoluteFacePreservation,
      physicalIntegration,
      "Light reflecting softly in the eyes and on the cheekbones",
      perfectFraming
    ].join(", ");
  }

  return [
    "A wide, cinematic shot of a couple in love during Christmas, looking like a still from a movie",
    "CRITICAL: Keep BOTH faces exactly matching the input identities, sharp and unaltered with zero change to facial features",
    "Both faces must remain 100% identical to the original photo, including all proportions, skin details, and expressions",
    "Chemistry: The couple is leaning heads together, physically close, creating a sense of deep intimacy",
    "The couple stands or sits together on a sofa or in front of the fireplace, clearly grounded in the room with natural contact points",
    "Clothing: MATCHING identical unisex high-end couple Christmas sweaters (e.g., classic fair isle pattern in navy and cream)",
    "The sweaters look thick, premium, and identical, uniting them as a pair",
    "Lighting: Soft, romantic candlelight and fireplace glow, illuminating them within the wider scene",
    "Background: A dreamy, wide view of a luxury living room decorated for Christmas, with the couple integrated into the setting",
    "Details: The connection between them is the focus, genuine smiles or romantic gaze",
    "Both faces must be very sharp and high quality, despite the low light atmosphere",
    cinematicQuality,
    christmasClothingRequirement,
    absoluteFacePreservation,
    physicalIntegration,
    "No floating heads, full bodies or waist-up visible naturally posed together in the room",
    perfectFraming
  ].join(", ");
}

function buildNegativePrompt(): string {
  return [
    "extreme close up, tight framing, face filling the screen",
    "ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, out of frame, extra limbs, disfigured, deformed",
    "body out of frame, blurry, bad anatomy, blurred, watermark, grainy, signature, cut off, draft",
    "bad eyes, dead eyes, crossed eyes, asymmetry",
    "glowing eyes, eyes emitting light, bright white eyes, hollow eyes, eyeless, no pupils, no iris",
    "plastic skin, wax figure, oily skin, too smooth, airbrushed",
    "studio lighting, flat lighting, white background, grey background",
    "passport photo, mugshot, id photo, floating head",
    "distorted clothing, melting clothes, merging bodies",
    "cartoon, anime, 3d render, sketch, illustration, painting",
    "motion blur on face, ghosting",
    "feminine clothing on male subject, masculine clothing on female subject"
  ].join(", ");
}

async function createPredictionWithRetry(input: Record<string, any>) {
  const maxAttempts = 4;
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxAttempts) {
    try {
      return await replicate.predictions.create({
        version: REPLICATE_MODEL_VERSION,
        input
      });
    } catch (e: any) {
      const msg = String(e?.message || "");
      const status = (e as any)?.status || (e as any)?.statusCode;
      const is429 =
        status === 429 ||
        msg.includes("429") ||
        msg.toLowerCase().includes("throttled");

      if (!is429) throw e;

      lastError = e;
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
    }
  }

  const message =
    (lastError && lastError.message) ||
    "Generation rate-limited. Please wait a few seconds and try again.";
  throw new Error(message);
}

async function getPredictionWithRetry(id: string) {
  const maxAttempts = 3;
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxAttempts) {
    try {
      return await replicate.predictions.get(id);
    } catch (e: any) {
      const msg = String(e?.message || "");
      const status = (e as any)?.status || (e as any)?.statusCode;
      const transient =
        status === 429 ||
        (typeof status === "number" && status >= 500) ||
        msg.toLowerCase().includes("timeout") ||
        msg.toLowerCase().includes("temporarily") ||
        msg.toLowerCase().includes("unavailable");

      if (!transient || attempt === maxAttempts - 1) {
        lastError = e;
        break;
      }

      lastError = e;
      const delay = Math.min(500 * Math.pow(2, attempt), 2000);
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
    }
  }

  if (lastError) throw lastError;
  throw new Error("Unknown prediction fetch error");
}

export async function POST(req: NextRequest) {
  try {
    cleanupRateLimitMap();

    const clientId = getClientIdentifier(req);
    const allowed = await checkRateLimit(clientId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const { userImage, vibe } = body as {
      userImage?: string;
      vibe?: Vibe | string;
    };

    const normalizedVibe = normalizeVibe(vibe);
    if (!userImage || !normalizedVibe) {
      return NextResponse.json(
        { error: "Missing image or vibe mode." },
        { status: 400 }
      );
    }

    if (!validateBase64Image(userImage)) {
      return NextResponse.json(
        { error: "Invalid image format or image too large (max 10MB)." },
        { status: 400 }
      );
    }

    const input = {
      prompt: buildPrompt(normalizedVibe),
      input_image: userImage,
      aspect_ratio: "3:4",
      output_format: "jpg",
      output_quality: 100,
      negative_prompt: buildNegativePrompt(),
      safety_tolerance: 2,
      prompt_strength: getPromptStrength(normalizedVibe),
      guidance_scale: getGuidanceScale(normalizedVibe),
      num_inference_steps: getNumInferenceSteps(normalizedVibe)
    };

    const prediction = await createPredictionWithRetry(input);

    let result = await getPredictionWithRetry(prediction.id);
    const startedAt = Date.now();
    let pollCount = 0;
    const timeoutMs = maxDuration * 1000 - TIMEOUT_BUFFER;

    while (
      result.status === "starting" ||
      result.status === "processing" ||
      result.status === "queued"
    ) {
      if (Date.now() - startedAt > timeoutMs) {
        try {
          await replicate.predictions.cancel(prediction.id);
        } catch {}
        return NextResponse.json(
          { error: "Generation timed out. Please try again!" },
          { status: 504 }
        );
      }
      const waitTime = Math.min(400 * Math.pow(2, pollCount), 2000);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      pollCount += 1;
      result = await getPredictionWithRetry(prediction.id);
    }

    if (
      result.status !== "succeeded" &&
      result.status !== "failed" &&
      result.status !== "canceled"
    ) {
      return NextResponse.json(
        { error: "Unknown status from generation service." },
        { status: 500 }
      );
    }

    if (result.status === "failed") {
      const errorMessage = (result as any).error || "Unknown error occurred";
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

    if (!result.output) {
      return NextResponse.json(
        { error: "Generation failed. Try a different photo!" },
        { status: 500 }
      );
    }

    const outputUrl = Array.isArray(result.output)
      ? (result.output[0] as string)
      : (result.output as string);

    if (typeof outputUrl !== "string") {
      return NextResponse.json(
        { error: "Invalid output received from generation service." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { status: "success", output: outputUrl },
      { status: 200 }
    );
  } catch (error) {
    console.error("Generation route error", {
      error
    });
    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
