import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  adminGuardStatus: vi.fn(() => 500),
}));

vi.mock("@/lib/supabase/auth-guard", () => mocks);

function makeClient({
  item = {
    storage_path: "student/assignment/submission/result.pdf",
    original_name: "결과물.pdf",
    mime_type: "application/pdf",
  },
  file = new Blob(["result"], { type: "application/pdf" }),
  itemError = null,
  fileError = null,
}: {
  item?: {
    storage_path: string | null;
    original_name: string | null;
    mime_type: string | null;
  } | null;
  file?: Blob | null;
  itemError?: unknown;
  fileError?: unknown;
} = {}) {
  const maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: item, error: itemError });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const download = vi.fn().mockResolvedValue({ data: file, error: fileError });
  return {
    from: vi.fn(() => ({ select })),
    storage: { from: vi.fn(() => ({ download })) },
    download,
  };
}

function request() {
  return GET(
    new Request(
      "https://example.test/api/admin/submission-items/item-1/download",
    ),
    {
      params: Promise.resolve({ itemId: "item-1" }),
    },
  );
}

describe("관리자 제출 파일 다운로드", () => {
  beforeEach(() => vi.clearAllMocks());

  it("관리자가 해당 제출 항목의 파일을 첨부 다운로드로 받는다", async () => {
    const client = makeClient();
    mocks.requireAdmin.mockResolvedValue({ client });

    const response = await request();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("result");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain(
      "%EA%B2%B0%EA%B3%BC%EB%AC%BC.pdf",
    );
    expect(client.download).toHaveBeenCalledWith(
      "student/assignment/submission/result.pdf",
    );
  });

  it("텍스트 제출 또는 없어진 파일에는 다운로드 응답을 만들지 않는다", async () => {
    const client = makeClient({
      item: { storage_path: null, original_name: null, mime_type: null },
    });
    mocks.requireAdmin.mockResolvedValue({ client });

    await expect(request()).resolves.toMatchObject({ status: 404 });
    expect(client.download).not.toHaveBeenCalled();
  });

  it("인증 실패는 파일 존재 여부를 노출하지 않는다", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("UNAUTHENTICATED"));
    mocks.adminGuardStatus.mockReturnValue(401);

    const response = await request();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "제출 파일을 내려받지 못했습니다.",
    });
  });
});
