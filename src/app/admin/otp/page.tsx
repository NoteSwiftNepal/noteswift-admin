import { Suspense } from "react";
import AdminOtpForm from "./AdminOtpForm";

export default function AdminOtpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminOtpForm />
    </Suspense>
  );
}