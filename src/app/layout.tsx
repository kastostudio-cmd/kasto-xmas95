import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XMAS 95 · Retro Photo Studio",
  description: "Turn any photo into a 1995 Christmas reality."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
