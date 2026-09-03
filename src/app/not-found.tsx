import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 text-center">
      <div>
        <p className="eyebrow">404</p>
        <h1 className="mt-3 text-3xl font-medium">페이지를 찾을 수 없습니다</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          주소가 바뀌었거나 존재하지 않는 화면입니다.
        </p>
        <Button render={<Link href="/" />} className="mt-6">
          처음으로
        </Button>
      </div>
    </main>
  );
}
