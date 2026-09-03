import { Suspense } from "react";
import { LoginView } from "@/components/auth/auth-views";
export default function LoginPage() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
