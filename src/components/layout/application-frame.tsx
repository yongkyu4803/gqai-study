"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  History,
  Home,
  Layers3,
  LogOut,
  Mail,
  Menu,
  MessageSquareText,
  Settings,
  UserCog,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { GqaiIcon } from "@/components/common/gqai-icon";
import { ScreenSkeleton } from "@/components/common/page-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useApp } from "@/components/providers/app-provider";
import { cn } from "@/lib/utils";

const publicPaths = new Set(["/", "/login", "/forbidden", "/request-access"]);
const adminNav = [
  {
    href: "/admin",
    label: "운영 홈",
    icon: Home,
    gqaiIcon: "content-data-dashboard",
  },
  {
    href: "/admin/modules",
    label: "실습 모듈",
    icon: Layers3,
    gqaiIcon: "content-issue-paper",
  },
  { href: "/admin/students", label: "학생", icon: UserRound },
  { href: "/admin/groups", label: "그룹", icon: UsersRound },
  {
    href: "/admin/account-requests",
    label: "계정 요청",
    icon: UserPlus,
    gqaiIcon: "status-info",
  },
  {
    href: "/admin/assignments",
    label: "배정 현황",
    icon: ClipboardList,
    gqaiIcon: "content-archive",
  },
  {
    href: "/admin/reviews",
    label: "검토 대기함",
    icon: CheckSquare,
    gqaiIcon: "status-warning",
  },
  {
    href: "/admin/notifications/log",
    label: "발송 로그",
    icon: Mail,
  },
  {
    href: "/admin/account",
    label: "내 계정",
    icon: UserCog,
    gqaiIcon: "status-lock",
  },
  { href: "/admin/settings", label: "설정", icon: Settings },
];
const studentNav = [
  {
    href: "/learn",
    label: "내 학습",
    icon: BookOpen,
    gqaiIcon: "content-issue-paper",
  },
  {
    href: "/feedback",
    label: "피드백",
    icon: MessageSquareText,
    gqaiIcon: "status-info",
  },
  {
    href: "/history",
    label: "완료 기록",
    icon: History,
    gqaiIcon: "content-archive",
  },
  {
    href: "/account",
    label: "내 계정",
    icon: UserRound,
    gqaiIcon: "status-lock",
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/learn") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { session } = useApp();
  const links = session?.role === "admin" ? adminNav : studentNav;
  return (
    <nav aria-label="주요 메뉴" className="space-y-1">
      {links.map(({ href, label, icon: Icon, gqaiIcon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={cn(
            "flex h-10 items-center gap-3 rounded-sm px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            isActive(pathname, href) &&
              "bg-accent font-medium text-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {gqaiIcon ? (
            <GqaiIcon name={gqaiIcon} className="size-5" />
          ) : (
            <Icon className="size-4" />
          )}
          {label}
          {isActive(pathname, href) ? (
            <ChevronRight className="ml-auto size-3.5 text-primary" />
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

function Sidebar() {
  const router = useRouter();
  const { session, mode, logout } = useApp();
  async function signOut() {
    await logout();
    router.replace("/login");
  }
  return (
    <aside className="hidden min-h-dvh w-60 shrink-0 border-r bg-[#fafafa] p-4 lg:flex lg:flex-col">
      <Link
        href={session?.role === "admin" ? "/admin" : "/learn"}
        className="mb-8 flex items-center gap-2 px-2"
      >
        <span className="flex size-7 items-center justify-center rounded-md bg-[#171717] text-xs font-semibold text-white">
          G
        </span>
        <span className="font-medium tracking-tight">GQAI Study</span>
      </Link>
      <NavLinks />
      <div className="mt-auto border-t pt-4">
        <div className="mb-3 px-2">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">
              {session?.displayName}
            </p>
            <Badge
              variant="outline"
              className="rounded-md px-1.5 py-0 text-[10px]"
            >
              {session?.role === "admin" ? "강사" : "학생"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "demo" ? "데모 데이터" : "Supabase 연결"}
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="size-4" />
          로그아웃
        </Button>
      </div>
    </aside>
  );
}

function MobileHeader() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { session, logout } = useApp();
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white/95 px-5 backdrop-blur lg:hidden">
      <Link
        href={session?.role === "admin" ? "/admin" : "/learn"}
        className="flex items-center gap-2 font-medium"
      >
        <span className="flex size-7 items-center justify-center rounded-md bg-[#171717] text-xs font-semibold text-white">
          G
        </span>
        GQAI Study
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="outline" size="icon" aria-label="메뉴 열기" />
          }
        >
          <Menu className="size-4" />
        </SheetTrigger>
        <SheetContent side="right" className="w-[286px] p-4">
          <SheetHeader className="px-2">
            <SheetTitle className="text-left">
              {session?.displayName}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
          <Button
            variant="ghost"
            className="mt-6 w-full justify-start gap-3 text-muted-foreground"
            onClick={async () => {
              await logout();
              setOpen(false);
              router.replace("/login");
            }}
          >
            <LogOut className="size-4" />
            로그아웃
          </Button>
        </SheetContent>
      </Sheet>
    </header>
  );
}

export function ApplicationFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, session } = useApp();
  const isPublic = publicPaths.has(pathname);
  useEffect(() => {
    if (!ready || isPublic) return;
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (session.mustChangePassword && pathname !== "/change-password") {
      router.replace("/change-password");
      return;
    }
    if (pathname.startsWith("/admin") && session.role !== "admin")
      router.replace("/forbidden");
    if (
      !pathname.startsWith("/admin") &&
      session.role === "admin" &&
      pathname !== "/change-password"
    )
      router.replace("/admin");
  }, [isPublic, pathname, ready, router, session]);
  if (isPublic) return <>{children}</>;
  if (!ready || !session) return <ScreenSkeleton />;
  const forbiddenRole =
    (pathname.startsWith("/admin") && session.role !== "admin") ||
    (!pathname.startsWith("/admin") &&
      session.role === "admin" &&
      pathname !== "/change-password");
  if (forbiddenRole) return <ScreenSkeleton />;
  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <MobileHeader />
        <main className="content-wrap py-7 sm:py-9">{children}</main>
      </div>
    </div>
  );
}
