import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolOS — Academic Intelligence for Private Schools",
  description: "The all-in-one school management and academic analytics platform built for private schools in Pakistan. Real-time results, smart analytics, and fee management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

