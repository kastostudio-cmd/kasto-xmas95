import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const maxDuration = 60;
export const runtime = "nodejs";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

type Vibe = "PARTY" | "HOME" | "COUPLE";

function buildPrompt(vibe: Vibe) {
  const facePreservation =
    "IMPORTANT: Use the exact same person from the input image. Preserve facial features, bone structure, eye shape, nose, lips, teeth, eyebrows, skin tone, hair color, hair length, hair parting, and hairstyle exactly as shown. Do not change ethnicity, age, gender, or identity. The person must be instantly recognizable.";

  const filmAesthetic =
    "Authentic 1990s Christmas Polaroid photograph shot on Kodak Gold 400. Soft focus with slight blur, visible film grain, warm yellow-orange tungsten color cast, subtle vignette, gentle overexposure on highlights, direct flash creating small specular highlights, cozy and nostalgic atmosphere.";

  const technicalDetails =
    "Single on-camera flash, shallow depth of field, slightly off-center amateur framing, handheld camera feeling, natural red-eye allowed, realistic 35mm film texture, no digital artifacts.";

  if (vibe === "PARTY") {
    return `${facePreservation}

Transform this into a 1995 office Christmas party portrait. The person is in the foreground as a single subject, wearing a festive but casual 90s holiday outfit such as a patterned knit sweater or red flannel shirt. Background shows a crowded office party scene: blurred coworkers, cheap metallic tinsel, plastic cups, paper plates with snacks, and colorful Christmas string lights hanging from the ceiling. Expression is relaxed, happy, slightly excited, like a candid snapshot taken mid-conversation. The environment feels noisy, social, and fun.

${filmAesthetic} ${technicalDetails}

Style: disposable camera flash photo from a real 1990s office Christmas party, captured as a candid moment.`;
  }

  if (vibe === "HOME") {
    return `${facePreservation}

Transform this into a cozy 1995 Christmas Eve at home. The person is alone in the frame, sitting comfortably on a vintage patterned couch or on a carpet in front of a decorated Christmas tree. Background shows a warm living room: large Christmas tree with colorful lights and ornaments, wrapped gifts on the floor, maybe a CRT television, wood furniture, framed family photos, and soft lamps. Outfit is comfortable 90s loungewear such as an oversized knit sweater or simple long-sleeve top. Expression is gentle, warm, calm, like a quiet intimate holiday moment at home.

${filmAesthetic} ${technicalDetails}

Style: treasured family album Polaroid from Christmas 1995, intimate and nostalgic.`;
  }

  return `${facePreservation}

Transform this into a romantic 1995 Christmas couples portrait. Two people are in the frame, sitting close together or slightly cheek-to-cheek, with affectionate body language. Use the input person as one member of the couple and keep their identity exactly the same. The other person appears as a distinct partner next to them. Background shows soft bokeh from out-of-focus Christmas tree lights, warm indoor holiday decorations, and a subtle hint of mistletoe or garlands. Both wear festive 90s holiday outfits like knit sweaters or simple dressy tops. Expressions are loving, relaxed, and happy, as if posing for their first Christmas photo together.

${filmAesthetic} ${technicalDetails}

Style: romantic Christmas Polaroid from 1995, soft, warm, and nostalgic.`;
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

    const input = {
      prompt: buildPrompt(vibe),
      image: userImage,
      prompt_strength: 0.60,
      num_inference_steps: 28,
      guidance_scale: 3.0,
      megapixels: "1",
      go_fast: true,
      output_format: "jpg",
      output_quality: 90,
      disable_safety_checker: false,
      negative_prompt: "cartoon, illustration, anime, 3d render, painting, deformed, distorted, disfigured, bad quality, low quality, jpeg artifacts, extra limbs, extra fingers"
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
          { error: "Generation timed out due to high traffic." },
          { status: 504 }
        );
      }

      const waitTime = Math.min(500 * Math.pow(2, pollCount), 2000);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      
      pollCount++;
      result = await replicate.predictions.get(prediction.id);
    }

    if (result.status !== "succeeded" || !result.output) {
      return NextResponse.json(
        { error: "AI generation failed. Please try a clear photo." },
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
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
