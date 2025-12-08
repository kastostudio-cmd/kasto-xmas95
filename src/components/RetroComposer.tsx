import { useEffect, useRef } from "react";

type Mode = "party" | "home" | "couple";

type RetroComposerProps = {
  src: string;
  mode: Mode;
};

export function RetroComposer({ src, mode }: RetroComposerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);

      const imgAspect = img.width / img.height;
      const canvasAspect = width / height;

      let drawWidth: number;
      let drawHeight: number;
      let dx: number;
      let dy: number;

      if (imgAspect > canvasAspect) {
        drawHeight = height;
        drawWidth = height * imgAspect;
        dx = (width - drawWidth) / 2;
        dy = 0;
      } else {
        drawWidth = width;
        drawHeight = width / imgAspect;
        dx = 0;
        dy = (height - drawHeight) / 2;
      }

      let brightness = 1.03;
      let contrast = 0.95;
      let saturate = 1.06;
      let warm = 0.18;
      let grain = 6;
      let vignette = 0.32;

      if (mode === "party") {
        brightness = 1.05;
        contrast = 0.97;
        saturate = 1.12;
        warm = 0.22;
        grain = 7;
        vignette = 0.3;
      } else if (mode === "home") {
        brightness = 1.02;
        contrast = 0.98;
        saturate = 1.06;
        warm = 0.21;
        grain = 5.5;
        vignette = 0.28;
      } else if (mode === "couple") {
        brightness = 0.98;
        contrast = 1.04;
        saturate = 1.04;
        warm = 0.24;
        grain = 5;
        vignette = 0.4;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
      ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
      ctx.filter = "none";

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.sqrt(cx * cx + cy * cy);

      for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);

        const dxCenter = x - cx;
        const dyCenter = y - cy;
        const dist = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);
        let factor = dist / maxRadius;
        if (factor < 0) factor = 0;
        if (factor > 1) factor = 1;

        const centerPreserve = 0.25;
        const edgeBoost = 1;
        const grainFactor =
          centerPreserve + (edgeBoost - centerPreserve) * factor;

        const g = (Math.random() - 0.5) * grain * grainFactor;
        data[i] = Math.min(255, Math.max(0, data[i] + g));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + g));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + g));
      }

      ctx.putImageData(imageData, 0, 0);

      ctx.globalCompositeOperation = "soft-light";
      ctx.fillStyle = `rgba(255, 208, 160, ${warm})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      const vign = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.45,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.9
      );
      vign.addColorStop(0, "rgba(0,0,0,0)");
      vign.addColorStop(1, `rgba(0,0,0,${vignette})`);
      ctx.fillStyle = vign;
      ctx.fillRect(0, 0, width, height);

      const leak = ctx.createLinearGradient(width * 0.65, 0, width, height);
      leak.addColorStop(0, "rgba(255,180,120,0)");
      leak.addColorStop(1, "rgba(255,120,80,0.35)");
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = leak;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      const framePadding = 18;
      const bottomExtra = 46;

      ctx.lineWidth = 14;
      ctx.strokeStyle = "rgba(250,245,240,0.95)";
      ctx.strokeRect(
        framePadding,
        framePadding,
        width - framePadding * 2,
        height - framePadding * 2
      );

      ctx.fillStyle = "rgba(250,245,240,0.96)";
      ctx.fillRect(
        framePadding + 4,
        height - bottomExtra - framePadding,
        width - (framePadding + 4) * 2,
        bottomExtra
      );

      let modeLabel = "PARTY '95";
      if (mode === "home") modeLabel = "HOME '95";
      if (mode === "couple") modeLabel = "COUPLE '95";

      ctx.font = "14px 'Courier New', monospace";
      ctx.fillStyle = "rgba(40,35,30,0.9)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        modeLabel,
        width / 2,
        height - bottomExtra - framePadding / 2
      );

      ctx.textAlign = "left";
      ctx.font = "12px 'Courier New', monospace";
      ctx.fillStyle = "rgba(90,80,70,0.9)";
      ctx.fillText(
        "kastostudio xmas '95",
        framePadding + 12,
        height - bottomExtra + 10
      );
    };

    img.src = src;
  }, [src, mode]);

  return (
    <canvas
      id="xmas95-canvas"
      ref={canvasRef}
      width={768}
      height={960}
      className="preview-image"
      style={{ width: "100%", height: "auto", display: "block" }}
    />
  );
}
