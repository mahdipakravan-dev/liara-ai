import { cn } from "@/lib/utils";
import "./globals.css";
import { iranYekan } from "@/lib/fonts";

export const metadata = {
  title: "کنسول ابری لیارا",
  description: "ساخت، پیکربندی و استقرار برنامه روی زیرساخت ابری لیارا",
};

export const viewport = {
  themeColor: "#18191f",
  colorScheme: "dark",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={cn("font-sans", iranYekan.variable)}>
      <body>{children}</body>
    </html>
  );
}
