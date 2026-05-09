import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "../components/providers/Web3Provider";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Vibe Wallet Tracker",
  description: "A high-fidelity, privacy-first Web3 portfolio tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.variable} antialiased overflow-hidden`}>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
