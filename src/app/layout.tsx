import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({
  variable: "--font-sans-app",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-app",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Witness desk",
  description: "Search every camera in a city for a vehicle, then mark and save the case.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
