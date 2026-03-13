import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { PageTransition } from "@/components/page-transition";
import { NavigationTransition } from "@/components/navigation-transition";
import { ToastViewer } from "@/components/ToastViewer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tommy D's — Scheduling & Billing",
  description:
    "Internal scheduling, jobs, invoicing, and payment collection for Tommy D's Windows, Doors, & More.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${geistSans.variable}`}>
      <body className={`font-sans ${geistMono.variable} antialiased`}>
        <ClientErrorBoundary>
          <Suspense fallback={null}>
            <NavigationTransition />
            <PageTransition>{children}</PageTransition>
            <ToastViewer />
          </Suspense>
        </ClientErrorBoundary>
      </body>
    </html>
  );
}
