import { describe, expect, it } from "vitest";
import type { Profile } from "@/lib/domain/types";
import { filterStudents, formatLastLogin } from "./student-filters";

const NOW = new Date("2026-09-11T09:00:00.000Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number) {
  return new Date(NOW - days * DAY).toISOString();
}

function student(overrides: Partial<Profile> & { id: string }): Profile {
  return {
    role: "student",
    loginId: overrides.id,
    displayName: overrides.id,
    mustChangePassword: false,
    mustCompleteSurvey: false,
    isActive: true,
    createdAt: daysAgo(10),
    ...overrides,
  };
}

const 새내기 = student({
  id: "새내기",
  displayName: "김민지",
  loginId: "minji",
  createdAt: daysAgo(3),
  lastLoginAt: daysAgo(1),
});
const 최근접속 = student({
  id: "최근접속",
  createdAt: daysAgo(45),
  lastLoginAt: daysAgo(20),
});
const 장기미접속 = student({
  id: "장기미접속",
  createdAt: daysAgo(200),
  lastLoginAt: daysAgo(120),
});
const 로그인없음 = student({
  id: "로그인없음",
  createdAt: daysAgo(200),
  isActive: false,
});
const admin: Profile = {
  ...student({ id: "admin" }),
  role: "admin",
};

const everyone = [새내기, 최근접속, 장기미접속, 로그인없음, admin];

function ids(profiles: Profile[]) {
  return profiles.map((profile) => profile.id);
}

describe("학생 목록 필터", () => {
  it("학생이 아닌 프로필은 제외한다", () => {
    expect(ids(filterStudents(everyone, { now: NOW }))).toEqual([
      "새내기",
      "최근접속",
      "장기미접속",
      "로그인없음",
    ]);
  });

  it("이름과 아이디를 함께 검색한다", () => {
    expect(ids(filterStudents(everyone, { query: "민지", now: NOW }))).toEqual([
      "새내기",
    ]);
    expect(ids(filterStudents(everyone, { query: "MINJI", now: NOW }))).toEqual(
      ["새내기"],
    );
    expect(
      ids(filterStudents(everyone, { query: "  minji  ", now: NOW })),
    ).toEqual(["새내기"]);
  });

  it("계정 상태로 거른다", () => {
    expect(
      ids(filterStudents(everyone, { status: "inactive", now: NOW })),
    ).toEqual(["로그인없음"]);
  });

  it("가입일 기간으로 거른다", () => {
    expect(ids(filterStudents(everyone, { joined: "7d", now: NOW }))).toEqual([
      "새내기",
    ]);
    expect(ids(filterStudents(everyone, { joined: "90d", now: NOW }))).toEqual([
      "새내기",
      "최근접속",
    ]);
    expect(
      ids(filterStudents(everyone, { joined: "over90d", now: NOW })),
    ).toEqual(["장기미접속", "로그인없음"]);
  });

  it("마지막 로그인으로 거른다", () => {
    expect(ids(filterStudents(everyone, { login: "7d", now: NOW }))).toEqual([
      "새내기",
    ]);
    expect(ids(filterStudents(everyone, { login: "30d", now: NOW }))).toEqual([
      "새내기",
      "최근접속",
    ]);
    expect(
      ids(filterStudents(everyone, { login: "over30d", now: NOW })),
    ).toEqual(["장기미접속"]);
  });

  it("로그인 기록이 없는 계정을 따로 찾는다", () => {
    expect(ids(filterStudents(everyone, { login: "never", now: NOW }))).toEqual(
      ["로그인없음"],
    );
  });

  it("로그인 기록이 없는 계정은 기간 필터에 걸리지 않는다", () => {
    expect(
      ids(filterStudents(everyone, { login: "over30d", now: NOW })),
    ).not.toContain("로그인없음");
  });

  it("여러 조건을 함께 적용한다", () => {
    expect(
      ids(
        filterStudents(everyone, {
          status: "active",
          joined: "over90d",
          login: "over30d",
          now: NOW,
        }),
      ),
    ).toEqual(["장기미접속"]);
  });

  it("날짜 형식이 깨진 값 때문에 목록이 비지 않는다", () => {
    const broken = student({ id: "깨짐", createdAt: "언젠가" });
    expect(ids(filterStudents([broken, 새내기], { now: NOW }))).toEqual([
      "깨짐",
      "새내기",
    ]);
    expect(
      ids(filterStudents([broken, 새내기], { joined: "7d", now: NOW })),
    ).toEqual(["새내기"]);
  });
});

describe("마지막 로그인 표기", () => {
  it("기록이 없으면 그렇게 알린다", () => {
    expect(formatLastLogin(undefined, NOW)).toBe("기록 없음");
    expect(formatLastLogin("언젠가", NOW)).toBe("기록 없음");
  });

  it("경과 시간을 사람이 읽는 단위로 줄인다", () => {
    expect(formatLastLogin(daysAgo(0), NOW)).toBe("오늘");
    expect(formatLastLogin(daysAgo(1), NOW)).toBe("어제");
    expect(formatLastLogin(daysAgo(5), NOW)).toBe("5일 전");
    expect(formatLastLogin(daysAgo(60), NOW)).toBe("2개월 전");
    expect(formatLastLogin(daysAgo(400), NOW)).toBe("1년 전");
  });

  it("시계가 어긋나 미래 시각이 들어와도 깨지지 않는다", () => {
    expect(formatLastLogin(daysAgo(-1), NOW)).toBe("방금");
  });
});
