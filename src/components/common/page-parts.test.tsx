import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InlineMessage, StatusBadge } from "./page-parts";
import type { AssignmentStatus } from "@/lib/domain/types";

describe("GQAI 상태 컴포넌트", () => {
  it("알 수 없는 상태를 성공으로 추정하지 않고 중립 문구로 표시한다", () => {
    const { container } = render(
      <StatusBadge value={"unexpected" as AssignmentStatus} />,
    );

    expect(screen.getByText("상태 미확인")).toBeInTheDocument();
    expect(screen.queryByText("unexpected")).not.toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it("복구가 필요한 오류를 지속적인 라이브 영역으로 표시한다", () => {
    render(
      <InlineMessage
        kind="error"
        title="저장하지 못했습니다"
        description="입력 내용은 유지됐습니다. 다시 시도하세요."
      />,
    );

    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByText(/입력 내용은 유지됐습니다/)).toBeVisible();
  });
});
