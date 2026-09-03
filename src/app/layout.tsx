import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import type { CSSProperties, ReactNode } from "react";
import { AppProvider } from "@/components/providers/app-provider";
import { ApplicationFrame } from "@/components/layout/application-frame";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
});
const korean = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-korean",
});

export const metadata: Metadata = {
  title: { default: "GQAI Study", template: "%s · GQAI Study" },
  description: "강사가 직접 설계하고 학생별로 피드백하는 프라이빗 과외 공간",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${inter.variable} ${korean.variable}`}>
      <body
        style={
          {
            "--font-app": "var(--font-inter), var(--font-korean)",
            "--font-code":
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          } as CSSProperties
        }
      >
        <AppProvider>
          <ApplicationFrame>{children}</ApplicationFrame>
        </AppProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
