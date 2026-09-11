import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RequestAccessView } from "./auth-views";

vi.mock("@/components/providers/app-provider", () => ({ useApp: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

describe("계정 신청 비밀번호 검증", () => {
  it("입력과 확인 값 변경에 따라 규칙과 제출 가능 여부를 갱신한다", () => {
    render(<RequestAccessView />);
    const password = screen.getByLabelText("사용할 비밀번호");
    const confirm = screen.getByLabelText("비밀번호 확인");
    const submit = screen.getByRole("button", { name: "요청 보내기" });
    const rules = screen.getByRole("list", { name: "비밀번호 규칙" });
    expect(within(rules).getAllByText("입력 전")).toHaveLength(4);
    expect(submit).toBeDisabled();

    fireEvent.change(password, { target: { value: "abcdefgh" } });
    expect(within(rules).getAllByText("미충족")).toHaveLength(2);
    expect(password).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(password, { target: { value: "Abcdefg1" } });
    expect(within(rules).getAllByText("충족")).toHaveLength(4);
    expect(submit).toBeDisabled();
    fireEvent.change(confirm, { target: { value: "Abcdefg2" } });
    expect(screen.getByRole("status")).toHaveTextContent(
      "비밀번호가 일치하지 않습니다.",
    );
    expect(submit).toBeDisabled();
    fireEvent.change(confirm, { target: { value: "Abcdefg1" } });
    expect(submit).toBeEnabled();
    fireEvent.change(password, { target: { value: "Abcdefg2" } });
    expect(submit).toBeDisabled();
    expect(confirm).toHaveAttribute("aria-invalid", "true");
  });

  it("제출 이벤트를 직접 실행해도 잘못된 비밀번호를 서버로 보내지 않는다", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<RequestAccessView />);
    const password = screen.getByLabelText("사용할 비밀번호");
    const confirm = screen.getByLabelText("비밀번호 확인");
    const form = password.closest("form")!;
    for (const value of [
      "Short1",
      "abcdefgh1",
      "Abcdefgh",
      "A1" + "a".repeat(71),
    ]) {
      fireEvent.change(password, { target: { value } });
      fireEvent.change(confirm, { target: { value } });
      fireEvent.submit(form);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(password).toHaveValue(value);
    }
    fireEvent.change(password, { target: { value: "Abcdefg1" } });
    fireEvent.change(confirm, { target: { value: "Abcdefg2" } });
    fireEvent.submit(form);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("규칙과 확인을 충족한 비밀번호를 그대로 전송한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<RequestAccessView />);
    fireEvent.change(screen.getByLabelText("이름"), {
      target: { value: "신청자" },
    });
    fireEvent.change(screen.getByLabelText("사이트에서 사용할 아이디"), {
      target: { value: "learner" },
    });
    fireEvent.change(screen.getByLabelText("이메일 (필수)"), {
      target: { value: "learner@example.com" },
    });
    fireEvent.change(screen.getByLabelText("사용할 비밀번호"), {
      target: { value: "Abcdefg1" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호 확인"), {
      target: { value: "Abcdefg1" },
    });
    fireEvent.click(screen.getByLabelText("사용 안 함"));
    fireEvent.change(
      screen.getByLabelText("구체적으로 어떻게 활용하고 계신가요? (필수)"),
      { target: { value: "아직 사용해 보지 않았습니다." } },
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /개인정보 처리방침/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "요청 보내기" }));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      password: "Abcdefg1",
      policyAccepted: true,
      survey: {
        aiTools: ["none"],
        aiSkillDetail: "아직 사용해 보지 않았습니다.",
      },
    });
    await screen.findByText("요청을 접수했습니다");
  });

  it("사전 설문을 채우지 않으면 모달로 이유를 보여준다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<RequestAccessView />);
    fireEvent.change(screen.getByLabelText("이름"), {
      target: { value: "신청자" },
    });
    fireEvent.change(screen.getByLabelText("사이트에서 사용할 아이디"), {
      target: { value: "learner" },
    });
    fireEvent.change(screen.getByLabelText("이메일 (필수)"), {
      target: { value: "learner@example.com" },
    });
    fireEvent.change(screen.getByLabelText("사용할 비밀번호"), {
      target: { value: "Abcdefg1" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호 확인"), {
      target: { value: "Abcdefg1" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: /개인정보 처리방침/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "요청 보내기" }));
    expect(fetchMock).not.toHaveBeenCalled();
    await screen.findByText("신청을 접수하지 못했습니다");
  });

  it("서버가 요청을 거부하면 모달로 이유를 보여준다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "이미 사용 중인 아이디입니다." }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<RequestAccessView />);
    fireEvent.change(screen.getByLabelText("이름"), {
      target: { value: "신청자" },
    });
    fireEvent.change(screen.getByLabelText("사이트에서 사용할 아이디"), {
      target: { value: "learner" },
    });
    fireEvent.change(screen.getByLabelText("이메일 (필수)"), {
      target: { value: "learner@example.com" },
    });
    fireEvent.change(screen.getByLabelText("사용할 비밀번호"), {
      target: { value: "Abcdefg1" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호 확인"), {
      target: { value: "Abcdefg1" },
    });
    fireEvent.click(screen.getByLabelText("사용 안 함"));
    fireEvent.change(
      screen.getByLabelText("구체적으로 어떻게 활용하고 계신가요? (필수)"),
      { target: { value: "아직 사용해 보지 않았습니다." } },
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /개인정보 처리방침/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "요청 보내기" }));
    await screen.findByText("신청을 접수하지 못했습니다");
    await screen.findByText("이미 사용 중인 아이디입니다.");
  });
});
