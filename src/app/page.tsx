"use client";

import { useState } from "react";
import { RetroComposer } from "../components/RetroComposer";

const UNLOCK_CODE = "XMAS95";
const TURKEY_URL = "https://iyzi.link/AKYrkg";
const GLOBAL_URL = "https://kasto.gumroad.com/l/xmas95";

export default function Home() {
  const [selectedMode, setSelectedMode] = useState<"party" | "home" | "couple">(
    "party"
  );
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("Status: Ready…");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [showShareHint, setShowShareHint] = useState(false);

  function setStatusMessage(
    message: string,
    opts?: { error?: boolean; loading?: boolean }
  ) {
    setStatus(message);
    setIsError(Boolean(opts?.error));
    setIsLoading(Boolean(opts?.loading));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      setOutputUrl(null);
      return;
    }
    setFile(f);
    const localUrl = URL.createObjectURL(f);
    setPreviewUrl(localUrl);
    setOutputUrl(null);
    setUnlocked(false);
    setShowShareHint(false);
    setCodeInput("");
    setStatusMessage("Status: Photo loaded. Ready to generate.");
  }

  function handleVibeClick(mode: "party" | "home" | "couple") {
    setSelectedMode(mode);
    if (mode === "party") {
      setStatusMessage("Status: Mode set to Party '95.");
    } else if (mode === "home") {
      setStatusMessage("Status: Mode set to Home '95.");
    } else {
      setStatusMessage("Status: Mode set to Couple '95.");
    }
  }

  async function fileToDataUrl(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      setStatusMessage("Status: Please upload a photo first.", { error: true });
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage("Status: Generating your Xmas95 scene…", {
        loading: true,
      });

      const userImage = await fileToDataUrl(file);
      let vibeKey: "PARTY" | "HOME" | "COUPLE" = "HOME";
      if (selectedMode === "party") vibeKey = "PARTY";
      if (selectedMode === "couple") vibeKey = "COUPLE";

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userImage, vibe: vibeKey }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const message = errJson?.error || "Unknown error from API";
        setStatusMessage("Status: " + message, { error: true });
        return;
      }

      const data = await res.json();
      if (!data || !data.output) {
        setStatusMessage("Status: No image returned from AI.", {
          error: true,
        });
        return;
      }

      setOutputUrl(data.output as string);
      setShowShareHint(false);
      setUnlocked(false);
      setStatusMessage(
        "Status: Xmas95 photo ready. Enter your code to unlock & download."
      );
    } catch (err) {
      console.error(err);
      setStatusMessage("Status: Generation failed. Please try again.", {
        error: true,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleUnlock() {
    if (codeInput.trim().toUpperCase() === UNLOCK_CODE) {
      setUnlocked(true);
      setStatusMessage(
        "Status: Unlocked. Download and post your Xmas95 photo 🎄"
      );
    } else {
      setUnlocked(false);
      setStatusMessage("Status: Invalid code. Please check your purchase.", {
        error: true,
      });
    }
  }

  function handleDownload() {
    if (!outputUrl) return;
    const canvas = document.querySelector<HTMLCanvasElement>("#xmas95-canvas");
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "xmas95-photo.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowShareHint(true);
      return;
    }
    const link = document.createElement("a");
    link.href = outputUrl;
    link.download = "xmas95-photo.webp";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowShareHint(true);
  }

  const displayImage = outputUrl || previewUrl;

  let previewLabel = "Preview: Party '95";
  if (selectedMode === "home") previewLabel = "Preview: Home '95";
  if (selectedMode === "couple") previewLabel = "Preview: Couple '95";

  const statusClasses = [
    "status-text",
    isError ? "status-error" : "",
    isLoading ? "status-loading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="window">
      <div className="title-bar">
        <div className="title-left">
          <span className="title-text">XMAS 95.exe - Retro Photo Studio</span>
          <span className="title-sub">
            KASTO Studio · Alpha · Party / Home / Couple
          </span>
        </div>
        <div className="close-btn">X</div>
      </div>

      <div className="content">
        <div className="hero-section">
          <div className="pixel-logo">🎄 XMAS 95</div>
          <div className="subtitle">
            Turn one photo into a 1995 Christmas party scene in seconds.
          </div>
          <div className="kasto-tag">
            crafted by KASTO Studio · Win95 shell · made for TikTok & IG Reels
          </div>
          <div className="kasto-tag" style={{ fontSize: 10, marginTop: 4 }}>
            Best results: clear face, no sunglasses, 1–2 people in frame.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset>
            <legend>Step 1: Upload Photo</legend>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            <div className="hint">
              Party &amp; Home: single person selfie or portrait. Couple: two
              people in the same photo.
            </div>
          </fieldset>

          <fieldset>
            <legend>Step 2: Choose Your Xmas Reality</legend>
            <div className="vibe-list">
              <div
                className={`vibe-item ${
                  selectedMode === "party" ? "selected" : ""
                }`}
                onClick={() => handleVibeClick("party")}
              >
                <div className="vibe-title">🎉 Party &apos;95</div>
                <div className="vibe-desc">
                  Flashy office party energy, Christmas drinks, background
                  crowd. Single person.
                </div>
              </div>
              <div
                className={`vibe-item ${
                  selectedMode === "home" ? "selected" : ""
                }`}
                onClick={() => handleVibeClick("home")}
              >
                <div className="vibe-title">🏠 Home &apos;95</div>
                <div className="vibe-desc">
                  Ultra-cozy living room, tree, fireplace glow. Single person.
                </div>
              </div>
              <div
                className={`vibe-item ${
                  selectedMode === "couple" ? "selected" : ""
                }`}
                onClick={() => handleVibeClick("couple")}
              >
                <div className="vibe-title">💑 Couple &apos;95</div>
                <div className="vibe-desc">
                  Matching sweaters, romantic fireplace scene for two.
                </div>
              </div>
            </div>
          </fieldset>

          <button
            type="submit"
            className="win-btn"
            disabled={isLoading || !file}
          >
            {isLoading ? "Generating…" : "⭐ MAKE MY XMAS95 PHOTO"}
          </button>

          <div className="preview-wrapper">
            <div className="preview-label-row">
              <span className="preview-mode-tag">{previewLabel}</span>
              <span style={{ fontSize: "10px" }}>Output (4:5)</span>
            </div>
            <div className="preview-box">
              {displayImage ? (
                outputUrl ? (
                  <div
                    className="relative w-full h-full"
                    style={
                      outputUrl && !unlocked
                        ? { filter: "blur(3px)" }
                        : undefined
                    }
                  >
                    <RetroComposer src={outputUrl} mode={selectedMode} />
                    <RetroOverlay />
                  </div>
                ) : (
                  <img
                    src={previewUrl as string}
                    className="preview-image"
                    alt="Preview"
                  />
                )
              ) : (
                <div className="preview-placeholder">
                  No output yet. Upload a photo and click &quot;Make my Xmas95
                  photo&quot;.
                  <div
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      opacity: 0.8,
                    }}
                  >
                    Tip: Party &apos;95 gives the most dramatic before/after for
                    posts.
                  </div>
                </div>
              )}

              {outputUrl && !unlocked && (
                <div className="paywall-overlay">
                  <div
                    style={{
                      fontSize: 12,
                      marginBottom: 4,
                      fontWeight: 600,
                    }}
                  >
                    Step 3: Unlock &amp; download your Xmas95 photo
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      marginBottom: 8,
                      opacity: 0.8,
                    }}
                  >
                    Preview is AI-generated already. Enter code to get the
                    full-resolution file.
                  </div>

                  <div className="price-row">
                    <a
                      href={TURKEY_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="buy-btn"
                    >
                      <span>Türkiye</span>
                      <span style={{ fontSize: 10 }}>Pay with iyzico</span>
                    </a>
                    <a
                      href={GLOBAL_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="buy-btn"
                    >
                      <span>Global</span>
                      <span style={{ fontSize: 10 }}>Pay with Gumroad</span>
                    </a>
                  </div>

                  <div style={{ fontSize: 10, marginBottom: 4 }}>
                    After purchase you will receive the unlock code.
                  </div>

                  <div className="code-input-area">
                    <input
                      className="code-input"
                      placeholder="CODE"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                    />
                    <button
                      type="button"
                      className="unlock-btn"
                      onClick={handleUnlock}
                    >
                      UNLOCK
                    </button>
                  </div>
                </div>
              )}
            </div>

            {outputUrl && (
              <button
                type="button"
                className="win-btn"
                onClick={handleDownload}
                disabled={!unlocked}
                style={{ marginTop: 6 }}
              >
                {unlocked
                  ? "⬇ DOWNLOAD XMAS95 PHOTO"
                  : "Enter unlock code to download"}
              </button>
            )}

            {outputUrl && showShareHint && (
              <div
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  opacity: 0.9,
                }}
              >
                Post it &amp; tag{" "}
                <span style={{ fontWeight: 700 }}>@kastostudio</span> with{" "}
                <span style={{ fontWeight: 700 }}>#xmas95</span> on Instagram or
                TikTok 🎄 — we&apos;re featuring the best transformations.
              </div>
            )}

            {outputUrl && unlocked && (
              <div
                style={{
                  fontSize: 9,
                  marginTop: 4,
                  opacity: 0.7,
                }}
              >
                Mobile tip: if the image opens in a new tab, tap and hold the
                photo to save it to your camera roll.
              </div>
            )}
          </div>

          <div className="status-bar">
            <span className={statusClasses}>{status}</span>
            <span className="status-brand">KASTO Studio · XMAS 95</span>
          </div>
        </form>
      </div>
    </div>
  );
}

function RetroOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-sm select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.4)_100%)]"></div>
      <div
        className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          filter: "contrast(120%)",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      ></div>
      <div
        className="absolute inset-0 opacity-20 mix-blend-screen"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, transparent 10%, rgba(255,255,255,0.3) 10.5%, transparent 11%, transparent 45%, rgba(255,255,255,0.2) 45.2%, transparent 46%, transparent 80%, rgba(255,255,255,0.1) 80.3%, transparent 81%)",
          backgroundSize: "100% 100%",
        }}
      ></div>
      <div
        className="absolute bottom-3 right-3 font-mono text-[#ff9900] text-sm sm:text-lg tracking-widest font-bold opacity-80"
        style={{ textShadow: "2px 2px 2px rgba(0,0,0,0.8)" }}
      >
        &apos;95 12 25
      </div>
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background:
            "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",
          backgroundSize: "100% 3px, 3px 100%",
        }}
      ></div>
    </div>
  );
}
