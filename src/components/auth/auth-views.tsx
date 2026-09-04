"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
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
            <p className="mt-6 text-center text-sm text-muted-foreground">
              계정이 없으신가요?{" "}
              <Link href="/request-access" className="font-medium text-foreground underline underline-offset-4">
                계정 발급 요청
              </Link>
              <span className="mx-2">·</span>
              <Link href="/forgot-password" className="font-medium text-foreground underline underline-offset-4">
                비밀번호 찾기
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function PublicCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          로그인으로
        </Link>
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#171717] text-white">
              <LockKeyhole className="size-5" />
            </div>
            <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}

export function ForgotPasswordView() {
  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, email }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "요청을 처리하지 못했습니다.");
      setMessage(body.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "요청을 처리하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }
  return (
    <PublicCard
      title="비밀번호 찾기"
      description="아이디와 계정에 등록된 이메일을 입력하면 재설정 링크를 보내드립니다."
    >
      {message ? (
        <InlineMessage kind="success" title="요청을 접수했습니다" description={message} />
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error ? (
            <Alert variant="destructive">
              <GqaiIcon name="status-error" />
              <AlertTitle>요청을 처리하지 못했습니다</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="forgotLoginId">아이디</Label>
            <Input
              id="forgotLoginId"
              autoCapitalize="none"
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="forgotEmail">등록된 이메일</Label>
            <Input
              id="forgotEmail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              이메일을 등록하지 않았다면 강사에게 재설정을 요청하세요.
            </p>
          </div>
          <Button type="submit" className="h-11 w-full" disabled={pending} aria-busy={pending}>
            {pending ? "보내는 중…" : "재설정 링크 보내기"}
          </Button>
        </form>
      )}
    </PublicCard>
  );
}

export function ResetPasswordView() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "비밀번호를 변경하지 못했습니다.");
      toast.success("비밀번호를 변경했습니다. 새 비밀번호로 로그인하세요.");
      router.replace("/login");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "비밀번호를 변경하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }
  return (
    <PublicCard
      title="새 비밀번호 설정"
      description="8자 이상, 영문과 숫자를 포함한 비밀번호를 입력하세요."
    >
      {!token ? (
        <InlineMessage
          kind="error"
          title="유효하지 않은 링크입니다"
          description="이메일의 링크를 다시 열거나, 비밀번호 찾기를 다시 요청하세요."
        />
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error ? (
            <Alert variant="destructive">
              <GqaiIcon name="status-error" />
              <AlertTitle>비밀번호를 변경하지 못했습니다</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="resetPassword">새 비밀번호</Label>
            <Input
              id="resetPassword"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resetConfirm">새 비밀번호 확인</Label>
            <Input
              id="resetConfirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={pending} aria-busy={pending}>
            {pending ? "변경 중…" : "비밀번호 변경"}
          </Button>
        </form>
      )}
    </PublicCard>
  );
}

export function RequestAccessView() {
  const [displayName, setDisplayName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  // Honeypot — hidden from people, filled only by form-stuffing bots.
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/account-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, loginId, contact, note, website }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "요청을 접수하지 못했습니다.");
      }
      setDone(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "요청을 접수하지 못했습니다.",
      );
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
              계정 발급 요청
            </CardTitle>
            <CardDescription>
              이름, 사용할 아이디와 이메일을 남기면 강사가 확인 후 계정을 만들어 전달합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <InlineMessage
                kind="success"
                title="요청을 접수했습니다"
                description="강사가 확인 후 아이디와 임시 비밀번호를 전달할 예정입니다."
              />
            ) : (
              <form onSubmit={submit} className="space-y-5">
                {error ? (
                  <Alert variant="destructive">
                    <GqaiIcon name="status-error" />
                    <AlertTitle>요청을 접수하지 못했습니다</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="requestName">이름</Label>
                  <Input
                    id="requestName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestLoginId">사이트에서 사용할 아이디</Label>
                  <Input
                    id="requestLoginId"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    autoCapitalize="none"
                    placeholder="영문 소문자, 숫자, 점, 밑줄, 하이픈"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestContact">이메일</Label>
                  <Input
                    id="requestContact"
                    type="email"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="학습 알림을 받을 이메일 주소"
                    required
                  />
                </div>
                <div
                  aria-hidden="true"
                  style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
                >
                  <label htmlFor="requestWebsite">Website</label>
                  <input
                    id="requestWebsite"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestNote">메모 (선택)</Label>
                  <Input
                    id="requestNote"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="소속 반, 요청 사유 등"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={pending}
                  aria-busy={pending}
                >
                  {pending ? "접수 중…" : "요청 보내기"}
                </Button>
              </form>
            )}
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
