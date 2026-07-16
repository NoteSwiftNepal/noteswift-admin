import { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

// Shared shell for every login-related screen (login, phone setup, OTP,
// signup) so they read as one consistent, minimal flow instead of each
// hand-rolling its own card chrome.
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo-mark.png"
            alt="NoteSwift Logo"
            className="mb-3 h-24 w-24 object-contain"
          />
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
          {description && (
            <p className="mt-1.5 text-sm text-gray-500">{description}</p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-gray-500">{footer}</div>}
      </div>
    </main>
  );
}
