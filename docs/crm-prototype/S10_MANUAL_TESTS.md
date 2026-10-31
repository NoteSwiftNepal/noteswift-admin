# Phase S10 manual tests: temporary enrollment (freezable)

For the owner, on **dev** only (local backend on the development database). Tick each box and note anything wrong next to it. **Never point the backend or a script at production.**

## 0. Setup (dev only)

- [ ] Backend `feature/admin-crm` with the dev `MONGODB_URI`. For the freeze checks on the web and in the API, set `CONTENT_ACCESS_GATE=enforce` in the backend `.env` and restart (the default `log` only records).
- [ ] Admin panel from `feature/admin-crm` against `http://localhost:5000`.
- [ ] Student web app and the **mobile build from branch `feat/temporary-enrollment`** (the download clean-up is only on that branch) pointed at the dev backend.
- [ ] A registered student owned by Rita with no course: "[DEMO] Nabin New" (`seedCrmDemoData.ts --s8b` if missing) or a new signup assigned to Rita. Log in as that student on web and mobile (set a password if needed).
- [ ] Logins: Rita (`+crm-sales1`), Bikash (`+crm-sales2`), Sita (`+crm-admin1`), Super Admin. Password `CrmDemo#2026`.

## 1. Give temporary access (Rita)

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Open the student → stage pill → **Temporary enrollment** | Panel: Course (interested courses first), Reason (optional), help line, "Give access now". |
| [ ] | Pick a paid course, reason "exam next week" → Give access now | Toast "Temporary access given". Pill **Temporary enrollment** (accent); Leads tab "Temporary enrollment" +1; Courses: the course "Temporary" with **Freeze**. Activity "Temporary access given: …". No sale in Sales & Bills. |
| [ ] | Student, web and mobile | The course is in "My courses" like a paid one: videos, notes, tests, live class (join a class of that course) all work. Nothing says "temporary". |
| [ ] | If the student had an active trial for that course | The trial is gone (the course is now theirs); the activity says the free trial was closed. |
| [ ] | Users page (Super Admin) → the student | The course shows "Temporary access" / badge "Temporary"; no "Remove from Course" button (a note says to manage it on the lead). |

## 2. Freeze and unfreeze

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Courses → **Freeze** → optional reason → Freeze | Toast "Course frozen". Pill stays "Temporary enrollment" with a grey **Frozen** pill; the course shows "Frozen" with **Unfreeze**. |
| [ ] | Student web (refresh) | The course is gone from "My courses"; opening an old lesson link shows an error (with `enforce`: "Your access to this course has ended…"). |
| [ ] | Student mobile, online | After the app refreshes the course list (pull to refresh or reopen): the course is gone, live class join refused, and **downloaded videos and notes of that course are deleted** from Downloads. |
| [ ] | Student mobile, offline (airplane mode) with a download of the course, freeze it, keep the phone offline | The download still plays while offline (no server to ask). As soon as the phone is online and the app refreshes, it is deleted. |
| [ ] | **Unfreeze** | Toast "Course unfrozen"; the course is back for the student (progress kept). Downloads deleted earlier must be downloaded again. |
| [ ] | Freeze / unfreeze several times | Works every time; each is in the activity. |

## 3. Paying converts it

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Rita: stage pill → **Payment pending** | Record sale opens with the temporary course chosen ("This student's courses" first). Record cash. |
| [ ] | Sita: Sales & Bills → confirm | Stage **Enrolled**; Courses "Enrolled" (no Temporary label, no Freeze). Student keeps access and progress. Users page shows "Paid". |
| [ ] | Another student with a **frozen** temporary course: the student opens the course in the app and pays (Fonepay or eSewa on dev) | Checkout is allowed (the course looks not-enrolled); after paying: Enrolled, access back, progress kept. |
| [ ] | Dashboard and reports | Total enrollments don't count temporary ones; they count after the payment. |

## 4. Mark lost, other people, limits

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Give access, then stage → **Lost** (reason) | The course is frozen in the same step (activity says "… temporary course(s) frozen"); the student loses access. **Reopen lead**: the course stays frozen until you unfreeze it. |
| [ ] | Bikash opens Rita's lead by URL | "This lead doesn't exist or isn't assigned to you." He can't freeze or give access. |
| [ ] | Sita and Super Admin on any lead | Give access, freeze, unfreeze all work. |
| [ ] | A prospect | Temporary enrollment greyed: "Register the student first". |
| [ ] | A course the student already has (paid or temporary) | Not offered in the panel. |
| [ ] | Enrolled student → stage pill | Temporary enrollment enabled (for another course); the pill stays Enrolled after giving it. |

## 5. Phone width (390 px)

- [ ] The stage menu, the Temporary enrollment panel, the Courses rows (Temporary / Frozen with Freeze / Unfreeze) and the Frozen pill fit with no overlap or sideways scroll.
