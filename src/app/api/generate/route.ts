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

const REPLICATE_MODEL =
  "black-forest-labs/flux-kontext-pro:15589a1a9e6b240d246752fc688267b847db4858910cc390794703384b6a5443";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 5;
const RATE_LIMIT_WINDOW = 60000;
const MAX_IMAGE_SIZE = 4_000_000;

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
    const result = (await tx.exec()) as [number, unknown];
    const count = result[0];
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
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/.exec(dataUrl);
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
      return 0.64;
    case "PARTY":
      return 0.7;
    case "HOME":
      return 0.66;
    default:
      return 0.66;
  }
}

function getGuidanceScale(vibe: Vibe): number {
  switch (vibe) {
    case "COUPLE":
      return 5.2;
    case "PARTY":
      return 5.1;
    case "HOME":
      return 4.9;
    default:
      return 5.0;
  }
}

function getNumInferenceSteps(vibe: Vibe): number {
  switch (vibe) {
    case "COUPLE":
      return 34;
    case "PARTY":
      return 36;
    case "HOME":
      return 34;
    default:
      return 34;
  }
}

function buildPrompt(vibe: Vibe): string {
  const identityLockSingle = [
    "Use the input face as the absolute ground truth",
    "Reproduce the face with 1:1 accuracy compared to the input",
    "No beautification, no symmetry correction, no smoothing",
    "No face reshaping, no slimming, no jawline modification",
    "Preserve exact bone structure, jawline, cheek volume, nose shape, lip thickness",
    "Preserve eyebrow angle, density, spacing, eyelid structure, eye shape",
    "Preserve iris color and pattern with natural reflections",
    "Preserve freckles, moles, pores, skin texture, micro details",
    "Preserve hairline, hair volume, hair length and hairstyle",
    "Expression must remain identical",
    "No head enlargement, no neck shortening, no cartoon look",
    "Face must remain fully photorealistic and not stylized in any way"
  ].join(", ");

  const identityLockCouple = [
    "There are exactly two real people in the input photo",
    "Keep both original people from the input, do not merge or replace them",
    "Both faces must match their original input perfectly with no stylization",
    "No new faces, no extra people, no face swapping",
    "No beautification, no symmetry correction, no smoothing on either face",
    "Preserve each person’s bone structure, jawline, cheek volume, nose shape, lip thickness",
    "Preserve each person’s eyebrow angle, density, spacing, eyelid structure, eye shape",
    "Preserve each person’s iris color and pattern with natural reflections",
    "Preserve each person’s freckles, moles, pores, skin texture, micro details",
    "Preserve hairline, hair volume, hair length and hairstyle for both",
    "Expressions must remain identical for both people",
    "No head enlargement, no neck shortening, no cartoon look",
    "Faces must remain fully photorealistic and not stylized in any way"
  ].join(", ");

  const faceSafe = [
    "Apply retro color grading mainly to background and clothes",
    "Do not over-stylize the faces",
    "Faces must stay crisp, detailed, sharp and realistic",
    "Avoid blur, haze, glow or excessive film grain on the facial region"
  ].join(", ");

  const cinematic = [
    "Hyper-realistic 35mm film photograph of real people, not illustration, not CGI, not AI-art",
    "Photorealistic 1990s Christmas aesthetic",
    "Shot on Kodak Portra 400 style film",
    "Subtle film grain",
    "Warm nostalgic lighting",
    "High detail textures",
    "Natural skin texture with pores and microdetails",
    "Cinematic depth of field",
    "Looks like a real camera photo from 1995"
  ].join(", ");

  const integration = [
    "Perfect physical integration into the room",
    "Correct perspective, scale, shadow and lighting match",
    "Subjects stand or sit naturally with proper grounding",
    "No floating, no cutout effect"
  ].join(", ");

  const framing = [
    "Wide environmental portrait 4:5",
    "Camera is a few steps back from the subject",
    "Not a headshot, not tight crop, not a selfie",
    "Mid-shot or waist-up composition showing body posture",
    "Show Christmas tree, furniture and room details",
    "Rule of thirds composition"
  ].join(", ");

  if (vibe === "PARTY") {
    return [
      "Hyper-realistic 1990s office Christmas party photo with direct flash",
      "Crowded room, people dancing blurred in the background",
      "Decorations: fairy lights, tinsel, garlands, big Christmas tree",
      "Lighting: harsh on-camera flash plus moody room shadows",
      "Change the outfit to a stylish 1990s Christmas party look",
      "For men: smart shirt or blazer, no satin blouse, no dress, no overly feminine clothing",
      "For women: festive but tasteful 90s party outfit, not overly revealing",
      "Ignore and remove any handheld objects from the input such as flowers, coffee cups, mugs, phones or glasses",
      cinematic,
      integration,
      framing,
      faceSafe,
      identityLockSingle
    ].join(", ");
  }

  if (vibe === "HOME") {
    return [
      "Hyper-realistic cozy 1990s home Christmas scene",
      "Fireplace, stockings, warm lights, tree ornaments, wrapped gifts",
      "Soft warm lighting filling the room",
      "Change the outfit to a comfortable festive knit sweater outfit suitable for staying at home",
      "Classic red or green 90s Christmas sweater with simple patterns",
      "Ignore and remove any handheld objects from the input such as flowers, coffee cups, mugs, phones or glasses",
      cinematic,
      integration,
      framing,
      faceSafe,
      identityLockSingle
    ].join(", ");
  }

  return [
    "Hyper-realistic romantic 1990s Christmas couple photo",
    "Exactly two people in the scene, standing close together",
    "Matching red knit Christmas sweaters with subtle 90s pattern for both",
    "Soft fireplace glow, candles and Christmas tree lights in the background",
    "Warm intimate lighting on both people",
    "Hands relaxed or gently around each other, no bouquet, no mug, no cup, no phone",
    "Ignore and remove any handheld objects from the input such as flowers, bouquets, coffee cups, mugs, phones or glasses",
    cinematic,
    integration,
    framing,
    faceSafe,
    identityLockCouple
  ].join(", ");
}

