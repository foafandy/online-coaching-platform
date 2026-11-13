import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FA COACHING — التدريب أونلاين",
    template: "%s · FA COACHING",
  },
  description:
    "خطط تغذية وتمارين مخصصة، ومتابعة أسبوعية، وتواصل مباشر مع FA COACHING.",
  icons: {
    icon: "/fa-logo.jpg",
    apple: "/fa-logo.jpg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0C0B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
