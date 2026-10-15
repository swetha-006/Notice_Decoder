import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notice Check — Check Official Notices Before You Panic or Pay",
  description:
    "Best-effort local masking and evidence-based checks for official-looking tax, bank, customs, and fine notices. Review masked text before submitting it for analysis.",
  keywords: [
    "Notice Check",
    "Income Tax Scam Check",
    "Fake Notice Detector",
    "KYC Fraud",
    "E-Challan Scam",
    "Privacy Redaction",
  ],
  authors: [{ name: "Notice Check Security Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
