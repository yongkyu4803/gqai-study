import Link from "next/link";
import type { ReactNode } from "react";

export function PolicyPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-zinc-50">
      <header className="border-b bg-white">
        <div className="content-wrap flex h-16 items-center justify-between">
          <Link href="/" className="font-medium">
            GQAI Study
          </Link>
          <Link
            href="/request-access"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            계정 신청
          </Link>
        </div>
      </header>
      <article className="content-wrap py-12 sm:py-16">
        <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 shadow-sm sm:p-10">
          <p className="eyebrow">기본 정책 · 2026년 9월 7일 시행</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight">{title}</h1>
          <p className="mt-4 leading-7 text-muted-foreground">{description}</p>
          <div className="policy-content mt-10 space-y-9 text-sm leading-7 text-zinc-700">
            {children}
          </div>
          <p className="mt-12 border-t pt-6 text-xs leading-6 text-muted-foreground">
            이 문서는 현재 서비스 운영 기준을 설명하는 기본 정책입니다. 서비스
            기능이나 관련 법령의 변경에 따라 보완될 수 있습니다.
          </p>
        </div>
      </article>
    </main>
  );
}

export function PolicySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
