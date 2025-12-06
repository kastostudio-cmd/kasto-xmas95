import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userImage, vibe } = body;

    let prompt = "";
    let negativePrompt = "deformed face, distorted face, extra people, duplicate body, distorted hair, bad anatomy, blurry face, morphed features, wrong face, different person, multiple people";

    const identityLock = "Exact same face, same hairstyle, same facial features, no morphing, preserve identity perfectly.";
    const vintageStyle = "Shot on Kodak Gold 200 disposable camera, 1995 aesthetic, warm film tones, subtle film grain, soft flash lighting, slight light leak, vintage color grading, nostalgic atmosphere";

    if (vibe === "PARTY") {
      prompt = `${identityLock} Single person only, one person, solo portrait. Christmas office party in 1995, fluorescent office lighting with camera flash, wearing festive clothing, tinsel and decorations in blurred background, coworkers blurred in far background. ${vintageStyle}`;
      negativePrompt += ", crowd in foreground, multiple faces";
    } else if (vibe === "COUPLE") {
      prompt = `${identityLock} Exactly two people, romantic couple portrait. Cozy Christmas setting in 1995, warm intimate lighting, Christmas tree bokeh lights in background, romantic atmosphere, close together. ${vintageStyle}`;
      negativePrompt += ", single person, extra people, third person";
    } else {
      prompt = `${identityLock} Single person only, one person, solo portrait. Cozy home Christmas Eve in 1995, warm tungsten living room lighting, Christmas tree glow, comfortable home setting, relaxed pose. ${vintageStyle}`;
      negativePrompt += ", crowd, multiple faces, family group";
    }

    console.log("Generating with prompt:", prompt);

    const prediction = await replicate.predictions.create({
      version: "43d309c37ab4e62361e5e29b8e9e867fb2dcbcec77ae91206a8d95ac5dd451a0",
      input: {
        width: 768,
        height: 960,
        prompt: prompt,
        negative_prompt: negativePrompt,
        main_face_image: userImage,
        num_outputs: 1,
        guidance_scale: 4,
        num_inference_steps: 28,
        id_weight: 0.9,
        true_cfg: 1.5
      }
    });

    let result = await replicate.predictions.get(prediction.id);
    
    while (result.status !== "succeeded" && result.status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      result = await replicate.predictions.get(prediction.id);
      console.log("Status:", result.status);
    }

    if (result.status === "failed") {
      console.log("Failed:", result.error);
      return NextResponse.json({ error: "Generation failed: " + result.error }, { status: 500 });
    }

    console.log("Result:", result.output);

    let imageUrl = null;
    if (Array.isArray(result.output) && result.output.length > 0) {
      imageUrl = result.output[0];
    } else if (typeof result.output === 'string') {
      imageUrl = result.output;
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    return NextResponse.json({ output: imageUrl });

  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
