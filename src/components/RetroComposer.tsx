"use client";

import { useState } from "react";
import { RetroComposer } from "./components/RetroComposer";

type Mode = "party" | "home" | "couple";

const VIBE_MAP: Record<Mode, "PARTY" | "HOME" | "COUPLE"> = {
  party: "PARTY",
  home: "HOME",
  couple: "COUPLE",
};

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("party");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Status: Ready…");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResultUrl(null);

    const localUrl = URL.createObjectURL(f);
    setPreviewUrl(localUrl);
  }

  function fileToDataUrl(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Invalid file reader result"));
      };
      reader.onerror = () => reject(reader.error || new Error("File read error"));
      reader.readAsDataURL(f);
    });
  }

  async function handleGenerate() {
    if (!file) {
      setStatus("Please upload a photo first.");
      return;
    }

    try {
      setIsLoading(true);
      setStatus("Generating your XMAS95 shot…");

      const dataUrl = await fileToDataUrl(file);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userImage: dataUrl,
          vibe: VIBE_MAP[mode],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus(err.error || "Generation failed.");
        setIsLoading(false);
        return;
      }

      const json = (await res.json()) as {
        status?: string;
        output?: string;
        vibe?: "PARTY" | "HOME" | "COUPLE";
      };

      if (!json.output) {
        setStatus("No output received from server.");
      } else {
        setResultUrl(json.output);
        setStatus("Status: Done. Your XMAS95 shot is ready ✨");
      }
    } catch (err: any) {
      setStatus(err?.message || "Unexpected error.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050509] text-neutral-100 flex flex-col">
      <header className="w-full border-b border-white/10 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-sm tracking-[0.25em] uppercase text-neutral-400">
            KASTO STUDIO
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/40">
            XMAS95
          </span>
        </div>
        <div className="text-xs text-neutral-400">
          Turn any selfie into a 1995 Christmas photo 🎄
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-6 px-4 md:px-8 py-6 max-w-6xl mx-auto w-full">
        {/* Left: Controls */}
        <section className="md:w-[38%] space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              XMAS95 Filter
            </h1>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
              Upload a photo, pick a mode and let the AI drop you into a 1995
              Christmas scene. Faces stay real, outfits and vibes go full retro.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.2em] text-neutral-400">
              1 · Upload photo
            </label>
            <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-neutral-600 rounded-xl px-4 py-6 cursor-pointer hover:border-neutral-300 transition-colors">
              <span className="text-sm">
                {file ? "Change photo" : "Click to upload"}
              </span>
              <span className="text-xs text-neutral-500">
                JPG / PNG · Face clearly visible
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.2em] text-neutral-400">
              2 · Choose mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["party", "home", "couple"] as Mode[]).map((m) => {
                const isActive = m === mode;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`text-xs rounded-lg px-3 py-2 border transition-all ${
                      isActive
                        ? "border-red-400 bg-red-500/10 text-red-100"
                        : "border-neutral-700 bg-neutral-900/60 text-neutral-300 hover:border-neutral-400"
                    }`}
                  >
                    {m === "party" && "PARTY"}
                    {m === "home" && "HOME"}
                    {m === "couple" && "COUPLE"}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-neutral-500">
              PARTY: 90s office Christmas flash shot · HOME: cozy living room ·
              COUPLE: romantic fireplace scene.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs uppercase tracking-[0.2em] text-neutral-400">
              3 · Generate
            </label>
            <button
              onClick={handleGenerate}
              disabled={isLoading || !file}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isLoading || !file
                  ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  : "bg-red-500 text-white hover:bg-red-400"
              }`}
            >
              {isLoading
                ? "Generating your XMAS95 scene…"
                : "Generate XMAS95 photo"}
            </button>
            <p className="text-[11px] text-neutral-500">{status}</p>
          </div>
        </section>

        {/* Right: Preview */}
        <section className="md:flex-1 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-[0.2em] text-neutral-400">
              Preview
            </span>
            <span className="text-[10px] text-neutral-500">
              4:5 · Ready for Instagram / TikTok
            </span>
          </div>

          <div className="relative w-full aspect-[4/5] max-h-[640px] rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 flex items-center justify-center">
            {resultUrl ? (
              <RetroComposer src={resultUrl} mode={mode} />
            ) : previewUrl ? (
              <RetroComposer src={previewUrl} mode={mode} />
            ) : (
              <div className="text-xs text-neutral-500 text-center px-6">
                Upload a photo and generate to see your XMAS95 frame here.
              </div>
            )}
          </div>

          {resultUrl && (
            <div className="flex gap-2 justify-end">
              <a
                href={resultUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-200 hover:border-neutral-400 transition-colors"
              >
                Open raw AI output
              </a>
              <button
                onClick={() => {
                  const canvas = document.getElementById(
                    "xmas95-canvas"
                  ) as HTMLCanvasElement | null;
                  if (!canvas) return;
                  const link = document.createElement("a");
                  link.download = "xmas95-photo.jpg";
                  link.href = canvas.toDataURL("image/jpeg", 0.95);
                  link.click();
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-950 hover:bg-white transition-colors"
              >
                Download framed XMAS95
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
