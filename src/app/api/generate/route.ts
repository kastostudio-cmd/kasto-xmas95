import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
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

    const identityPrompt =
      "match the person in the input photo exactly, same face structure, same jawline, same nose, same lips, same eye shape, same skin tone, same age, no beautification. keep the exact same hairstyle, same hair length, same hair volume, same hair parting and same hair color, do not cut the hair shorter, do not make the hair longer, do not add bangs, do not change the hair texture.";

    const filmPrompt =
      "authentic 1990s christmas photograph, shot on cheap consumer 35mm film, subtle film grain, light halation around bright lights, soft background bokeh, slightly soft focus, gentle blur only in the background, not HDR, not overly sharp, not digital, subtle polaroid look, natural colors, no neon glow.";

    let scenePrompt: string;

    if (vibe === "PARTY") {
      scenePrompt =
        "single person in the foreground, centered, waist up framing, crowded 1990s office christmas party in the background, fluorescent office ceiling, co-workers behind, christmas string lights, tinsel, ugly christmas sweaters, disposable cups on tables, busy but slightly out of focus background.";
    } else if (vibe === "HOME") {
      scenePrompt =
        "single person in a cozy 1990s family living room, real christmas tree with multicolored lights, warm tungsten lamp, patterned carpet, framed pictures on the wall, a few wrapped gifts, homely and slightly cluttered, background softly blurred.";
    } else {
      scenePrompt =
        "two people sitting close together, both fully visible from waist up, romantic cozy christmas living room, fairy lights around the window, warm tungsten light, mugs on the table, soft dreamy atmosphere, background bokeh and gentle blur.";
    }

    const fullPrompt = [
      filmPrompt,
      scenePrompt,
      identityPrompt,
      "vintage retro christmas mood, candid photo, realistic clothing and lighting."
    ].join(" ");

    const negativePrompt =
      "cartoon, anime, illustration, painting, plastic skin, beauty filter, overprocessed, over sharpened, hdr, glitch, text, watermark, logo, distorted face, extra limbs, extra fingers, extra eyes, deformed head, wrong anatomy, incorrect perspective, wrong gender, different person, different identity, different hair color, different hairstyle, bangs, bob cut, shaved head, extremely long hair, rainbow hair, wig, hat covering hair.";

    const prediction = await replicate.predictions.create({
      version:
        "43d309c37ab4e62361e5e29b8e9e867fb2dcbcec77ae91206a8d95ac5dd451a0",
      input: {
        width: 768,
        height: 960,
        prompt: fullPrompt,
        main_face_image: userImage,
        negative_prompt: negativePrompt,
        num_outputs: 1,
        guidance_scale: 7,
        num_inference_steps: 32,
        id_weight: 1.35,
        true_cfg: 1.25,
      },
    });

    let result: any = await replicate.predictions.get(prediction.id);

    const loadingStates: string[] = ["starting", "processing", "queued"];

    while (loadingStates.includes(result.status as string)) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      result = await replicate.predictions.get(result.id);
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
