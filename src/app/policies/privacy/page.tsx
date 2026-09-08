import type { Metadata } from "next";
import { PolicyPage, PolicySection } from "@/components/policies/policy-page";
import { ACCOUNT_POLICY_VERSION } from "@/lib/domain/account-policy";

export const metadata: Metadata = {
  title: "개인정보 처리방침 | GQAI Study",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title="개인정보 처리방침"
      description="GQAI Study가 계정 신청과 개인 맞춤형 학습 운영을 위해 어떤 정보를 받고 사용하는지 안내합니다."
    >
      <PolicySection title="1. 수집하는 정보">
        <p>
          계정 신청 시 이름, 로그인 아이디, 이메일 주소와 사전 설문 응답(사용
          환경, AI·서비스 사용 경험, 활용 수준, 학습 목표)을 받으며 신청자가
          선택해 적은 메모를 함께 받을 수 있습니다. 전화번호는 수집하지
          않습니다.
        </p>
        <p>
          신청자가 정한 비밀번호는 인증 시스템으로만 전달되어 암호화된 형태로
          처리됩니다. 서비스 데이터베이스에 원문 비밀번호를 저장하지 않으며
          관리자도 비밀번호를 확인할 수 없습니다.
        </p>
        <p>
          계정 승인 후에는 맞춤 학습을 위해 배정 모듈, 학습 진행 상태, 제출
          결과, 피드백과 문의 내역이 생성·저장될 수 있습니다.
        </p>
      </PolicySection>

      <PolicySection title="2. 이용 목적">
        <p>
          수집한 정보는 계정 신청 확인과 승인, 본인 로그인, 학습 알림과 비밀번호
          재설정, 개인·그룹별 학습 운영, 학습자 상황에 맞는 다음 모듈 제공 및
          문의 대응에 사용합니다.
        </p>
      </PolicySection>

      <PolicySection title="3. 보관과 삭제">
        <p>
          계정과 학습 기록은 서비스 제공과 학습 이력 관리에 필요한 동안
          보관합니다. 승인하지 않은 신청도 중복 신청 방지와 운영 기록 확인을
          위해 보관할 수 있습니다. 삭제가 필요한 경우 로그인 후 문의하기를
          이용하거나 계정 신청 메모를 통해 운영자에게 요청할 수 있습니다.
        </p>
        <p>
          관계 법령에서 별도 보관을 요구하는 정보는 해당 기간 동안 분리해 보관한
          뒤 삭제합니다.
        </p>
      </PolicySection>

      <PolicySection title="4. 이용하는 외부 서비스">
        <p>
          안정적인 운영을 위해 Supabase(인증·데이터베이스·파일 저장), Vercel(웹
          서비스 호스팅), Resend(이메일 발송)를 이용할 수 있습니다. 각
          서비스에는 기능 제공에 필요한 최소 정보만 전달합니다.
        </p>
      </PolicySection>

      <PolicySection title="5. 이용자의 권리와 문의">
        <p>
          이용자는 자신의 정보를 확인·수정하거나 계정 비활성화 및 정보 삭제를
          요청할 수 있습니다. 로그인 후 문의하기에 요청 내용을 남기면 운영자가
          확인하여 안내합니다. 계정이 없는 신청자는 계정 신청 메모에 요청 내용을
          남길 수 있습니다.
        </p>
      </PolicySection>

      <PolicySection title="6. 정책 변경">
        <p>
          중요한 내용이 바뀌면 시행 전에 사이트 공지사항 또는 이메일로
          안내합니다. 현재 정책 버전은 {ACCOUNT_POLICY_VERSION}입니다.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
