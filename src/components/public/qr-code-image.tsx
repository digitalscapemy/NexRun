"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCodeImage({ value, size = 144, className = "" }: { value: string; size?: number; className?: string }) {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const resolvedValue = value.startsWith("/") ? new URL(value, window.location.origin).toString() : value;
    QRCode.toDataURL(resolvedValue, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: size,
      color: { dark: "#171717", light: "#FFFFFF" },
    }).then((url) => active && setSource(url));
    return () => {
      active = false;
    };
  }, [size, value]);

  if (!source) {
    return <div style={{ width: size, height: size }} className={`animate-pulse rounded-lg bg-neutral-100 ${className}`} aria-label="Generating QR code" />;
  }

  // Data URL generated locally from an opaque registration verification URL.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={source} width={size} height={size} alt="Registration verification QR code" className={className} />;
}
