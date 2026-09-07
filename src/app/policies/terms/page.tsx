import type { Metadata } from "next";
import { PolicyPage, PolicySection } from "@/components/policies/policy-page";

export const metadata: Metadata = {
  title: "이용정책 | GQAI Study",
};

export default function TermsPolicyPage() {
  return (
    <PolicyPage
      title="이용정책"
      description="GQAI Study의 계정 승인, 학습 참여와 서비스 이용에 관한 기본 운영 원칙입니다."
    >
      <PolicySection title="1. 서비스의 목적">
        <p>
          GQAI Study는 AI의 기본기를 익히고 이를 자신의 업무나 관심사에
          접목하도록 돕는 개인 맞춤형 학습 공간입니다. 학습 결과를 바탕으로 다음
          모듈을 제공하며, 개인 또는 그룹 단위로 참여할 수 있습니다.
        </p>
      </PolicySection>

      <PolicySection title="2. 계정 신청과 승인">
        <p>
          신청자는 사용할 아이디와 비밀번호를 직접 정하고, 필수 이메일 주소를
          제출합니다. 관리자는 신청 내용을 확인해 계정 발급 여부만 승인합니다.
          신청했다고 계정이 자동 승인되는 것은 아닙니다.
        </p>
        <p>
          비밀번호는 8자 이상 72자 이하이며 영문 대문자와 숫자를 각각 1개 이상
          포함해야 합니다. 타인과 계정을 공유하지 말고 본인이 안전하게 관리해야
          합니다.
        </p>
      </PolicySection>

      <PolicySection title="3. 이용 요금">
        <p>
          사이트에서 제공하는 온라인 학습은 무료입니다. 오프라인 강의는 원하는
          수강생에 한해 별도로 진행하며, 일정과 수강료는 사전에 협의합니다.
        </p>
      </PolicySection>

      <PolicySection title="4. 학습 참여와 계정 상태">
        <p>
          꾸준히 학습하는 동안 온라인 학습을 계속 무료로 이용할 수 있습니다.
          다만 일정 기간 학습 진도가 없거나 운영상 확인이 필요한 경우 계정이
          비활성화될 수 있습니다. 다시 학습하려면 문의하기를 통해 재활성화를
          요청할 수 있습니다.
        </p>
      </PolicySection>

      <PolicySection title="5. 그룹 및 외부 대화방">
        <p>
          개인 학습 중 그룹을 만들거나 기존 그룹에 참여할 수 있습니다. 희망자가
          여는 카카오톡 등 외부 대화방 참여는 선택 사항이며, 해당 서비스의
          정책과 참여자 간 기본 예절을 함께 지켜야 합니다.
        </p>
      </PolicySection>

      <PolicySection title="6. 이용 제한">
        <p>
          다른 사람의 계정이나 학습 결과를 도용하는 행위, 서비스 운영을 방해하는
          행위, 타인의 개인정보 또는 권리를 침해하는 행위가 확인되면 안내 후
          이용을 제한할 수 있습니다.
        </p>
      </PolicySection>

      <PolicySection title="7. 정책 변경과 문의">
        <p>
          운영 방식이 크게 바뀌는 경우 사이트 공지사항 또는 이메일로 안내합니다.
          이용 중 궁금한 점이나 계정 관련 요청은 로그인 후 문의하기에 남길 수
          있습니다. 현재 정책 버전은 2026-09-07입니다.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
