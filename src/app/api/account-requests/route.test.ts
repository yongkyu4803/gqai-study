import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptySurveyAnswers } from "@/lib/domain/survey";
import { POST } from "./route";
import { PATCH } from "../admin/account-requests/[requestId]/route";

const mocks = vi.hoisted(() => ({ createAdmin: vi.fn(), guard: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createAdmin,
}));
vi.mock("@/lib/supabase/auth-guard", () => ({
  requireAdmin: mocks.guard,
  adminGuardStatus: () => 500,
}));
vi.mock("@/lib/server/email", () => ({ sendAndLogEmail: vi.fn() }));

const survey = {
  ...createEmptySurveyAnswers(),
  aiTools: ["none"],
  aiSkillDetail: "처음 배우려고 합니다.",
};
const input = {
  displayName: "학습자",
  loginId: "learner",
  email: "learner@example.com",
  password: "Learning1",
  policyAccepted: true,
  survey,
};
const accountRequest = {
  id: "request-id",
  display_name: "학습자",
  requested_login_id: "learner",
  contact: "learner@example.com",
  status: "pending",
  auth_user_id: "new-student",
  survey_answers: survey,
  created_at: "2026-09-08T00:00:00Z",
};

type Operation = {
  table: string;
  action: string;
  payload?: Record<string, unknown>;
};
function database(
  options: {
    legacy?: boolean;
    failSurvey?: boolean;
    failRequest?: boolean;
    failUnban?: boolean;
  } = {},
) {
  const operations: Operation[] = [];
  const auth = {
    createUser: vi
      .fn()
      .mockResolvedValue({
        data: { user: { id: "new-student" } },
        error: null,
      }),
    deleteUser: vi.fn().mockResolvedValue({ error: null }),
    updateUserById: vi
      .fn()
      .mockResolvedValue({
        error: options.failUnban ? { message: "unban failed" } : null,
      }),
  };
  const from = (table: string) => {
    const op: Operation = { table, action: "select" };
    const query = {
      select: () => query,
      eq: () => query,
      gte: () => query,
      insert: (payload: Record<string, unknown>) => {
        op.action = "insert";
        op.payload = payload;
        return query;
      },
      update: (payload: Record<string, unknown>) => {
        op.action = "update";
        op.payload = payload;
        return query;
      },
      delete: () => {
        op.action = "delete";
        return query;
      },
      single: () => query,
      maybeSingle: () => query,
      then: (resolve: (value: unknown) => unknown) => {
        operations.push(op);
        let data: unknown = null;
        let error: unknown = null;
        if (table === "gqai_aistudy_account_requests") {
          data =
            op.action === "select"
              ? {
                  ...accountRequest,
                  survey_answers: options.legacy ? null : survey,
                }
              : { id: "request-id" };
          // POST duplicate checks should be empty, selected by test below.
          if (op.action === "insert" && options.failRequest)
            error = { message: "insert failed" };
        }
        if (table === "gqai_aistudy_survey_responses" && options.failSurvey)
          error = { message: "survey failed" };
        return Promise.resolve({ data, error, count: 0 }).then(resolve);
      },
    };
    return query;
  };
  const admin = { from, auth: { admin: auth } };
  mocks.createAdmin.mockReturnValue(admin);
  return { admin, operations, auth };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.guard.mockResolvedValue({ user: { id: "admin-id" } });
});

function approve() {
  return PATCH(
    new Request("https://example.test/api/admin/account-requests/request-id", {
      method: "PATCH",
      body: JSON.stringify({ status: "approved" }),
    }),
    { params: Promise.resolve({ requestId: "request-id" }) },
  );
}

describe("신청 단계 사전 설문 저장과 승인", () => {
  it("설문이 없는 새 신청은 인증 계정을 만들기 전에 거부한다", async () => {
    const db = database();
    const response = await POST(
      new Request("https://example.test/api/account-requests", {
        method: "POST",
        body: JSON.stringify({ ...input, survey: undefined }),
      }),
    );
    expect(response.status).toBe(400);
    expect(db.auth.createUser).not.toHaveBeenCalled();
  });

  it("신청 정보에 설문을 함께 저장하고 비밀번호는 DB에 저장하지 않는다", async () => {
    const db = database();
    const originalFrom = db.admin.from;
    // All pre-creation duplicate lookups in POST use maybeSingle.
    db.admin.from = (table) => {
      const query = originalFrom(table);
      query.maybeSingle = () =>
        ({
          then: (resolve: (value: unknown) => unknown) =>
            Promise.resolve({ data: null, error: null }).then(resolve),
        }) as typeof query;
      return query;
    };
    const response = await POST(
      new Request("https://example.test/api/account-requests", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(201);
    const insert = db.operations.find(
      (op) =>
        op.table === "gqai_aistudy_account_requests" && op.action === "insert",
    );
    expect(insert?.payload).toMatchObject({
      survey_answers: survey,
      auth_user_id: "new-student",
    });
    expect(insert?.payload).not.toHaveProperty("password");
  });

  it("승인 시 신청 당시 답변과 제출 시각을 학생 기록으로 옮긴다", async () => {
    const db = database();
    expect((await approve()).status).toBe(200);
    expect(db.operations).toContainEqual({
      table: "gqai_aistudy_survey_responses",
      action: "insert",
      payload: {
        student_id: "new-student",
        answers: survey,
        submitted_at: accountRequest.created_at,
        updated_at: accountRequest.created_at,
      },
    });
    expect(
      db.operations.find(
        (op) => op.table === "gqai_aistudy_profiles" && op.action === "insert",
      )?.payload,
    ).toMatchObject({ must_complete_survey: false });
  });

  it("설문이 없는 이전 신청도 승인하고 응답을 만들지 않는다", async () => {
    const db = database({ legacy: true });
    expect((await approve()).status).toBe(200);
    expect(
      db.operations.some((op) => op.table === "gqai_aistudy_survey_responses"),
    ).toBe(false);
    expect(
      db.operations.find(
        (op) => op.table === "gqai_aistudy_profiles" && op.action === "insert",
      )?.payload,
    ).toMatchObject({ must_complete_survey: false });
  });

  it("설문 저장 실패 시 프로필을 되돌리고 계정을 활성화하지 않는다", async () => {
    const db = database({ failSurvey: true });
    expect((await approve()).status).toBe(500);
    expect(db.operations).toContainEqual({
      table: "gqai_aistudy_profiles",
      action: "delete",
    });
    expect(db.auth.updateUserById).not.toHaveBeenCalled();
  });

  it("인증 활성화 실패 시 승인을 되돌리고 프로필을 삭제해 응답도 cascade 정리한다", async () => {
    const db = database({ failUnban: true });
    expect((await approve()).status).toBe(500);
    expect(db.operations).toContainEqual({
      table: "gqai_aistudy_account_requests",
      action: "update",
      payload: { status: "pending", reviewed_by: null, reviewed_at: null },
    });
    expect(db.operations).toContainEqual({
      table: "gqai_aistudy_profiles",
      action: "delete",
    });
  });
});
