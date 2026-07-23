import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, JetBrains_Mono, Manrope } from "next/font/google";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NODO7 | Demos IPTV",
  description: "Portal seguro de demos IPTV de NODO7 OTT",
  manifest: "/manifest.json",
  icons: { icon: "/brand/nodo7-logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#eff5e4",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
