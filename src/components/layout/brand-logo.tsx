import { cn } from "@/lib/utils";

export type BrandLogoVariant = "mark" | "wordmark" | "lockup";

export interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
  alt?: string;
}

const brandAssets: Record<
  BrandLogoVariant,
  { src: string; width: number; height: number }
> = {
  mark: { src: "/brand/nexrun-mark.png", width: 962, height: 514 },
  wordmark: { src: "/brand/nexrun-wordmark.png", width: 1051, height: 176 },
  lockup: { src: "/brand/nexrun-lockup.png", width: 1068, height: 761 },
};

export function BrandLogo({
  variant = "wordmark",
  className,
  priority = false,
  alt = "NexRun",
}: BrandLogoProps) {
  const asset = brandAssets[variant];

  return (
    // Static brand assets intentionally bypass Next image optimization.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.src}
      width={asset.width}
      height={asset.height}
      alt={alt}
      aria-hidden={alt === "" ? true : undefined}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={cn("block h-auto max-w-full", className)}
    />
  );
}
