import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduEmpower Campus - Placement Management System",
  description: "Comprehensive placement management system for educational institutions. Manage students, companies, placement drives, training, and assessments.",
  keywords: ["placement", "campus", "education", "management", "students", "companies", "training"],
  authors: [{ name: "EduEmpower Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
  openGraph: {
    title: "EduEmpower Campus - Placement Management System",
    description: "Comprehensive placement management system for educational institutions.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduEmpower Campus - Placement Management System",
    description: "Comprehensive placement management system for educational institutions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
