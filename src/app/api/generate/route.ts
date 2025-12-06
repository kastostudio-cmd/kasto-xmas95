import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const maxDuration = 60;
export const runtime = "nodejs";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || ""
});

type Vibe = "PARTY" | "HOME" | "COUPLE";

const identityCore =
  "use the same person from the input photo, preserve facial structure, bone structure, eye shape, nose, lips, jawline, skin tone and overall proportions, keep the same age and same ethnicity, the person must be easily and instantly recognizable";

const hairLock =
  "keep exactly the same hairstyle, same hair length, same hair color and parting as in the input, do not cut the hair shorter, do not add bangs, do not recolor or dye the hair, do not add hats or accessories unless they already exist";

const filmLook =
  "authentic 1990s polaroid instant photograph, kodak gold 400 film, very soft focus with light blur, visible fine film grain texture, warm tungsten indoor color cast, slight vignette on corners, gentle overexposed highlights, subtle red-eye effect, nostalgic cozy mood";

const flashLighting =
  "direct built-in camera flash from the front, slightly darker background, amateur handheld camera feeling with a hint of motion blur";

const negativePrompt =
  "cartoon, illustration, anime, 3d render, painting, cgi, plastic skin, airbrush, heavy beauty retouch, glitch, jpeg artifacts, deformed face, distorted eyes, extra limbs, extra fingers, extra head, duplicate person, twin copy of same face, merged faces, wrong gender, huge age change, extreme weight change, bald if not bald, different hair color, different hair length, bangs if not in original, sunglasses, extra people with visible faces";

function buildPrompt(vibe: Vibe): string {
  if (vibe === "PARTY") {
    return (
      identityCore +
      ", " +
      hairLock +
      ", single person only, no other faces in focus, subject is centered at chest-up distance, 1995 office christmas party, blurred coworkers and decorations in the background, cheap metallic tinsel, red plastic cups, paper plates with cake, fluorescent office lighting mixed with colorful string lights, subject wearing a festive but casual 90s knit sweater or checked shirt, genuine happy and slightly tipsy smile, candid moment mid-laugh, " +
      filmLook +
      ", " +
      flashLighting
    );
  }

  if (vibe === "HOME") {
    return (
      identityCore +
      ", " +
      hairLock +
      ", single person only, no other people visible, 1995 family living room at christmas, big decorated christmas tree with colorful lights behind the subject, wrapped gifts on the floor, patterned carpet or cozy sofa, wood panels or floral wallpaper, crt television and shelves in the background, subject sitting comfortably on the floor or sofa wearing oversized sweater or flannel pyjamas, warm relaxed smile, intimate family album feeling, " +
      filmLook +
      ", " +
      flashLighting
    );
  }

  return (
    identityCore +
    ", keep and use all faces from the input image, " +
    hairLock +
    ", exactly two people only, no third person, do not duplicate one person twice, do not merge faces, the man stays clearly male and the woman clearly female with their own original faces and hairstyles, they sit close together and lean slightly towards each other, chest-up framing, romantic 1995 christmas couples photo, big bokeh christmas tree lights in the background, mistletoe above, cozy indoor setting, soft affectionate smiles, first christmas together energy, " +
    filmLook +
    ", " +
    flashLighting
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "API Config Error" },
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

    const input = {
      prompt: buildPrompt(vibe),
      negative_prompt: negativePrompt,
      image: userImage,
      go_fast: true,
      guidance_scale: 3.5,
      megapixels: "1",
      num_inference_steps: 30,
      prompt_strength: 0.5,
      output_format: "jpg",
      output_quality: 92,
      aspect_ratio: "4:5"
    };

    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-dev",
      input
    });

    let result = await replicate.predictions.get(prediction.id);
    const startedAt = Date.now();
    let pollCount = 0;
    const timeoutMs = 55000;

    while (
      ["starting", "processing", "queued"].includes(
        (result.status || "") as string
      )
    ) {
      if (Date.now() - startedAt > timeoutMs) {
        try {
          await replicate.predictions.cancel(prediction.id);
        } catch {}
        return NextResponse.json(
          { error: "Generation timed out. Please try again." },
          { status: 504 }
        );
      }

      const waitTime = Math.min(500 * Math.pow(2, pollCount), 2000);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      pollCount += 1;

      result = await replicate.predictions.get(prediction.id);
    }

    if (result.status !== "succeeded" || !result.output) {
      console.error("Replicate Error:", result.error);
      return NextResponse.json(
        { error: "AI generation failed. Please try a different photo." },
        { status: 500 }
      );
    }

    const outputUrl = Array.isArray(result.output)
      ? result.output[0]
      : result.output;

    if (!outputUrl || typeof outputUrl !== "string") {
      return NextResponse.json(
        { error: "Empty result from model." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      output: outputUrl,
      status: "success"
    });
  } catch (error) {
    console.error("Route Error:", error);
    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
