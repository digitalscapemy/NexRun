"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type BarcodeDetectorInstance = {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

function registrationCodeFromScan(value: string) {
  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) || "").toUpperCase();
  } catch {
    return value.trim().toUpperCase();
  }
}

type QrScannerProps = {
  onDetected: (registrationCode: string) => void;
  disabled?: boolean;
  continuous?: boolean;
  onError?: (message: string) => void;
  debounceMs?: number;
};

export function QrScanner({ onDetected, disabled, continuous = false, onError, debounceMs = 3000 }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastDetectedRef = useRef<{ code: string; timestamp: number } | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detectorAvailable = typeof window !== "undefined" && "BarcodeDetector" in window;

  const stop = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  };

  useEffect(() => stop, []);

  const start = async () => {
    setError(null);
    if (!detectorAvailable) {
      const errorMsg = "Camera QR scanning is not supported by this browser. Use the registration code field below.";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setActive(true);
      const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector;
      const detector = new Detector({ formats: ["qr_code"] });
      const scan = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          const code = results[0]?.rawValue ? registrationCodeFromScan(results[0].rawValue) : "";
          if (code) {
            // Check debounce: ignore if same code scanned recently
            const now = Date.now();
            const last = lastDetectedRef.current;
            if (last && last.code === code && now - last.timestamp < debounceMs) {
              // Same code within debounce window, skip
              frameRef.current = requestAnimationFrame(scan);
              return;
            }

            // Update last detected
            lastDetectedRef.current = { code, timestamp: now };

            // In continuous mode, keep scanning; otherwise stop
            if (!continuous) {
              stop();
            }

            onDetected(code);

            // If continuous, keep the loop going
            if (continuous) {
              frameRef.current = requestAnimationFrame(scan);
            }
            return;
          }
        } catch {
          // Frames without a readable code are expected while the camera moves.
        }
        frameRef.current = requestAnimationFrame(scan);
      };
      frameRef.current = requestAnimationFrame(scan);
    } catch {
      const errorMsg = "Camera access was not available. Check browser permissions or enter the code manually.";
      setError(errorMsg);
      onError?.(errorMsg);
      stop();
    }
  };

  return (
    <div className="space-y-3">
      <div className={`relative overflow-hidden rounded-2xl bg-neutral-950 ${active ? "aspect-video" : "hidden"}`}>
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" aria-label="QR scanner camera preview" />
        <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
      </div>
      <Button type="button" variant="outline" onClick={active ? stop : start} disabled={disabled} className="w-full gap-2 rounded-xl font-bold">
        {active ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
        {active ? "Stop camera" : "Scan ticket QR"}
      </Button>
      {error && <p className="text-xs leading-relaxed text-warning-700 dark:text-warning-300">{error}</p>}
    </div>
  );
}
