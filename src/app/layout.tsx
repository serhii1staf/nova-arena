import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nova Arena — мультяшный 3D-шутер",
  description: "Яркий космический 3D-шутер: лобби, арена-замок, скины, лидерборд. Web · Desktop · Mini-app.",
  applicationName: "Nova Arena",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#c4b5fd",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-sky-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
