import type { Profile } from "@/lib/domain/types";

export type StudentStatusFilter = "all" | "active" | "inactive";
export type StudentJoinedFilter = "all" | "7d" | "30d" | "90d" | "over90d";
export type StudentLoginFilter = "all" | "7d" | "30d" | "over30d" | "never";

export const STUDENT_STATUS_OPTIONS: {
  value: StudentStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "모든 계정" },
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
];

export const STUDENT_JOINED_OPTIONS: {
  value: StudentJoinedFilter;
  label: string;
}[] = [
  { value: "all", label: "전체 기간" },
  { value: "7d", label: "최근 7일" },
  { value: "30d", label: "최근 30일" },
  { value: "90d", label: "최근 90일" },
  { value: "over90d", label: "90일 이전" },
];

export const STUDENT_LOGIN_OPTIONS: {
  value: StudentLoginFilter;
  label: string;
}[] = [
  { value: "all", label: "전체" },
  { value: "7d", label: "최근 7일 이내" },
  { value: "30d", label: "최근 30일 이내" },
  { value: "over30d", label: "30일 이상 미접속" },
  { value: "never", label: "로그인 기록 없음" },
];

const DAY = 24 * 60 * 60 * 1000;

/** 기준 시각으로부터 며칠 지났는지. 값이 없거나 형식이 틀리면 null. */
export function daysSince(value: string | undefined, now: number) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return (now - time) / DAY;
}

function matchesJoined(
  student: Profile,
  filter: StudentJoinedFilter,
  now: number,
) {
  if (filter === "all") return true;
  const days = daysSince(student.createdAt, now);
  // 가입일을 읽을 수 없는 계정은 기간을 단정할 수 없으므로 기간 필터에서 제외한다.
  if (days === null) return false;
  if (filter === "over90d") return days > 90;
  const limit = filter === "7d" ? 7 : filter === "30d" ? 30 : 90;
  return days <= limit;
}

function matchesLogin(
  student: Profile,
  filter: StudentLoginFilter,
  now: number,
) {
  if (filter === "all") return true;
  const days = daysSince(student.lastLoginAt, now);
  if (filter === "never") return days === null;
  if (days === null) return false;
  if (filter === "over30d") return days > 30;
  return days <= (filter === "7d" ? 7 : 30);
}

export interface StudentFilterOptions {
  query?: string;
  status?: StudentStatusFilter;
  joined?: StudentJoinedFilter;
  login?: StudentLoginFilter;
  now?: number;
}

export function filterStudents(
  profiles: Profile[],
  {
    query = "",
    status = "all",
    joined = "all",
    login = "all",
    now = Date.now(),
  }: StudentFilterOptions = {},
) {
  const keyword = query.trim().toLowerCase();
  return profiles.filter((student) => {
    if (student.role !== "student") return false;
    if (status !== "all" && student.isActive !== (status === "active")) {
      return false;
    }
    if (
      keyword &&
      !`${student.displayName} ${student.loginId}`
        .toLowerCase()
        .includes(keyword)
    ) {
      return false;
    }
    return (
      matchesJoined(student, joined, now) && matchesLogin(student, login, now)
    );
  });
}

export type StudentSortKey = "name" | "joined" | "login";
export type StudentSortDirection = "asc" | "desc";
export interface StudentSort {
  key: StudentSortKey;
  direction: StudentSortDirection;
}

// 운영 DB가 이름순으로 내려주던 순서를 기본값으로 유지한다.
export const DEFAULT_STUDENT_SORT: StudentSort = {
  key: "name",
  direction: "asc",
};

export const STUDENT_SORT_LABELS: Record<StudentSortKey, string> = {
  name: "학생",
  joined: "가입일",
  login: "마지막 로그인",
};

/** 날짜 열은 최신순이, 이름은 가나다순이 처음 눌렀을 때 기대하는 방향이다. */
export function initialSortDirection(
  key: StudentSortKey,
): StudentSortDirection {
  return key === "name" ? "asc" : "desc";
}

export function toggleStudentSort(
  current: StudentSort,
  key: StudentSortKey,
): StudentSort {
  if (current.key !== key) return { key, direction: initialSortDirection(key) };
  return {
    key,
    direction: current.direction === "asc" ? "desc" : "asc",
  };
}

function timeValue(value?: string) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function compareByName(left: Profile, right: Profile) {
  return (
    left.displayName.localeCompare(right.displayName, "ko") ||
    left.loginId.localeCompare(right.loginId, "ko")
  );
}

export function sortStudents(profiles: Profile[], sort: StudentSort) {
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...profiles].sort((left, right) => {
    if (sort.key === "name") return compareByName(left, right) * factor;
    const leftTime = timeValue(
      sort.key === "joined" ? left.createdAt : left.lastLoginAt,
    );
    const rightTime = timeValue(
      sort.key === "joined" ? right.createdAt : right.lastLoginAt,
    );
    // 값이 없는 계정은 방향과 무관하게 항상 끝으로 보낸다.
    if (leftTime === null && rightTime === null) {
      return compareByName(left, right);
    }
    if (leftTime === null) return 1;
    if (rightTime === null) return -1;
    if (leftTime === rightTime) return compareByName(left, right);
    return (leftTime - rightTime) * factor;
  });
}

/** 마지막 로그인을 목록에서 한눈에 읽을 수 있게 상대 표현으로 바꾼다. */
export function formatLastLogin(value: string | undefined, now = Date.now()) {
  const days = daysSince(value, now);
  if (days === null) return "기록 없음";
  if (days < 0) return "방금";
  if (days < 1) return "오늘";
  if (days < 2) return "어제";
  if (days < 30) return `${Math.floor(days)}일 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}
