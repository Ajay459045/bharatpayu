import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://bharatpayu.com"),
  title: {
    default: "BharatPayU | BBPS Portal for Retailers & Distributors",
    template: "%s | BharatPayU"
  },
  description:
    "BharatPayU is a secure BBPS Portal, BBPS Software and fintech BBPS solution for retailers and distributors offering utility bill payment services with real-time commission and settlement.",
  keywords: [
    "BBPS Portal",
    "BBPS Software",
    "BBPS Retailer Portal",
    "Fintech BBPS Solution",
    "Utility Bill Payment Software",
    "BBPS API Platform",
    "Electricity Bill Payment Portal"
  ],
  openGraph: {
    title: "BharatPayU BBPS Fintech Portal",
    description: "Production-grade BBPS API platform for bill payments, retailer onboarding, wallet settlement and reports.",
    url: "/",
    siteName: "BharatPayU",
    type: "website",
    images: ["/brand/bharatpayu-office.jpg"]
  },
  twitter: {
    card: "summary_large_image",
    title: "BharatPayU BBPS Portal",
    description: "Secure utility bill payment software for retailers and distributors.",
    images: ["/brand/bharatpayu-office.jpg"]
  },
  alternates: { canonical: "/" },
  icons: {
    icon: "/brand/bharatpayu-logo.png",
    shortcut: "/brand/bharatpayu-logo.png",
    apple: "/brand/bharatpayu-logo.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
