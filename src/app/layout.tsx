import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
import Script from "next/script";
import { ClerkProvider } from '@clerk/nextjs';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CuePad - Professional Script Annotation",
  description: "Professional script annotation tool for theatre directors. Add cues, blocking notes, and highlights to your scripts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
        <head>
          <Script
            crossOrigin="anonymous"
            src="//unpkg.com/same-runtime/dist/index.global.js"
          />
        </head>
        <body suppressHydrationWarning className="antialiased">
          <ClientBody>{children}</ClientBody>
        </body>
      </html>
    </ClerkProvider>
  );
}
