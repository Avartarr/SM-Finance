import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "S&M Finance",
  description: "Secure shared personal finance dashboard for Snowflake and Muffin.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
