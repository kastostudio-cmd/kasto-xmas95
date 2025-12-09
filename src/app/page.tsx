"use client";

import { useRef, useState } from "react";
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      setUnlocked(false);
      setShowShareHint(false);
      return;
    }
    setFile(f);
    const localUrl = URL.createObjectURL(f);
    setPreviewUrl(localUrl);
    setOutputUrl(null);
    setUnlocked(false);
    setShowShareHint(false);
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

  function fileToDataUrl(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (!reader.result || typeof reader.result !== "string") {
          reject(new Error("Invalid file reader result"));
          return;
        }

        const img = new Image();
        img.onload = () => {
          const maxSize = 1536;
          let width = img.width;
          let height = img.height;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = Math.round(width);
          canvas.height = Math.round(height);

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context error"));
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          resolve(dataUrl);
        };

        img.onerror = () => reject(new Error("Image load error"));
        img.src = reader.result;
      };

      reader.onerror = () =>
        reject(reader.error || new Error("File read error"));

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
        body: JSON.stringify({ userImage, vibe: vibeKey })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const apiMsg = errJson?.error;
        let friendly = "Status: Generation failed. Please try again.";
        if (res.status === 429) {
          friendly =
            "Status: XMAS95 is very busy right now. Please wait a minute and try again 🎄";
        } else if (apiMsg) {
          friendly = "Status: " + apiMsg;
        }
        setStatusMessage(friendly, { error: true });
        return;
      }

      const data = await res.json();
      if (!data || !data.output) {
        setStatusMessage("Status: No image returned from XMAS95 engine.", {
          error: true
        });
        return;
      }

      setOutputUrl(data.output as string);
      setUnlocked(false);
      setShowShareHint(false);
      setStatusMessage("Status: Xmas95 photo ready. Enter code to download.");
      const previewContainer = document.querySelector(
        ".preview-wrapper"
      ) as HTMLElement | null;
      if (previewContainer) {
        previewContainer.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage(
        "Status: Generation failed. Please check your connection and try again.",
        { error: true }
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleUnlock() {
    const entered = codeInput.trim().toUpperCase();
    if (!entered) {
      setUnlocked(false);
      setStatusMessage("Status: Please enter the unlock code.", {
        error: true
      });
      return;
    }

    if (entered === UNLOCK_CODE) {
      setUnlocked(true);
      setStatusMessage("Status: Unlocked. You can download your photo now.");
      setTimeout(() => {
        const btn = document.getElementById(
          "xmas95-download-btn"
        ) as HTMLButtonElement | null;
        if (btn) {
          btn.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 80);
    } else {
      setUnlocked(false);
      setStatusMessage("Status: Invalid code. Please check your purchase.", {
        error: true
      });
    }
  }

  function handleDownload() {
    if (!outputUrl) return;

    const canvas = canvasRef.current;

    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");

      const isIOS =
        typeof navigator !== "undefined" &&
        /iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isIOS) {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "xmas95-photo.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setShowShareHint(true);
      return;
    }

    window.open(outputUrl, "_blank");
    setShowShareHint(true);
  }

  async function handleCopyCaption() {
    if (!outputUrl) return;
    const modeLabel =
      selectedMode === "party"
        ? "party '95"
        : selectedMode === "home"
        ? "home '95"
        : "couple '95";
    const caption = `turned my photo into a 1995 christmas ${modeLabel} shot with XMAS95 🎄 try yours at xmas95.app #xmas95 @kastostudio`;
    try {
      if (navigator && "clipboard" in navigator) {
        await navigator.clipboard.writeText(caption);
      }
      setShowShareHint(true);
      setStatusMessage("Status: Caption copied. Post your XMAS95 photo!", {});
    } catch (e) {
      console.error(e);
    }
  }

  let previewLabel = "Preview: Party '95";
  if (selectedMode === "home") previewLabel = "Preview: Home '95";
  if (selectedMode === "couple") previewLabel = "Preview: Couple '95";

  const statusClasses = [
    "status-text",
    isError ? "status-error" : "",
    isLoading ? "status-loading" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const hasAnyImage = Boolean(outputUrl || previewUrl);

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
              {hasAnyImage ? (
                <div
                  style={{
                    width: "100%",
                    maxWidth: 540,
                    margin: "0 auto",
                    position: "relative",
                    zIndex: 1
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "4 / 5",
                      overflow: "hidden",
                      borderRadius: 4,
                      backgroundColor: "#000",
                      ...(outputUrl && !unlocked
                        ? { filter: "blur(3px)" }
                        : {})
                    }}
                  >
                    {outputUrl ? (
                      <RetroComposer
                        src={outputUrl}
                        mode={selectedMode}
                        canvasRef={canvasRef}
                      />
                    ) : (
                      <img
                        src={previewUrl as string}
                        alt="Preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block"
                        }}
                      />
                    )}
                  </div>

                  {outputUrl && !unlocked && (
                    <div
                      className="paywall-overlay"
                      style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 5
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          marginBottom: 8,
                          fontWeight: 600
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
              ) : (
                <div
                  className="preview-placeholder"
                  style={{
                    width: "100%",
                    maxWidth: 540,
                    margin: "0 auto",
                    aspectRatio: "4 / 5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center"
                  }}
                >
                  No output yet. Upload a photo and click "Generate Xmas95
                  Photo".
                  <div
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      opacity: 0.8
                    }}
                  >
                    Tip: Start with Party &apos;95 for the most dramatic glow-up.
                  </div>
                </div>
              )}
            </div>

            {outputUrl && (
              <>
                <div
                  style={{
                    marginTop: 6,
                    position: "relative",
                    zIndex: 50
                  }}
                >
                  <button
                    id="xmas95-download-btn"
                    type="button"
                    className="win-btn"
                    onClick={handleDownload}
                    disabled={!unlocked}
                    style={{ width: "100%" }}
                  >
                    {unlocked
                      ? "⬇ DOWNLOAD XMAS95 PHOTO"
                      : "Enter unlock code to download"}
                  </button>
                </div>

                {unlocked && (
                  <div
                    style={{
                      fontSize: 10,
                      marginTop: 4,
                      opacity: 0.85
                    }}
                  >
                    On iPhone: if the image opens in a new tab, tap and hold the
                    photo and choose <b>“Save Photo”</b>.
                  </div>
                )}

                <div
                  style={{
                    marginTop: 10,
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(0,0,0,0.15)",
                    fontSize: 11
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: 4
                    }}
                  >
                    Ready-to-post caption
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 10,
                      padding: 6,
                      borderRadius: 3,
                      background: "rgba(0,0,0,0.4)",
                      marginBottom: 6
                    }}
                  >
                    turned my photo into a 1995 christmas{" "}
                    {selectedMode === "party"
                      ? "party '95"
                      : selectedMode === "home"
                      ? "home '95"
                      : "couple '95"}{" "}
                    shot with XMAS95 🎄 try yours at xmas95.app #xmas95
                    {" @kastostudio"}
                  </div>
                  <button
                    type="button"
                    className="win-btn"
                    onClick={handleCopyCaption}
                    style={{ fontSize: 10, padding: "4px 8px" }}
                  >
                    COPY CAPTION
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 4,
                    border: "1px dashed rgba(255,255,255,0.25)",
                    background: "rgba(0,0,0,0.2)",
                    fontSize: 11
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: 4
                    }}
                  >
                    🎄 XMAS95 Challenge
                  </div>
                  <div>1) Post your photo on Instagram or TikTok</div>
                  <div>2) Tag @kastostudio</div>
                  <div>3) Add hashtag #xmas95challenge</div>
                  <div style={{ marginTop: 4, opacity: 0.85 }}>
                    We&apos;re featuring our favorite 1995 Christmas shots.
                  </div>
                </div>
              </>
            )}

            {outputUrl && showShareHint && (
              <div
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  opacity: 0.85
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
