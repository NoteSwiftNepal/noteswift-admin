import { AlertTriangle } from "lucide-react";

// Shown on pages whose money figures still use the old counting (backend
// CRM_IMPLEMENTATION.md §2.1–2.2, §8): every "completed" transaction counts,
// including Rs 0 free grants and whole bulk-code batches. Remove once Phase 6
// moves these pages to the qualifying-payment definitions.
export function UnverifiedMetricsNotice() {
  return (
    <div role="note" className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>
        These figures count every completed transaction, including Rs 0 free grants and whole bulk-code batches.
        Don&apos;t use them for financial or commission decisions until they are corrected.
      </p>
    </div>
  );
}
