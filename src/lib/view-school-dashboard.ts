import { SCHOOLS_APP_URL } from "@/config/api";

// Requests a short-lived "view as principal" token for a school and opens
// its dashboard in a new tab. Throws with a message suitable for a toast on
// failure (e.g. no active principal yet, insufficient permission).
export async function viewSchoolDashboard(schoolId: string): Promise<void> {
  const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
  const response = await fetch(API_ENDPOINTS.SCHOOLS.VIEW_DASHBOARD(schoolId), createFetchOptions('POST'));
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to open school dashboard.');
  }

  const baseUrl = SCHOOLS_APP_URL && !SCHOOLS_APP_URL.includes('localhost')
    ? SCHOOLS_APP_URL
    : 'https://noteswift-schools.vercel.app';
  const url = `${baseUrl}/admin-preview?token=${encodeURIComponent(data.token)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
