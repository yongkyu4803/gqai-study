import { Suspense } from "react";
import { StudentsView } from "@/components/admin/people-view";
export default function StudentsPage() {
  return (
    <Suspense>
      <StudentsView />
    </Suspense>
  );
}
