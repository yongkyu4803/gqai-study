import { Suspense } from "react";
import { ResetPasswordView } from "@/components/auth/auth-views";
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordView />
    </Suspense>
  );
}
