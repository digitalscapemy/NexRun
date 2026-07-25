import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "NexRun — Run Event Management Platform",
    template: "%s | NexRun",
  },
  description:
    "Malaysia's premier run event management platform. Discover, register, and manage running events with NexRun.",
  keywords: ["run", "marathon", "event management", "Malaysia", "running", "race"],
  openGraph: {
    type: "website",
    siteName: "NexRun",
    title: "NexRun — Running Events Across Malaysia",
    description: "Discover verified running events, register participants, and keep your race tickets together.",
    images: [
      {
        url: "/brand/nexrun-social-card.png",
        width: 1200,
        height: 630,
        alt: "NexRun — Run Together, Achieve More",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NexRun — Running Events Across Malaysia",
    description: "Discover verified running events, register participants, and keep your race tickets together.",
    images: ["/brand/nexrun-social-card.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={cn("font-sans", geist.variable)}>
      <body className={`${inter.variable} font-sans antialiased`}>
        <a href="#main-content" className="sr-only z-100 rounded-lg bg-white px-4 py-2 font-semibold text-neutral-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
