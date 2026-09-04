import { Suspense } from "react";
import { StudentsView } from "@/components/admin/people-view";
export default function NewStudentPage() {
  return (
    <Suspense>
      <StudentsView createOnly />
    </Suspense>
  );
}
