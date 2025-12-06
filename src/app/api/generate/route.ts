import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

type Vibe = "OFFICE" | "HOME" | "COUPLE";

type GenerateRequestBody = {
  userImage: string;
  vibe: Vibe;
};

const MODEL_VERSION =
  "43d309c37ab4e62361e5e29b8e9e867fb2dcbcec77ae91206a8d95ac5dd451a0";

const IDENTITY_PROMPT =
  "The generated person must match the person in the input photo as closely as possible. Preserve face shape, facial features, age, skin tone, eye color, hairstyle, hair length and hair color. Do not change the haircut or hair length. Do not make a new character. Do not beautify or rejuvenate too much.";

const VINTAGE_BASE =
  "1995 Christmas photograph, shot on 35mm film, subtle halation, warm film grain, slight vignette, soft focus, gentle motion blur, polaroid-like look, not digital, not HDR, not ultra sharp, not modern phone camera.";

function buildPrompt(vibe: Vibe) {
  if (vibe === "OFFICE") {
    return [
      VINTAGE_BASE,
      "single person in the foreground, crowded office Christmas party in 1995, people blurred in the background, fluorescent office lights, ugly Christmas sweaters, disposable cups, cozy but slightly chaotic atmosphere, shallow depth of field.",
      IDENTITY_PROMPT,
    ].join(" ");
  }

  if (vibe === "COUPLE") {
    return [
      VINTAGE_BASE,
      "romantic 1995 Christmas living room scene, couple sitting close together, heads close, warm tungsten lamps, Christmas tree lights bokeh behind them, soft dreamy glow, cozy intimate mood.",
      IDENTITY_PROMPT,
      "If there are two people in the input, keep them as a real couple: left person stays on the left, right person stays on the right. Do not duplicate the same face.",
    ].join(" ");
  }

  return [
    VINTAGE_BASE,
    "single person at home in front of a real Christmas tree with multicolored lights, 90s living room, CRT television, patterned carpet, framed photos on the wall, gifts under the tree, warm tungsten light, nostalgic family photo.",
    IDENTITY_PROMPT,
  ].join(" ");
}

const NEGATIVE_PROMPT =
  "cartoon, anime, painting, illustration, 3d render, cgi, deformed face, distorted anatomy, extra eyes, extra nose, multiple faces, wrong gender, different person, text, watermark, logo, ultra sharp digital photo, iphone photo, hdr, oversharpened, glamour portrait, beauty filter, heavy makeup, exaggerated smoothing";

export async function POST(req: Request) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Missing REPLICATE_API_TOKEN on server." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as GenerateRequestBody;
    const { userImage, vibe } = body;

    if (!userImage) {
      return NextResponse.json(
        { error: "No image provided." },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(vibe || "HOME");

    const prediction = await replicate.predictions.create({
      version: MODEL_VERSION,
      input: {
        width: 768,
        height: 960,
        prompt,
        main_face_image: userImage,
        negative_prompt: NEGATIVE_PROMPT,
        num_outputs: 1,
        guidance_scale: 7,
        num_inference_steps: 32,
        id_weight: 1.35,
        true_cfg: 1.3,
      },
    });

    let result = await replicate.predictions.get(prediction.id);

    while (
      result.status === "starting" ||
      result.status === "processing" ||
      result.status === "queued"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      result = await replicate.predictions.get(result.id);
    }

    if (result.status === "failed") {
      return NextResponse.json(
        {
          error:
            "Generation failed: " +
            (result.error ? String(result.error) : "Unknown Replicate error."),
        },
        { status: 500 }
      );
    }

    let imageUrl: string | null = null;

    if (Array.isArray(result.output) && result.output.length > 0) {
      imageUrl = String(result.output[0]);
    } else if (typeof result.output === "string") {
      imageUrl = result.output;
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image returned from Replicate." },
        { status: 500 }
      );
    }

    return NextResponse.json({ output: imageUrl });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          "Server error: " +
          (error?.message || "Unknown error while calling Replicate."),
      },
      { status: 500 }
    );
  }
}
