import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ForbiddenPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 text-center">
      <div>
        <p className="eyebrow">403</p>
        <h1 className="mt-3 text-3xl font-medium">
          이 페이지를 볼 수 없습니다
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          현재 계정의 역할이나 학습 카드 소유권을 확인해 주세요.
        </p>
        <Button render={<Link href="/login" />} className="mt-6">
          로그인으로 돌아가기
        </Button>
      </div>
    </main>
  );
}
