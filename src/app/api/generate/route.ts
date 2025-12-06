import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const maxDuration = 60;
export const runtime = "nodejs";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

type Vibe = "PARTY" | "HOME" | "COUPLE";

function buildPrompt(vibe: Vibe) {
  // 🔥 YÜZ KORUMA - FLUX-DEV İÇİN OPTİMİZE EDİLMİŞ
  const facePreservation = 
    "Keep the person's face identical to the input photo. Same facial structure, same eyes, same nose, same mouth, same skin tone, same hair. Only change the background and clothing style to 1990s Christmas theme.";

  // 🎄 CHRISTMAS + POLAROID CORE
  const styleCore = 
    "1990s Christmas photograph shot on Polaroid camera with instant film. Warm cozy holiday atmosphere with Christmas decorations visible. Vintage 90s fashion and hairstyle. Soft focus, film grain, warm color temperature, slight overexposure, nostalgic feeling.";

  if (vibe === "PARTY") {
    return `${facePreservation}

Scene: The person is at a 1990s office Christmas party. They are wearing a festive 90s sweater (chunky knit, holiday pattern, or solid festive color like red or green). 

Christmas elements in background: blurred Christmas lights, tinsel decorations on walls, other party guests in soft focus, paper cups, holiday decorations everywhere.

Photo style: Taken with a Polaroid instant camera in 1995. Flash photography with warm tungsten lighting. Soft focus, visible film grain, warm golden tones, slight blur, candid party snapshot feeling. The photo looks aged and nostalgic like a real photo from a 90s Christmas party.

${styleCore}`;
  }

  if (vibe === "HOME") {
    return `${facePreservation}

Scene: The person is sitting at home on Christmas Eve in 1995. They are wearing cozy 90s loungewear (oversized knit sweater in warm colors, or vintage Christmas sweater).

Christmas elements prominently visible: Large decorated Christmas tree with colorful lights and ornaments taking up significant portion of background, wrapped presents under the tree, warm living room setting, cozy carpet or vintage couch, soft lamp lighting.

Photo style: Taken with a Polaroid instant camera in 1995. Warm intimate home photography with natural and lamp lighting mixed with tree lights. Soft focus, heavy film grain, warm orange and yellow tones from tungsten bulbs and Christmas tree lights, slightly faded colors, nostalgic family photo album feeling.

${styleCore}`;
  }

  // COUPLE
  return `${facePreservation}

Scene: A romantic couples photo from 1995 Christmas. The person from the input photo is in the image with a romantic partner beside them, both wearing festive 90s holiday outfits (matching or coordinating Christmas sweaters).

Christmas elements prominently visible: Beautiful bokeh from out-of-focus Christmas tree lights in background creating large soft circles of light in red, green, yellow, blue colors. Mistletoe visible above. Warm romantic holiday party or home setting.

Photo style: Taken with a Polaroid instant camera in 1995. Classic couples portrait with flash. Soft focus on subjects, dreamy bokeh background from Christmas lights, warm tones, film grain, slightly overexposed, romantic and nostalgic feeling like a treasured holiday memory.

${styleCore}`;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const body = await req.json();
    const { userImage, vibe } = body as { userImage?: string; vibe?: Vibe };

    if (!userImage || !vibe) {
      return NextResponse.json({ error: "Missing image or vibe mode." }, { status: 400 });
    }

    // 🎯 YENİ STRATEJI: Daha düşük prompt_strength = Daha fazla yüz koruma
    const input = {
      prompt: buildPrompt(vibe),
      image: userImage,
      
      // 🔥 KRİTİK: Yüz koruma için optimize
      prompt_strength: 0.45, // DAHA DÜŞÜK = yüz daha iyi korunur
      num_inference_steps: 35, // Daha fazla adım = daha iyi kalite
      guidance_scale: 2.8, // Daha düşük = daha fazla input image'e sadık kalır
      
      megapixels: "1",
      go_fast: true,
      output_format: "jpg",
      output_quality: 95,
      aspect_ratio: "4:5",
      disable_safety_checker: false,
      
      // 🚫 GÜÇLÜ NEGATIVE PROMPT
      negative_prompt: "different face, different person, face swap, new face, altered facial features, modern style, 2000s, 2010s, 2020s, contemporary, HD photography, professional studio, no Christmas decorations, no holiday theme, summer, spring, beach, outdoor daylight, cartoon, anime, 3d render, illustration, deformed, distorted, bad quality"
    };

    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-dev",
      input,
    });

    let result = await replicate.predictions.get(prediction.id);
    const startedAt = Date.now();
    let pollCount = 0;
    const timeoutMs = 55000;

    while (["starting", "processing", "queued"].includes(result.status)) {
      if (Date.now() - startedAt > timeoutMs) {
        await replicate.predictions.cancel(prediction.id).catch(() => {});
        return NextResponse.json(
          { error: "Generation timed out. Please try again!" },
          { status: 504 }
        );
      }

      const waitTime = Math.min(400 * Math.pow(2, pollCount), 2000);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      
      pollCount++;
      result = await replicate.predictions.get(prediction.id);
    }

    if (result.status !== "succeeded" || !result.output) {
      console.error("Generation failed:", result.error);
      return NextResponse.json(
        { error: "Generation failed. Try a different photo!" },
        { status: 500 }
      );
    }

    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;

    return NextResponse.json({
      status: "success",
      output: outputUrl,
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
