import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { WsuHeader } from "@/components/WsuHeader";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-wsu-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CAS program viewer | Washington State University",
  description: "Publish CAS exports to a public program summary page.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sourceSans.variable} h-full antialiased`}>
      <body className={`${sourceSans.className} flex min-h-full flex-col`}>
        <WsuHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
