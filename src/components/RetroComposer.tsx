"use client";

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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = "rgb(248,246,238)";
      ctx.fillRect(0, 0, width, height);

      const marginTop = 36;
      const marginSides = 32;
      const marginBottom = 140;

      const photoWidth = width - marginSides * 2;
      const photoHeight = height - marginTop - marginBottom;

      ctx.save();
      ctx.beginPath();
      ctx.rect(marginSides, marginTop, photoWidth, photoHeight);
      ctx.clip();

      const imgAspect = img.width / img.height;
      const targetAspect = photoWidth / photoHeight;

      let drawWidth = photoWidth;
      let drawHeight = photoHeight;

      if (imgAspect > targetAspect) {
        drawHeight = photoHeight;
        drawWidth = photoHeight * imgAspect;
      } else {
        drawWidth = photoWidth;
        drawHeight = photoWidth / imgAspect;
      }

      const dx = marginSides + (photoWidth - drawWidth) / 2;
      const dy = marginTop + (photoHeight - drawHeight) / 2;

      ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

      const imgData = ctx.getImageData(
        marginSides,
        marginTop,
        photoWidth,
        photoHeight
      );
      const data = imgData.data;

      const rShift = mode === "party" ? 10 : mode === "home" ? 5 : 8;
      const gShift = mode === "party" ? -4 : mode === "home" ? 7 : 3;
      const bShift = mode === "party" ? -12 : mode === "home" ? -5 : 0;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + rShift));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + gShift));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + bShift));

        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i] * 0.82 + avg * 0.18;
        data[i + 1] = data[i + 1] * 0.82 + avg * 0.18;
        data[i + 2] = data[i + 2] * 0.82 + avg * 0.18;
      }

      ctx.putImageData(imgData, marginSides, marginTop);

      const offsetData = ctx.getImageData(
        marginSides,
        marginTop,
        photoWidth,
        photoHeight
      );
      const o = offsetData.data;
      const shift = 1;

      for (let y = 0; y < photoHeight; y++) {
        for (let x = 0; x < photoWidth; x++) {
          const idx = (y * photoWidth + x) * 4;
          const nx = Math.min(photoWidth - 1, Math.max(0, x + shift));
          const ny = Math.min(photoHeight - 1, Math.max(0, y - shift));
          const nIdx = (ny * photoWidth + nx) * 4;
          o[idx] = data[nIdx];
        }
      }

      ctx.globalAlpha = 0.4;
      ctx.putImageData(offsetData, marginSides, marginTop);
      ctx.globalAlpha = 1;

      const vignette = ctx.createRadialGradient(
        width / 2,
        marginTop + photoHeight / 2,
        Math.min(photoWidth, photoHeight) / 2.6,
        width / 2,
        marginTop + photoHeight / 2,
        Math.max(photoWidth, photoHeight) / 1.0
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.8)");
      ctx.fillStyle = vignette;
      ctx.fillRect(marginSides, marginTop, photoWidth, photoHeight);

      const grainDensity =
        mode === "party" ? 0.35 : mode === "home" ? 0.3 : 0.28;
      const grainCount = Math.floor(
        photoWidth * photoHeight * grainDensity * 0.005
      );
      for (let i = 0; i < grainCount; i++) {
        const gx = marginSides + Math.random() * photoWidth;
        const gy = marginTop + Math.random() * photoHeight;
        const alpha = 0.1 + Math.random() * 0.18;
        const gray = 120 + Math.random() * 100;
        ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, ${alpha})`;
        ctx.fillRect(gx, gy, 1, 1);
      }

      const leakWidth = width * 0.2;
      ctx.fillStyle =
        mode === "party"
          ? "rgba(255,120,80,0.32)"
          : mode === "home"
          ? "rgba(255,190,120,0.28)"
          : "rgba(255,140,180,0.30)";
      ctx.fillRect(width - leakWidth, 0, leakWidth, height);

      const scratchCount = 55;
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 0.8;
      for (let i = 0; i < scratchCount; i++) {
        const sx = marginSides + Math.random() * photoWidth;
        const sy = marginTop + Math.random() * photoHeight;
        const len = 10 + Math.random() * 50;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.random() * 5, sy + len);
        ctx.stroke();
      }

      ctx.restore();

      ctx.fillStyle = "rgb(248,246,238)";
      ctx.fillRect(0, 0, width, marginTop);
      ctx.fillRect(0, marginTop, marginSides, photoHeight);
      ctx.fillRect(
        marginSides + photoWidth,
        marginTop,
        marginSides,
        photoHeight
      );
      ctx.fillRect(0, marginTop + photoHeight, width, marginBottom);

      ctx.strokeStyle = "rgba(220,220,215,0.95)";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        marginSides + 1,
        marginTop + 1,
        photoWidth - 2,
        photoHeight - 2
      );

      const borderGrainCount = Math.floor(width * height * 0.003);
      for (let i = 0; i < borderGrainCount; i++) {
        const bx = Math.random() * width;
        const by = Math.random() * height;
        const alpha = 0.045 + Math.random() * 0.06;
        const gray = 210 + Math.random() * 35;
        ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, ${alpha})`;
        ctx.fillRect(bx, by, 1, 1);
      }
    };

    img.src = src;
  }, [src, mode]);

  return (
    <canvas
      ref={canvasRef}
      width={768}
      height={960}
      className="preview-image"
    />
  );
}
