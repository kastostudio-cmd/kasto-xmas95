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
      "The person must look as close as possible to the input photo. Preserve identity, age, gender, face shape, bone structure, eyes, nose, lips, jawline, ears, skin tone, hair color, haircut and hairline. Do not change the hair length or general hairstyle. Do not change teeth shape or size. No beauty filter, no makeup change, no plastic surgery.";

    const vintageBase =
      "photograph from Christmas 1995 shot on cheap 35mm film, slightly soft focus, visible film grain, mild halation around lights, low contrast, slightly faded colors, not HDR, not digital, not modern smartphone, candid snapshot, flash photography.";

    let prompt: string;

    if (vibe === "PARTY") {
      prompt = [
        identity,
        vintageBase,
        "office Christmas party background, desks, office chairs, tinsel and hanging string lights, plastic cups, paper plates, coworkers in the distance as soft silhouettes, shallow depth of field, subject at the front and center looking at the camera, wearing a casual mid-90s office party outfit such as a patterned sweater or loose shirt with sleeves rolled up. Clothing style must vary naturally between generations, not the same outfit every time.",
      ].join(" ");
    } else if (vibe === "COUPLE") {
      prompt = [
        identity,
        vintageBase,
        "warm Christmas bar or cafe interior background with fairy lights, candles, wooden tables and red and green decorations, shallow depth of field, subject framed waist-up as if a friend took a candid photo inside a 1995 bar. Clothing should look like casual mid-90s nightlife fashion: shirts, knitwear, jackets, natural variety in colors and textures, not always red sweaters.",
      ].join(" ");
    } else {
      prompt = [
        identity,
        vintageBase,
        "1995 family living room on Christmas Eve, real Christmas tree with multicolored lights behind the subject, CRT television, old wooden furniture, patterned carpet, framed family photos, warm tungsten lighting, subject sitting or standing comfortably in front of the tree, wearing a typical mid-90s home outfit such as a simple sweater, turtleneck or long-sleeve top with natural color variety, not forced red only clothing.",
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
          "cartoon, anime, painting, illustration, deformed face, ugly teeth, extra eyes, extra nose, multiple faces, wrong anatomy, low quality, text, watermark, logo, signature, airbrushed skin, overly smooth skin, glossy beauty ad, heavy makeup, fashion editorial, studio portrait",
        num_outputs: 1,
        guidance_scale: 4.0,
        num_inference_steps: 24,
        id_weight: 1.8,
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
      result = await replicate.predictions.get(prediction.id);
    }

    if (result.status !== "succeeded") {
      return NextResponse.json(
        { error: "Generation failed." },
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
        { error: "No image generated." },
        { status: 500 }
      );
    }

    return NextResponse.json({ output: imageUrl });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Generation failed." },
      { status: 500 }
    );
  }
}
