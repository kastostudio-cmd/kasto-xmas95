import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = "nodejs";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || ""
});

type Vibe = "PARTY" | "HOME" | "COUPLE";

function buildPrompt(vibe: Vibe) {
  const base =
    "photograph of the same person from the reference photo, 1990s christmas style, warm tungsten lights, soft lens, vintage film look, subtle blur, polaroid feel, film grain, cozy atmosphere, christmas tree with lights in the background, realistic photo, 4:5 portrait";

  if (vibe === "PARTY") {
    return (
      base +
      ", single person only, office christmas party background, other people very softly blurred far behind, upper body framed, subject in the center, ugly christmas sweater or festive knit, no extra faces next to the subject"
    );
  }

  if (vibe === "HOME") {
    return (
      base +
      ", single person only, home living room with christmas tree, sitting on sofa or armchair, no other people in the frame, cozy home interior, presents around the tree"
    );
  }

  return (
    base +
    ", two distinct people from the reference photo, man and woman side by side, shoulders touching, both clearly visible, romantic christmas evening, warm lights, bokeh, do not merge or duplicate faces"
  );
}

const negativePrompt =
  "cartoon, illustration, painting, anime, deformed face, distorted eyes, plastic skin, heavy retouch, glamour studio, extra people, strangers, duplicated face, merged faces, big age change, big weight change, changed jawline, changed nose, changed lips, changed teeth, different hairstyle, different hair color, short hair instead of long, bangs if not in original, hat, glasses unless already present, low quality, noisy jpeg";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const userImage = body?.userImage as string | undefined;
    const vibe = body?.vibe as Vibe | undefined;

    if (!userImage || !vibe) {
      return NextResponse.json(
        { error: "Missing image or mode." },
        { status: 400 }
      );
    }

    const input = {
      prompt: buildPrompt(vibe),
      negative_prompt: negativePrompt,
      image: userImage,
      strength: 0.42,
      guidance_scale: 3.5,
      num_inference_steps: 26,
      output_quality: 95,
      aspect_ratio: "4:5"
    };

    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-1.1-pro",
      input
    });

    let result = await replicate.predictions.get(prediction.id);

    const startedAt = Date.now();
    const timeoutMs = 60_000;

    while (
      ["starting", "processing", "queued"].includes(result.status as string)
    ) {
      if (Date.now() - startedAt > timeoutMs) {
        return NextResponse.json(
          { error: "Generation timed out. Please try again." },
          { status: 504 }
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      result = await replicate.predictions.get(prediction.id);
    }

    if (result.status !== "succeeded") {
      return NextResponse.json(
        { error: "Generation failed. Please try again." },
        { status: 500 }
      );
    }

    const out = Array.isArray(result.output) ? result.output[0] : result.output;

    if (!out || typeof out !== "string") {
      return NextResponse.json(
        { error: "Empty image result from server." },
        { status: 500 }
      );
    }

    return NextResponse.json({ output: out });
  } catch (error) {
    console.error("Xmas95 /api/generate error:", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
