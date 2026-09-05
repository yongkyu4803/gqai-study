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
  description:
    "내 업무와 관심사에 AI를 접목하는 개인 맞춤형 스터디. 기초 학습부터 업무 효율화와 사이드 프로젝트까지, 개인 또는 그룹으로 무료 온라인 학습을 이어갑니다.",
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
