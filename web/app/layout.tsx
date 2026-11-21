import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { BootIntro } from "@/components/boot/boot-intro";

export const metadata: Metadata = {
  title: "Fludd",
  description: "A flood report card for any address near USF.",
  appleWebApp: { capable: true, title: "Fludd", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f6f8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        {children}
        <BootIntro />
      </body>
    </html>
  );
}
