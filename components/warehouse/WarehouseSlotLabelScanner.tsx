"use client";

import { Camera, CameraOff, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { findWarehouseSlotInText } from "@/lib/warehouse-slot-from-text";

type Props = {
  /** Called when OCR finds a valid grid slot (e.g. A1, B8). */
  onSlotDetected: (slot: string) => void;
};

export function WarehouseSlotLabelScanner({ onSlotDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [lastOcr, setLastOcr] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    setHint(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setHint("Camera is not available in this browser.");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setHint("Camera needs HTTPS (or localhost).");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play();
      }
      setCameraOn(true);
    } catch {
      setHint("Could not open the camera. Check permissions and try again.");
    }
  }, []);

  const captureAndRead = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setHint("Wait for the preview to show, then try again.");
      return;
    }
    setBusy(true);
    setHint(null);
    setLastOcr(null);
    try {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        setHint("Video not ready.");
        return;
      }
      const maxLong = 1600;
      let cw = w;
      let ch = h;
      if (Math.max(w, h) > maxLong) {
        const scale = maxLong / Math.max(w, h);
        cw = Math.round(w * scale);
        ch = Math.round(h * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setHint("Could not read frame.");
        return;
      }
      ctx.drawImage(video, 0, 0, cw, ch);

      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist: "ABCabc0123456789",
      });
      const {
        data: { text },
      } = await worker.recognize(canvas);
      await worker.terminate();

      const trimmed = text.trim();
      setLastOcr(trimmed.length > 0 ? trimmed : null);
      const slot = findWarehouseSlotInText(trimmed);
      if (slot) {
        onSlotDetected(slot);
        setHint(`Got ${slot}.`);
        stopCamera();
      } else {
        setHint(
          trimmed.length > 0
            ? "No A/B/C slot like A1 or B8 found. Try closer light, hold steady, or type the code."
            : "No text read. Try again with better light.",
        );
      }
    } catch (e) {
      setHint(e instanceof Error ? e.message : "Could not read the label.");
    } finally {
      setBusy(false);
    }
  }, [onSlotDetected, stopCamera]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-200">
          <Camera className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-medium text-white">Scan the rack label</p>
          <p className="mt-1 text-xs font-light leading-relaxed text-white/60">
            Point at the big slot text (<span className="font-mono text-white/85">A1</span>,{" "}
            <span className="font-mono text-white/85">B4</span>…). Use this when a QR isn&apos;t handy—both work great.
          </p>
        </div>
      </div>

      {!cameraOn ? (
        <button
          type="button"
          onClick={() => void startCamera()}
          className="mt-4 w-full rounded-xl border border-white/15 bg-white/10 py-2.5 font-sans text-sm font-medium text-white transition hover:bg-white/15"
        >
          Open camera
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- live preview only */}
            <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void captureAndRead()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-2.5 font-sans text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25 disabled:opacity-50 min-[400px]:flex-none min-[400px]:px-5"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
              {busy ? "Reading…" : "Capture & read"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={stopCamera}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-sans text-sm text-white/85 transition hover:bg-white/10"
            >
              <CameraOff className="h-4 w-4" aria-hidden />
              Close
            </button>
          </div>
        </div>
      )}

      {hint ? (
        <p className={`mt-3 text-xs leading-relaxed ${hint.startsWith("Got ") ? "text-emerald-300/95" : "text-amber-200/90"}`} role="status">
          {hint}
        </p>
      ) : null}
      {lastOcr && !hint?.startsWith("Got ") ? (
        <p className="mt-2 max-h-16 overflow-y-auto font-mono text-[10px] leading-snug text-white/40">
          OCR: {lastOcr}
        </p>
      ) : null}
    </div>
  );
}
