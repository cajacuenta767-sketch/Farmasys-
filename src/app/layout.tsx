import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FarmaSys — Sistema Integral de Farmacias",
  description: "Sistema completo de gestión de farmacias: punto de venta, inventario por lotes, compras, recetas, reportes y más.",
  keywords: ["farmacia", "punto de venta", "inventario", "medicamentos", "sistema de farmacias"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "FarmaSys — Sistema Integral de Farmacias",
    description: "Gestión completa de farmacias: POS, inventario, compras, recetas y reportes",
    siteName: "FarmaSys",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
