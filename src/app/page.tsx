import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GqaiIcon } from "@/components/common/gqai-icon";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="content-wrap flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <span className="flex size-7 items-center justify-center rounded-md bg-[#171717] text-xs font-semibold text-white">
              G
            </span>
            GQAI Study
          </div>
          <Button variant="outline" render={<Link href="/login" />}>
            로그인
          </Button>
        </div>
      </header>
      <section className="content-wrap grid min-h-[calc(100dvh-4rem)] items-center gap-12 py-16 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <p className="eyebrow mb-4 text-foreground">
            PRIVATE TUTORING WORKSPACE
          </p>
          <h1 className="max-w-3xl text-4xl font-medium leading-[1.12] tracking-[-0.045em] sm:text-6xl">
            학생마다 다른 학습,
            <br />
            한곳에서 이어갑니다.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            강사가 직접 만든 실습 카드를 개인 또는 그룹에 배정하고, 학생별 학습
            기록과 결과물에 구체적인 피드백을 남기는 프라이빗 과외 공간입니다.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" render={<Link href="/login" />} className="gap-2">
              학습 공간 들어가기
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/request-access" />}
            >
              계정 발급 요청
            </Button>
          </div>
        </div>
        <div className="focus-card overflow-hidden">
          <div className="border-b bg-zinc-50 px-5 py-4">
            <p className="text-sm font-medium">하나의 모듈, 각자의 학습 기록</p>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-2">
            <Feature
              icon="content-issue-paper"
              title="직접 만든 모듈"
              text="목표, 준비물, 본문, 자료와 제출 조건을 블록으로 구성합니다."
            />
            <Feature
              icon="content-newsletter"
              title="개인·그룹 배정"
              text="그룹 배정도 학생별 독립 카드와 결과로 저장됩니다."
            />
            <Feature
              icon="status-success"
              title="수강·제출 기록"
              text="학습 시작, 수강 완료와 여러 유형의 결과물을 남깁니다."
            />
            <Feature
              icon="status-info"
              title="개별 피드백"
              text="피드백, 보완 요청, 재제출과 최종 완료를 이어갑니다."
            />
          </div>
        </div>
      </section>
    </main>
  );
}
function Feature({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <article className="bg-white p-6">
      <GqaiIcon name={icon} className="size-8 text-foreground" />
      <h2 className="mt-8 font-medium">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </article>
  );
}