function buildNegativePrompt(): string {
  return [
    "extreme close up, face filling frame, selfie-style framing, tight crop, zoomed in face-only frame",
    "ugly, disfigured, deformed, warped anatomy",
    "extra limbs, melted clothing, distorted bodies",
    "cartoon, anime, illustration, painting, sketch, comic",
    "ai-generated look, hdr, overprocessed, oversaturated, digital art, cgi",
    "over-smoothed skin, waxy skin, plastic face, beauty filter look",
    "glowing eyes, hollow eyes, no pupils",
    "heavy blur, motion blur, ghosting, double exposure on the face",
    "passport photo, mugshot, id photo, floating head",
    "plain background, studio background, solid color backdrop",
    "tiktok filter, snapchat filter, beauty app filter",
    "logos, text, watermark",
    "wedding bouquet, bouquet of flowers, flowers in hand, flower bunch",
    "coffee cup, mug, teacup, paper cup, wine glass, champagne glass, beer glass, bottle in hand",
    "microphone, phone in hand, selfie phone, camera in hand",
    "wrong Christmas context, summer scene, beach scene"
  ].join(", ");
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
        {
          error: "Invalid image format or image too large (max ~4MB JPG/PNG)."
        },
        { status: 400 }
      );
    }

    const input = {
      prompt: buildPrompt(normalizedVibe),
      input_image: userImage,
      aspect_ratio: "4:5",
      output_format: "jpg",
      safety_tolerance: 2,
      prompt_strength: getPromptStrength(normalizedVibe),
      guidance_scale: getGuidanceScale(normalizedVibe),
      num_inference_steps: getNumInferenceSteps(normalizedVibe),
      negative_prompt: buildNegativePrompt()
    };

    const output = (await replicate.run(REPLICATE_MODEL, {
      input
    })) as unknown;

    let outputUrl: string | null = null;

    if (Array.isArray(output) && output.length > 0) {
      const first = output[0] as any;
      if (typeof first === "string") {
        outputUrl = first;
      }
    } else if (typeof output === "string") {
      outputUrl = output as string;
    }

    if (!outputUrl) {
      return NextResponse.json(
        { error: "Invalid output received from generation service." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { status: "success", output: outputUrl, vibe: normalizedVibe },
      { status: 200 }
    );
  } catch (error: any) {
    const message =
      typeof error?.message === "string"
        ? error.message
        : "Server error. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
