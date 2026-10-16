import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shajarah — Family Tree Poster Generator",
  description: "Enter your family and grow an ornamental, print-ready nasab tree poster.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
