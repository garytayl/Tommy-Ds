import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Tommy D's | Demo Workspace", description: "Browser-only field service demo" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
