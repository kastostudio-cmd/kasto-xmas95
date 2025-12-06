import { NextResponse } from "next/server";

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";

type GenerateRequestBody = {
  userImage: string;
  vibe: "PARTY" | "HOME" | "COUPLE";
};

function buildPrompt(vibe: "PARTY" | "HOME" | "COUPLE") {
  const identity =
    "The generated person must look exactly like the person in the input image. Preserve identity, age, gender, face shape, skin tone, eyes, nose, mouth and hairstyle. Do not change the person, do not make a new character. Keep the face and hair as similar as possible.";

  const filmBase =
    "1995 Christmas photograph, 35mm film scan, disposable camera flash, visible film grain, slight blur, polaroid style border, soft focus, analog look, not HDR, not digital phone camera.";

  if (vibe === "PARTY") {
    return [
      filmBase,
      "crowded office Christmas party, subject close to camera, background full of coworkers, fluorescent office lights, tinsel decorations, ugly Christmas sweaters, shallow depth of field.",
      identity
    ].join(" ");
  }

  if (vibe === "COUPLE") {
    return [
      filmBase,
      "romantic Christmas party scene with two people in the frame, warm fairy lights and garlands in the background, cozy intimate feeling, subtle glow.",
      identity
    ].join(" ");
  }

  return [
    filmBase,
    "cozy 1995 family living room, real Christmas tree with multicolored lights, CRT television, patterned carpet, framed photos on the wall, gifts under the tree, warm tungsten lighting.",
    identity
  ].join(" ");
}

async function createPrediction(body: GenerateRequestBody, token: string) {
  const prompt = buildPrompt(body.vibe);

  const res = await fetch(REPLICATE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      version:
        "43d309c37ab4e62361e5e29b8e9e867fb2dcbcec77ae91206a8d95ac5dd451a0",
      input: {
        width: 768,
        height: 960,
        prompt,
        main_face_image: body.userImage,
        negative_prompt:
          "cartoon, anime, painting, illustration, deformed face, extra eyes, extra nose, multiple faces, wrong anatomy, low quality, text, watermark",
        num_outputs: 1,
        guidance_scale: 6.5,
        num_inference_steps: 28,
        id_weight: 1.6,
        true_cfg: 1.4
      }
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate create error: ${res.status} ${text}`);
  }

  return res.json() as Promise<{ id: string }>;
}

async function waitForPrediction(id: string, token: string) {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${REPLICATE_API_URL}/${id}`, {
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Replicate get error: ${res.status} ${text}`);
    }

    const data = (await res.json()) as {
      status: string;
      output?: string[] | string | null;
      error?: unknown;
    };

    if (data.status === "succeeded") {
      return data.output ?? null;
    }

    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Replicate failed with status ${data.status}`);
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  throw new Error("Replicate timeout");
}

export async function POST(req: Request) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Missing REPLICATE_API_TOKEN on server" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as GenerateRequestBody;

    if (!body.userImage) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    const prediction = await createPrediction(body, token);
    const rawOutput = await waitForPrediction(prediction.id, token);

    let imageUrl: string | null = null;

    if (Array.isArray(rawOutput) && rawOutput.length > 0) {
      imageUrl = String(rawOutput[0]);
    } else if (typeof rawOutput === "string") {
      imageUrl = rawOutput;
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({ output: imageUrl });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
