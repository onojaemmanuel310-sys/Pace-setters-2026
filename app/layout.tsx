import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "PACE SETTERS 2026 | Digital Yearbook & Graduate Community",
  description:
    "Celebrating our journey, preserving our memories, and connecting a generation of leaders. The official digital home of PACE SETTERS 2026.",
  keywords: [
    "PACE SETTERS 2026",
    "Digital Yearbook",
    "Graduation",
    "Graduate Community",
    "Class of 2026",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
