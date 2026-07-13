import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://realt.ai";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Realt AI — Make better housing decisions",
    template: "%s | Realt AI",
  },
  description:
    "Realt AI is an intelligent decision assistant that helps you understand your priorities, weigh trade-offs, and confidently choose the right home.",
  openGraph: {
    title: "Realt AI — Make better housing decisions",
    description:
      "An AI-first decision assistant that understands you before it shows you properties.",
    url: SITE_URL,
    siteName: "Realt AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Realt AI — Make better housing decisions",
    description:
      "An AI-first decision assistant that understands you before it shows you properties.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            Skip to main content
          </a>
          <SiteHeader />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
