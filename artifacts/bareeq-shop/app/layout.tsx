import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bareeq Atelier | Silver, shaped by light",
  description:
    "A quieter kind of shine. Discover the story and collections of Bareeq Atelier, an independent sterling-silver atelier.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-[100dvh]">{children}</body>
    </html>
  );
}
