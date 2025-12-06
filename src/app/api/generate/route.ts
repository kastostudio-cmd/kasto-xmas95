import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || ""
});

export async function POST(req: Request) {
  const { imageMan, imageWoman, scene } = await req.json();

  // Retro / Polaroid efekt komutu
  const retroFx = `
    vintage film color, slight grain,
    soft vignette, low contrast,
    soft bokeh lights, polaroid frame style,
    slight analog blur but KEEP FACE SHARP
  `;

  const promptParty = `
    Single person Christmas retro portrait.
    Keep the face exactly like the input.
    Keep hair style, hair length, facial structure.
    DO NOT change age.
    DO NOT change hair color.
    Apply ${retroFx}.
    Background: Christmas lights, vintage colors.
  `;

  const promptHome = `
    Cozy Christmas living room, retro film look.
    One person sitting near tree.
    Keep identity EXACT.
    KEEP HAIR exactly same.
    Apply ${retroFx}.
  `;

  const promptCouple = `
    Christmas cozy retro couple portrait.
    Use the FIRST face ONLY for the man.
    Use the SECOND face ONLY for the woman.
    DO NOT merge or blend faces.
    Preserve identity, hairstyle, age, and skin tone.
    Apply ${retroFx}.
  `;

  const finalPrompt =
    scene === "party" ? promptParty :
    scene === "home" ? promptHome :
    promptCouple;

  const result = await replicate.run(
    "fofr/face-to-image:latest",
    {
      input: {
        image: imageMan,
        image2: imageWoman || undefined,
        prompt: finalPrompt
      }
    }
  );

  return NextResponse.json({ url: result });
}
