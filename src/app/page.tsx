import Link from "next/link";
import { ArrowDown, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    title: "기초를 익히며, 하고 싶은 일 찾기",
    text: "AI의 기본기를 배우고 내 업무와 관심사에 연결해 봅니다. 아직 구체적인 목표가 없어도 괜찮습니다.",
  },
  {
    title: "나에게 배정된 모듈로 실습하기",
    text: "온라인 학습 공간에서 강의 모듈을 확인하고, 직접 해 본 학습 결과를 업로드합니다.",
  },
  {
    title: "결과를 바탕으로 다음 단계 이어가기",
    text: "GQAI가 학습자의 상황과 결과를 살펴 다음 모듈을 제공합니다. 새 모듈은 관리자가 학습지원 AI와 함께 구상하고 만듭니다.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="content-wrap flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-medium"
            aria-label="GQAI Study 홈"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-[#171717] text-xs font-semibold text-white">
              G
            </span>
            GQAI Study
          </Link>
          <Button variant="outline" render={<Link href="/login" />}>
            로그인
          </Button>
        </div>
      </header>

      <section className="content-wrap grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <p className="eyebrow mb-5">
            나의 일과 관심사에서 시작하는 AI 스터디
          </p>
          <h1 className="text-4xl font-medium leading-[1.2] tracking-[-0.045em] sm:text-6xl">
            AI를 배우고,
            <br />
            내가 하고 싶은 일을
            <br />
            <span className="text-[#18794e]">직접 만듭니다.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
            내 업무와 관심사에 AI를 접목하는 개인 맞춤형 학습 공간입니다.
            기초부터 차근차근, 업무의 효율을 높이는 실습부터 나만의 사이드
            프로젝트까지 함께 이어갑니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" render={<a href="#before-joining" />}>
              참여 안내 확인하기
              <ArrowDown className="size-4" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/login" />}>
              학습 공간 들어가기
              <ArrowRight className="size-4" />
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            온라인 학습 무료 · 개인 또는 그룹 참여 · 학습 결과에 따른 다음 모듈
          </p>
        </div>
        <aside
          className="rounded-2xl border bg-[#fafbf8] p-7 sm:p-9"
          aria-label="학습 목표 예시"
        >
          <p className="eyebrow">같은 AI, 서로 다른 목표</p>
          <p className="mt-4 text-2xl font-medium leading-9 tracking-tight">
            배운 것을
            <br />내 일에 써보는 경험.
          </p>
          <div className="mt-8 divide-y border-t">
            {[
              [
                "01",
                "반복 업무에 쓰는 시간을 줄이고 싶어요.",
                "자료 정리, 문서 작성, 업무 자동화",
              ],
              [
                "02",
                "관심 있는 것을 직접 만들어보고 싶어요.",
                "콘텐츠, 웹페이지, 나만의 작은 서비스",
              ],
              [
                "03",
                "함께 배우며 프로젝트를 키우고 싶어요.",
                "아이디어 공유, 공동 실습, 그룹 프로젝트",
              ],
            ].map(([number, title, text]) => (
              <div key={number} className="flex gap-4 py-5 last:pb-0">
                <span className="pt-1 font-mono text-xs text-[#18794e]">
                  {number}
                </span>
                <div>
                  <p className="text-sm font-medium leading-6">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section
        className="border-y bg-zinc-50/70"
        aria-labelledby="learning-path"
      >
        <div className="content-wrap py-16 sm:py-20">
          <p className="eyebrow">학습은 이렇게 이어집니다</p>
          <h2
            id="learning-path"
            className="mt-4 text-2xl font-medium tracking-tight sm:text-3xl"
          >
            기초에서 시작해, 내 결과물로 발전하는 과정
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="border-t border-zinc-300 pt-5">
                <span className="font-mono text-sm text-[#18794e]">
                  0{index + 1}
                </span>
                <h3 className="mt-5 text-lg font-medium">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        className="content-wrap grid gap-8 py-16 sm:py-20 lg:grid-cols-[.8fr_1.2fr]"
        aria-labelledby="participation"
      >
        <div>
          <p className="eyebrow">참여 방식</p>
          <h2
            id="participation"
            className="mt-4 text-2xl font-medium leading-snug tracking-tight sm:text-3xl"
          >
            혼자 시작해도,
            <br />
            함께 성장해도 좋습니다.
          </h2>
        </div>
        <div className="space-y-6">
          <p className="text-base leading-8 text-muted-foreground">
            개인으로 참여해 내 속도에 맞춰 배우거나, 그룹 단위로 공통의 목표를
            함께 실습할 수 있습니다. 혼자 공부하다가 뜻이 맞는 사람들과 그룹을
            만들어 학습과 프로젝트를 발전시켜도 좋습니다.
          </p>
          <div className="border-l-2 border-[#3ecf8e] pl-5">
            <h3 className="text-sm font-medium">대화를 나누고 싶다면</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              원하는 참여자들은 카카오톡 대화방을 열어 질문과 아이디어를 나눌 수
              있습니다. 대화방 참여는 선택 사항입니다.
            </p>
          </div>
        </div>
      </section>

      <section
        id="before-joining"
        className="scroll-mt-24 border-t bg-[#f7faf8]"
        aria-labelledby="joining-title"
      >
        <div className="content-wrap py-16 sm:py-20">
          <p className="eyebrow">계정 신청 전 확인해주세요</p>
          <h2
            id="joining-title"
            className="mt-4 text-2xl font-medium leading-snug tracking-tight sm:text-3xl"
          >
            온라인 학습은 무료입니다.
            <br />
            꾸준히 배우려는 참여가 필요합니다.
          </h2>
          <div className="mt-9 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-white p-6 sm:p-8">
              <h3 className="text-lg font-medium">비용 안내</h3>
              <dl className="mt-5 space-y-5">
                <div>
                  <dt className="flex items-center gap-2 text-sm font-medium">
                    <Check className="size-4 text-[#18794e]" />
                    온라인 학습 · 전부 무료
                  </dt>
                  <dd className="mt-2 text-sm leading-7 text-muted-foreground">
                    계속 공부하고 학습을 이어가는 동안, 기간 제한 없이 무료로
                    참여할 수 있습니다.
                  </dd>
                </div>
                <div className="border-t pt-5">
                  <dt className="text-sm font-medium">
                    오프라인 강의 · 선택 참여, 유료
                  </dt>
                  <dd className="mt-2 text-sm leading-7 text-muted-foreground">
                    원하는 수강생에 한해 별도로 진행합니다. 수강료는 강의 내용과
                    방식에 따라 별도 협의합니다.
                  </dd>
                </div>
              </dl>
            </div>
            <div className="rounded-xl border bg-white p-6 sm:p-8">
              <h3 className="text-lg font-medium">활동 및 계정 운영 안내</h3>
              <p className="mt-5 text-sm leading-7 text-muted-foreground">
                GQAI Study는 실제로 배우고 실습하는 분들을 위한 공간입니다.
                배정된 모듈을 학습하고, 결과를 업로드하며 다음 단계를 이어가
                주세요.
              </p>
              <p className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm font-medium leading-7">
                일정 기간 학습 진도가 진행되지 않으면 계정이 비활성화됩니다.
              </p>
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                무료 계정을 보유하는 것보다, 지속적으로 학습에 참여하는 것을
                중요하게 생각합니다.
              </p>
            </div>
          </div>
          <div className="mt-10 flex flex-col justify-between gap-6 border-t border-zinc-200 pt-8 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-medium">
                이제, 나의 AI 학습을 시작해볼까요?
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                학습 방식과 비용·활동 원칙을 확인하셨다면 계정을 신청해 주세요.
              </p>
            </div>
            <Button
              size="lg"
              className="shrink-0"
              render={<Link href="/request-access" />}
            >
              안내 확인 후 계정 신청
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>
      <footer className="content-wrap flex flex-wrap items-center justify-between gap-3 py-7 text-xs text-muted-foreground">
        <span>GQAI Study · 나의 일에 연결하는 AI 학습</span>
        <Link href="/login" className="hover:underline">
          이미 계정이 있다면 로그인
        </Link>
      </footer>
    </main>
  );
}
