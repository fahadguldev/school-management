import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduSaaS — School Management & Academic Intelligence",
  description: "Multi-tenant School Operations and Academic Intelligence SaaS Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
