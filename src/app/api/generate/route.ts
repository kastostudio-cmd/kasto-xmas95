import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN as string,
});

type GenerateRequestBody = {
  userImage: string;
  vibe: "PARTY" | "HOME" | "COUPLE";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateRequestBody;
    const { userImage, vibe } = body;

    if (!userImage) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    const identity =
      "The generated person must look exactly like the person in the input photo. Preserve identity, age, gender, face shape, jawline, nose, mouth, teeth, eyes, eyebrows, skin tone and hairstyle. Do not beautify, do not change makeup, do not change hairstyle, do not change teeth, do not make a new character.";

    const filmLook =
      "single 1990s Christmas instant film photograph, shot on Polaroid 600, white instant film border, soft focus, very slight lens blur, visible but fine film grain, gently muted colors, subtle vignette, not HDR, not ultra sharp, not digital.";

    let prompt: string;

    if (vibe === "PARTY") {
      prompt = [
        filmLook,
        "indoor office Christmas party in the mid 1990s, festive lights and garlands in the background, but only one person clearly in the frame.",
        "Upper body portrait of the same person from the input, facing the camera or slightly angled.",
        "Background can have vague silhouettes, but no clearly visible extra faces, no crowd in focus, no second person next to them.",
        identity,
      ].join(" ");
    } else if (vibe === "COUPLE") {
      prompt = [
        filmLook,
        "cozy romantic 1990s Christmas evening near a window with warm string lights and bokeh.",
        "Exactly two people sitting close together like a couple, the same main person from the input plus one partner.",
        "Keep the main person from the input as the primary face in the foreground. Do not add any third person, no crowd, no extra faces in the background.",
        identity,
      ].join(" ");
    } else {
      prompt = [
        filmLook,
        "classic 1990s living room Christmas scene with a real Christmas tree, warm tungsten lamps, patterned carpet and family decorations.",
        "Only one person clearly in the frame, the same person from the input, sitting or standing in front of the tree.",
        "No second person, no group, no additional faces in background.",
        identity,
      ].join(" ");
    }

    const prediction = await replicate.predictions.create({
      version:
        "43d309c37ab4e62361e5e29b8e9e867fb2dcbcec77ae91206a8d95ac5dd451a0",
      input: {
        width: 768,
        height: 960,
        prompt,
        main_face_image: userImage,
        negative_prompt:
          "crowd, multiple people, extra faces, background people, beautified face, modified teeth, different hairstyle, different person, deformed face, distorted anatomy, cartoon, anime, painting, illustration, HDR, oversharpened, plastic skin, text, watermark, logo",
        num_outputs: 1,
        guidance_scale: 5.0,
        num_inference_steps: 28,
        id_weight: 1.7,
        true_cfg: 1.4,
      },
    });

    let result = await replicate.predictions.get(prediction.id);

    while (
      result.status === "starting" ||
      result.status === "processing" ||
      result.status === "queued"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      result = await replicate.predictions.get(prediction.id);
    }

    if (result.status === "failed") {
      return NextResponse.json(
        { error: "Generation failed: " + String(result.error ?? "") },
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
        { error: "No image generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({ output: imageUrl });
  } catch (err) {
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
