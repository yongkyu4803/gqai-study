"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/components/providers/app-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InlineMessage } from "@/components/common/page-parts";
import { GqaiIcon } from "@/components/common/gqai-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function safeNext(value: string | null, role: "admin" | "student") {
  const fallback = role === "admin" ? "/admin" : "/learn";
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  if (role === "admin" && !value.startsWith("/admin")) return fallback;
  if (role === "student" && value.startsWith("/admin")) return fallback;
  return value;
}

export function LoginView() {
  const router = useRouter();
  const search = useSearchParams();
  const { login, mode, ready } = useApp();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const user = await login(loginId, password);
      router.replace(
        user.mustChangePassword
          ? "/change-password"
          : safeNext(search.get("next"), user.role),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "로그인하지 못했습니다.",
      );
      setPassword("");
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          처음으로
        </Link>
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#171717] text-white">
              <LockKeyhole className="size-5" />
            </div>
            <CardTitle className="text-2xl tracking-tight">
              학습 공간 로그인
            </CardTitle>
            <CardDescription>
              강사가 전달한 아이디와 비밀번호를 입력하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              {error ? (
                <Alert id="login-error" variant="destructive">
                  <GqaiIcon name="status-error" />
                  <AlertTitle>로그인할 수 없습니다</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="loginId">아이디</Label>
                <Input
                  id="loginId"
                  autoCapitalize="none"
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="예: minji"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                  required
                />
              </div>
              <Button
                type="submit"
                className="h-11 w-full"
                disabled={pending || !ready}
                aria-busy={pending}
              >
                {pending ? "확인 중…" : "로그인"}
              </Button>
            </form>
            {mode === "demo" ? (
              <div className="mt-6 rounded-lg border bg-zinc-50 p-4 text-xs leading-6 text-zinc-600">
                <p className="font-medium text-zinc-900">데모 계정</p>
                <p>강사: admin / admin1234</p>
                <p>학생: minji / student1234</p>
                <p>최초 변경 체험: suyeon / student1234</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export function ChangePasswordView() {
  const router = useRouter();
  const { session, changePassword } = useApp();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("비밀번호 확인이 일치하지 않습니다. 두 입력값을 확인해 주세요.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await changePassword(password);
      toast.success("비밀번호를 변경했습니다.");
      router.replace(session?.role === "admin" ? "/admin" : "/learn");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "변경하지 못했습니다.";
      setError(`${message} 입력값을 확인한 뒤 다시 시도하세요.`);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>새 비밀번호 설정</CardTitle>
          <CardDescription>
            8자 이상이며 영문과 숫자를 포함해 주세요. 강사가 발급한 임시
            비밀번호는 더 이상 사용할 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "change-password-error" : undefined}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "change-password-error" : undefined}
                required
              />
            </div>
            {error ? (
              <InlineMessage
                id="change-password-error"
                kind="error"
                title="비밀번호를 변경하지 못했습니다"
                description={error}
              />
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "변경 중…" : "비밀번호 변경"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
