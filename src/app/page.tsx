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
      setStatusMessage("Status: Generating Xmas95 photo…", { loading: true });

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
        setStatusMessage("Status: No image returned from API.", {
          error: true,
        });
        return;
      }

      setOutputUrl(data.output as string);
      setShowShareHint(false);
      setStatusMessage("Status: Xmas95 photo ready. Unlock to download.");
    } catch (err) {
      console.error(err);
      setStatusMessage("Status: Generation failed. Check console.", {
        error: true,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleUnlock() {
    if (codeInput.trim().toUpperCase() === UNLOCK_CODE) {
      setUnlocked(true);
      setStatusMessage("Status: Unlocked. You can download your photo now.");
    } else {
      setUnlocked(false);
      setStatusMessage("Status: Invalid code. Please check your purchase.", {
        error: true,
      });
    }
  }

  function handleDownload() {
    if (!outputUrl) return;

    const isIOS =
      typeof navigator !== "undefined" &&
      /iPhone|iPad|iPod/i.test(navigator.userAgent);

    const canvas =
      !isIOS &&
      document.querySelector<HTMLCanvasElement>("#xmas95-canvas");

    // Desktop: direkt PNG indir
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

    // iOS ve fallback: resmi yeni sekmede aç → uzun basıp “Save Photo”
    window.open(outputUrl, "_blank");
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
            Transform one photo into a 1995 Christmas reality.
          </div>
          <div className="kasto-tag">crafted by KASTO Studio · Win95 shell</div>
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset>
            <legend>Step 1: Upload Photo</legend>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            <div className="hint">
              Party &amp; Home: single person photo. Couple: two people in the
              same frame.
            </div>
          </fieldset>

          <fieldset>
            <legend>Step 2: Select Scene</legend>
            <div className="vibe-list">
              <div
                className={`vibe-item ${
                  selectedMode === "party" ? "selected" : ""
                }`}
                onClick={() => handleVibeClick("party")}
              >
                <div className="vibe-title">🎉 Party &apos;95</div>
                <div className="vibe-desc">
                  Christmas party vibes, flash photography, festive atmosphere.
                  Single person.
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
                  Cozy living room, Christmas tree, warm lights. Single person.
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
            {isLoading ? "Generating…" : "⭐ GENERATE XMAS95 PHOTO"}
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
                  No output yet. Upload a photo and click "Generate Xmas95
                  Photo".
                  <div
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      opacity: 0.8,
                    }}
                  >
                    Tip: Start with Party &apos;95 for the most dramatic glow-up.
                  </div>
                </div>
              )}

              {outputUrl && !unlocked && (
                <div className="paywall-overlay">
                  <div
                    style={{
                      fontSize: 12,
                      marginBottom: 8,
                      fontWeight: 600,
                    }}
                  >
                    Unlock your full-resolution Xmas95 photo
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
              <>
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

                {unlocked && (
                  <div
                    style={{
                      fontSize: 10,
                      marginTop: 4,
                      opacity: 0.85,
                    }}
                  >
                    On iPhone: if the image opens in a new tab, tap and hold the
                    photo and choose <b>“Save Photo”</b>.
                  </div>
                )}
              </>
            )}

            {outputUrl && showShareHint && (
              <div
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  opacity: 0.85,
                }}
              >
                Tag <span style={{ fontWeight: 700 }}>@kastostudio</span> with{" "}
                <span style={{ fontWeight: 700 }}>#xmas95</span> on Instagram or
                TikTok 🎄
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
