import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Berri - Go-to-Market Intelligence Engine",
  description: "Transform your network into a scalable relationship-building and prospecting tool.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans h-full`}>
        <Providers>
          <main className="min-h-screen bg-background text-foreground">{children}</main>
        </Providers>
      </body>
    </html>
  );
}