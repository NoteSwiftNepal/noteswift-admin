"use client";

import { Suspense } from "react";
import { AdminSignupForm } from "./AdminSignupForm";

export default function AdminSignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    }>
      <AdminSignupForm />
    </Suspense>
  );
}