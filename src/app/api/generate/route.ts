import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN as string,
});

type Vibe = "PARTY" | "HOME" | "COUPLE";

type GenerateRequestBody = {
  userImage: string;
  vibe: Vibe;
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

    const identityPrompt =
      "Subject must look identical to the person in the input photo. Preserve face shape, skin tone, eye shape and color, nose, mouth, jawline, eyebrows and all small asymmetries. Preserve the exact hairstyle: same length, same color, same parting, same hairline and volume. Do not cut, recolor or restyle the hair. Do not add bangs or fringe. Do not smooth, retouch or beautify the face. Do not change makeup. Do not change age or gender. Do not generate a new person.";

    const polaroidBase =
      "1995 Christmas Polaroid photo, instant film, soft focus, subtle motion blur, visible film grain, gentle vignette, small white border, flash photography, slight warm color cast, scanned print, analog, not digital, not HDR, not smartphone camera.";

    let scenePrompt: string;

    if (vibe === "PARTY") {
      scenePrompt =
        "single person in the foreground, waist-up, centered in frame, crowded office Christmas party in the background, people behind are slightly out of focus, ugly Christmas sweaters, garlands and fairy lights, plastic cups on tables, lively but blurred background, exactly one sharp face in the foreground.";
    } else if (vibe === "HOME") {
      scenePrompt =
        "single person in a cozy 1995 family living room, sitting on a sofa near a decorated real Christmas tree with multicolored lights, CRT television, framed family photos on the wall, patterned carpet, warm tungsten lamps, homely atmosphere, exactly one sharp face in the scene.";
    } else {
      scenePrompt =
        "two people sitting close together at a small table by a window, romantic 1995 Christmas evening, fairy lights bokeh in the background, mugs on the table, cozy intimate atmosphere, exactly two faces visible, both in focus.";
    }

    const fullPrompt = `${polaroidBase} ${scenePrompt} ${identityPrompt}`;

    const prediction = await replicate.predictions.create({
      version:
        "43d309c37ab4e62361e5e29b8e9e867fb2dcbcec77ae91206a8d95ac5dd451a0",
      input: {
        width: 768,
        height: 960,
        prompt: fullPrompt,
        main_face_image: userImage,
        negative_prompt:
          "different person, different face, face swap, beauty filter, retouched skin, plastic skin, over-smooth skin, cartoon, anime, painting, illustration, distorted face, deformed face, extra faces, extra eyes, extra nose, multiple sharp faces, different hairstyle, haircut, shaved head, bangs, fringe, ponytail, bun, different hair color, hat covering hair, strong makeup change, text, watermark, logo",
        num_outputs: 1,
        guidance_scale: 7,
        num_inference_steps: 30,
        id_weight: 1.4,
        true_cfg: 1.2
      }
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
