import type { Metadata } from "next";
import { archivo, plexMono } from "./fonts";
import "./globals.css";

/**
 * Root layout — a Server Component, shipping zero client JS (§10.3).
 *
 * Fonts are self-hosted via next/font/local (PROJECT_SPEC.md §17.6).
 * Archivo carries the wdth axis that display type depends on (§4.4).
 */

export const metadata: Metadata = {
  metadataBase: new URL("https://brs.example.invalid"),
  title: "BUET Robotics Society",
  description:
    "Robots designed, built and campaigned at Bangladesh University of Engineering & Technology since ABU Robocon 2005. Six international programmes. Nineteen workshops. One Panasonic Award.",
  openGraph: {
    title: "BUET Robotics Society",
    description:
      "Robots designed, built and campaigned at BUET since ABU Robocon 2005. Six international programmes. Nineteen workshops. One Panasonic Award.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Dark is canonical (laboratory / exhibition). An explicit OS light
    // preference is honoured in globals.css; data-theme overrides both.
    <html lang="en" data-theme="dark" className={`${archivo.variable} ${plexMono.variable}`}>
      <body className="bg-bg-base text-text-primary antialiased">{children}</body>
    </html>
  );
}
