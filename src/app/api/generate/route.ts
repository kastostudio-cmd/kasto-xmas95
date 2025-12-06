import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const maxDuration = 60;
export const runtime = "nodejs";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

type Vibe = "PARTY" | "HOME" | "COUPLE";

// 🎯 VIRAL-GRADE PROMPTS: Meitu/Fotorama seviyesi
function buildPrompt(vibe: Vibe) {
  // ⚡ FACE PRESERVATION - EN GÜÇLÜ VERSİYON
  const identityLock =
    "CRITICAL INSTRUCTION: This is a style transfer task, NOT a face generation task. You must use the EXACT person from the input image as a reference. Lock and preserve: facial identity, bone structure, eye color and shape, eyebrow shape and position, nose bridge and tip, lip shape and size, chin shape, jawline, cheekbones, skin tone, facial proportions, hair color, hair texture, hair length, hairline, hair parting direction. DO NOT generate a new face. DO NOT alter facial features. DO NOT change the person's appearance. The output must be the same recognizable person in a different setting and style. Identity preservation is more important than style accuracy.";

  // 📸 PREMIUM POLAROID SIMULATION
  const polaroidTech =
    "Technical specifications for authentic 1995 Polaroid 600 camera: Kodak Gold 200 or Fujifilm Superia 400 35mm film characteristics. Optical properties: fixed focal length 106mm equivalent, f/8-f/11 aperture creating natural depth of field, built-in electronic flash producing hard directional light from 3 feet distance. Film grain: visible chromatic grain pattern with slight color shift in shadows (magenta-green), midtones warm (yellow-orange bias from tungsten lighting), highlights slightly blown with halation glow. Lens aberration: soft corners, mild barrel distortion, dreamy soft focus on edges while center stays relatively sharp. Exposure: slight overexposure by 1/3 stop, crushed blacks, glowing highlights. Color science: muted saturation, warm color temperature 3200K-3800K, faded appearance as if photo aged 30 years. Physical artifacts: natural vignetting, subtle light leaks on borders, finger smudge on bottom corner, date stamp possibility.";

  // 🎨 COMPOSITION & ATMOSPHERE
  const shootingStyle =
    "Amateur photographer aesthetic: slightly off-center subject placement following rule of thirds loosely, candid unposed moment, subject caught mid-expression or mid-movement, natural relaxed body language, authentic emotion not forced smile. Camera handling: handheld shake creating 1-2 pixel motion blur, slight dutch angle tilt (2-3 degrees), photographer at eye level or slightly below. Flash photography: direct flash creating catchlights in eyes, subtle red-eye effect acceptable, harsh front lighting with soft fall-off, background underexposed by 1 stop. Environmental storytelling: every background element tells the 1995 Christmas story.";

  if (vibe === "PARTY") {
    return `${identityLock}

SCENE: 1995 Office Christmas Party - Friday evening, 7:30 PM.

SUBJECT PLACEMENT: The person from the input image is positioned in the mid-foreground, occupying 60% of frame height. They are standing or sitting casually, body turned 25 degrees from camera, face toward lens with genuine happy expression - the "I'm having fun" look with slight squint from laughing.

WARDROBE: 90s holiday casual - oversized cable knit sweater in festive colors (forest green, burgundy, or cream with Fair Isle pattern), OR button-up flannel shirt, OR company-issued holiday vest over white turtleneck. Clothing should have realistic fabric texture and natural wrinkles.

BACKGROUND DEPTH & DETAIL: 
- Immediate background (5 feet): Blurred office coworkers in similar 90s attire, plastic red cups in hands, someone mid-laugh with mouth open
- Mid background (10 feet): Folding tables with holiday food (cheese cubes, crackers, veggie tray), cheap metallic tinsel garland taped to walls in swooping pattern
- Far background (15+ feet): Fluorescent office ceiling lights mixed with multicolor Christmas string lights, cubicle walls visible, "HAPPY HOLIDAYS" banner, someone wearing a Santa hat
- Depth cues: Background progressively blurred, atmospheric haze from flash fall-off

LIGHTING: Single point source flash from camera position. Flash characteristics: harsh specular highlights on foreground subject's face and shoulders, dark shadows under chin, background receives 40% less light creating natural separation. Color temperature: warm tungsten ambient (2800K) mixed with cool flash (5500K) creating that signature 90s color clash. Practical lights: Christmas string lights in background creating small bokeh circles (defocused) in yellow, red, green, blue.

MOOD: Chaotic holiday joy. Energy level: 7/10. Sound implied: multiple conversations, background music, laughter. The photo captures that "peak party moment" feeling.

${polaroidTech} ${shootingStyle}

FINAL STYLE DIRECTIVE: This should look like a real photograph pulled from a 1995 office Christmas party disposable camera roll. Not a recreation, not a costume - a genuine moment frozen in time. Think: authentic, raw, imperfect, nostalgic, joyful. The kind of photo you'd find in an old shoebox that makes you smile.`;
  }

  if (vibe === "HOME") {
    return `${identityLock}

SCENE: 1995 Christmas Eve at Home - 8:00 PM, family living room.

SUBJECT PLACEMENT: The person from the input image is seated on floor or couch in lower-center frame, occupying 50-55% of frame height. Relaxed posture: legs crossed or tucked, leaning back slightly, one arm resting naturally. Face has soft peaceful smile - the "content at home" expression with warm eyes.

WARDROBE: Cozy 90s loungewear - oversized knit cardigan or pullover sweater in solid warm tones (burgundy, forest green, oatmeal), OR vintage Christmas sweatshirt with puff paint design, OR flannel pajama top. Fabric appears soft and lived-in, realistic textile draping.

BACKGROUND DEPTH & DETAIL:
- Immediate background (3 feet): Large decorated Christmas tree dominating right or left third of frame - 6-7 feet tall, full shape, mix of colorful glass ball ornaments and homemade decorations, dense tinsel strands, multicolor incandescent lights (C7 bulbs), tree topper star
- Mid background (8 feet): Wrapped presents stacked under tree with visible wrapping paper patterns (snowflakes, candy canes, Santa prints), CRT television set on entertainment center showing soft glow, VCR on shelf below
- Far background (12+ feet): Wood paneling or floral wallpaper (dusty rose or beige pattern), framed family photos on walls, table lamp with warm yellow shade, doorway to darkened hallway
- Floor: Patterned carpet in burgundy or beige with 90s geometric design, or hardwood with area rug

LIGHTING: Single flash from camera 6 feet away. Flash creates: bright even illumination on subject, Christmas tree lights visible as bright spots with star-filter effect, soft ambient glow from TV and lamps mixing with flash. Color palette: warm golden glow from tree lights, yellow from tungsten lamps, cooler flash on subject creating skin tone balance. Tree lights creating subtle lens flares and practical bokeh when slightly out of focus.

MOOD: Peaceful intimate warmth. Energy level: 3/10 (calm, quiet, reflective). This is the "quiet moment before bed on Christmas Eve" feeling. Implies: family sleeping, soft music or silence, anticipation of tomorrow morning.

${polaroidTech} ${shootingStyle}

FINAL STYLE DIRECTIVE: This should look like a treasured family photo album memory - the kind grandparents keep in a leather-bound album and show guests. Not staged, not professional - just a beautiful quiet moment someone wanted to remember. Authentic domestic intimacy, captured with love. The photo quality says "amateur" but the emotion says "priceless memory."`;
  }

  // COUPLE
  return `${identityLock}

SCENE: 1995 Romantic Christmas Couples Portrait - Holiday party or family gathering, 9:00 PM.

SUBJECT PLACEMENT: Two people in frame - the person from the input image positioned in left-center or right-center occupying 45% of frame width, second person (romantic partner) occupying remaining 40%. Small overlap where they're touching. Both facing camera at slight 15-degree angles toward each other. Distance between faces: 8-12 inches apart, creating intimate but not cramped composition.

INTERACTION & POSING: Natural couple posture - arms around each other's waists or shoulders, bodies angled toward each other while faces toward camera, slight lean-in suggesting affection. The input person maintains EXACT facial features and identity. Partner should be distinctly different person with own features, complementary height/build, wearing coordinating but not matching holiday outfit.

WARDROBE: 90s holiday couple coordination - both in festive sweaters (matching ugly Christmas sweaters acceptable and period-accurate), OR dressy-casual (button-up shirts, nice knits), OR one in sweater one in blouse/shirt. Realistic fabric texture, natural fit, slight wrinkles at elbows and waist from sitting/posing.

FACIAL EXPRESSIONS: Both people showing genuine affection - soft smiles, eyes with warmth (the "looking at camera but thinking about each other" expression), relaxed happy faces. The input person's identity must be perfectly preserved - same face, just happy and in love.

BACKGROUND DEPTH & DETAIL:
- Immediate background (4 feet): Christmas tree out of focus creating beautiful bokeh - tree lights become large soft circles in green, red, yellow, blue (sizes varying 20-40 pixels diameter), magical dreamy effect
- Mid background (8 feet): Soft suggestion of indoor holiday party or living room - blurred warm interior, hint of other people or furniture as soft color masses, garland or decorations as soft shapes
- Far background (12+ feet): Complete blur into warm amber/golden glow, possibly doorway or window as lighter rectangle shape, creating depth and atmosphere
- Above subjects: Visible mistletoe or holiday decoration in sharp focus hanging at top of frame (optional but thematic)

LIGHTING: Single flash 5-6 feet from subjects at slight angle. Creates: even illumination across both faces with natural shadows, catchlights in all four eyes creating "sparkle", soft shadows where bodies overlap. Background receives less light (underexposed 1.5 stops) making tree bokeh glow appear more prominent. Color: warm tungsten ambient mixing with flash, golden hour indoor feeling, slight color bleed from tree lights onto subjects' shoulders (green/red color cast on edges).

MOOD: Romantic warmth and new love. Energy: 5/10 (present and connected, not hyper). This captures "our first Christmas together" or "this is the year we knew" energy. Implies: stolen moment at family gathering, photo someone insisted they take, memory they'll treasure forever.

${polaroidTech} ${shootingStyle}

FINAL STYLE DIRECTIVE: This should look like THE romantic Christmas photo every couple has from the 90s - the one that ends up framed on mantles and in wallets. Not cheesy, not overly posed - just two people genuinely in love during the holidays, captured by someone who cared enough to take a good photo. Think: relationship milestone, treasured memory, authentic emotion. The kind of photo that makes people say "aww" 30 years later. Critical: The input person's face must be perfectly recognizable while their partner is a distinct separate individual.`;
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

    // 🚀 VIRAL-OPTIMIZED PARAMETERS
    const input = {
      prompt: buildPrompt(vibe),
      image: userImage,
      
      // 🎯 IDENTITY PRESERVATION MAXIMUM
      prompt_strength: 0.55, // Lower = stronger face preservation (0.55 is sweet spot)
      
      // 🎨 QUALITY & STYLE BALANCE  
      num_inference_steps: 32, // Higher = better quality & detail
      guidance_scale: 3.2, // Balanced creative freedom + prompt adherence
      
      // 📱 VIRAL OPTIMIZATION
      megapixels: "1", // Fast generation, perfect for social media
      output_format: "jpg",
      output_quality: 95, // Premium quality for sharing
      aspect_ratio: "4:5", // Instagram/TikTok optimal ratio
      
      // ⚡ PERFORMANCE
      go_fast: true, // Speed mode enabled
      disable_safety_checker: false,
      
      // 🚫 NEGATIVE PROMPTING - Critical for photo realism
      negative_prompt: "cartoon, anime, illustration, 3d render, cgi, digital art, painting, drawing, sketch, artificial, fake, plastic, doll-like, smooth skin, airbrushed, unrealistic, distorted face, deformed features, wrong anatomy, extra limbs, extra fingers, mutated hands, bad proportions, blurry face, duplicate faces, multiple people in single-person scene, modern clothing, modern technology, smartphones, digital cameras, contemporary fashion, 2000s style, 2010s style, 2020s style, HD quality, 4K, crystal clear, professional photography, studio lighting, ring light, perfect lighting"
    };

    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-dev",
      input,
    });

    let result = await replicate.predictions.get(prediction.id);
    const startedAt = Date.now();
    let pollCount = 0;
    const timeoutMs = 55000;

    // Smart exponential backoff polling
    while (["starting", "processing", "queued"].includes(result.status)) {
      if (Date.now() - startedAt > timeoutMs) {
        await replicate.predictions.cancel(prediction.id).catch(() => {});
        return NextResponse.json(
          { error: "Generation timed out. Please try again!" },
          { status: 504 }
        );
      }

      // Exponential backoff: 400ms → 800ms → 1600ms → 2000ms (max)
      const waitTime = Math.min(400 * Math.pow(2, pollCount), 2000);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      
      pollCount++;
      result = await replicate.predictions.get(prediction.id);
    }

    if (result.status !== "succeeded" || !result.output) {
      console.error("Generation failed:", result.error);
      return NextResponse.json(
        { error: "Generation failed. Try a different photo with clear face!" },
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
