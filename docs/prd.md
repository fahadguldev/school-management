# Product Requirements Document
## School Management App — v2 (Principal-Centric)

**Version:** 2.0
**Status:** Draft for build
**Scope:** Covers all approved Phase 2 features, restructured around the primary buyer: the school principal. Builds on an already-implemented core (Auth & Tenancy, Academic setup, Assessments & Marks, Results, base Analytics, Fee Structures, Fee Challans, Audit Logs).

---

## 1. Purpose & Buyer Framing

The person who pays for this product is the **principal**, not the teacher and not the parent. Teachers use it because they're told to; the principal chooses to renew it. Every feature in this document is prioritized by one question: **does this give the principal oversight and leverage they don't currently have?**

Two distinct value types exist in this product:

- **Operational necessities** — attendance, fees, notifications, report cards. The principal expects these to exist; they don't renew *because* of them, but the app is unusable without them.
- **Principal Intelligence** — filterable performance views, teacher accountability, early-warning alerts. These are the reason a principal chooses this product over a competitor, and the reason they keep paying. This is the differentiator, so it is treated as the highest-priority feature set in this version of the PRD.

## 2. Explicitly Out of Scope

- **Parent login / parent portal.** No parent accounts. All parent-facing information is one-way SMS/WhatsApp notification to a stored phone number.
- **Two-way communication / announcements module.** No broadcast composer, no chat, no inbox. Only system-triggered notifications.
- **Payment gateway integration.** Fees are marked paid manually with a payment method recorded. No live bank/JazzCash/Easypaisa reconciliation in this phase.

---

## 3. Feature 1 — Principal Intelligence Suite (Highest Priority)

### 3.1 Problem
Principals already receive marks, attendance, and fee data somewhere — in registers, Excel sheets, or basic reports. What they don't have is a way to quickly answer: *where is the problem, who is responsible, and is it getting better or worse.* This suite turns existing data into judgment tools rather than static reports.

### 3.2 Adjustable Threshold Filtering (generalized "slider" pattern)
- A single reusable UI pattern — a draggable threshold control — applied across multiple metrics, not built one-off per metric.
- Applies to: pass % per class, attendance % per class/section, fee collection % per class/section, term-over-term improvement delta.
- Example: principal drags the pass % threshold to 70% and instantly sees every class/section below it.
- Output for any filter: list of classes/sections, current value, gap from threshold, and a drill-down link to the relevant class detail.

### 3.3 Teacher Accountability
- **Teacher leaderboard:** ranks teachers by average result improvement across their assigned classes/subjects, term-over-term. Sortable by subject, class level, or overall.
- **Grading pattern check:** flags teachers whose average marks are unusually high or low relative to the school-wide average for the same subject/class level — surfaces both grade inflation and unusually harsh grading.
- **Experience-adjusted comparison:** teachers grouped by tenure band (e.g., first-year vs. 2+ years) so comparisons are fair rather than penalizing new hires.
- **Single-teacher deep-dive report:** one exportable view per teacher — assigned classes, trend across the last 3–4 terms, strongest/weakest subjects. Intended for use in performance reviews and increment discussions.

### 3.4 Class & Section Oversight
- **Section gap detection:** flags a persistent performance gap between parallel sections of the same class (e.g., 8-A vs 8-B), prompting a decision on student distribution or teacher assignment.
- **School-wide weak-subject view:** identifies which subject has the lowest average across the whole school — signals a curriculum or training issue rather than a single class problem.

### 3.5 Early-Warning / Risk Detection
- **At-risk student list:** students trending downward across 2+ consecutive assessments (not just this term's lowest scorers) — surfaces decline before it becomes failure.
- **Attendance–performance correlation:** cross-references attendance and result data to flag students who are both frequently absent and declining academically.
- **Fee-default risk list:** students/families with a historical pattern of late payment, surfaced before the current term's dues go overdue.

### 3.6 Trend & Benchmark Views
- **School-wide trend chart:** overall pass rate and average score plotted term-over-term — a single trajectory view rather than a table of numbers.
- **Same-term year-over-year comparison:** this term vs. the same term last year, per class — controls for the fact that each year's cohort is different.
- **Multi-campus comparison** *(only relevant once a client has more than one branch — flagged here as a natural extension, not built until needed)*.

### 3.7 Principal Alerts (proactive, not dashboard-only)
- Push/SMS/in-app alert to the principal (never the parent) when:
  - A class's pass rate drops more than a configurable % vs. last term.
  - A teacher's average drops sharply between terms.
  - A section's attendance falls below a configurable threshold.
  - Monthly fee collection falls behind a configurable target.
- Alerts link directly to the relevant detail view (e.g., tapping the alert opens that class's comparison).

### 3.8 Data dependency note
This entire suite is built on data already produced by other features (Results, Attendance, Fees) — it requires no new data collection, only new aggregation, comparison, and filtering logic. This is why it is prioritized first: it is the fastest path to a distinguishing, chargeable feature.

---

## 4. Feature 2 — Student Attendance

### 4.1 Problem
Marking 30–40 students one by one, every day, in every class, is the biggest adoption blocker for teachers — and attendance data is also a required input for Feature 1 and Feature 6.

### 4.2 Design principle
**Mark exceptions, not everyone.** Every enrolled student is pre-marked Present by default; the teacher only touches records for students who are not present.

### 4.3 Sub-features
- **Default-present model** for every class session.
- **Exception marking:** tap individual students to set Absent, Late, or Leave.
- **Bulk actions:** "Mark whole class absent" (closures/trips); "Mark selected" (multi-select a group in one action).
- **Statuses:** Present, Absent, Late, Leave (excused).
- **Granularity:** configurable per school — daily or per-period. Default: daily.
- **Locking window:** attendance locks after a configurable number of days (default 2); changes after lock require a correction request.
- **Scoping:** teachers can only mark attendance for classes/sections they are assigned to.

### 4.4 Reporting
- Class-level daily view: absentees, lateness, leave, with counts.
- Student-level history: total days, present count, absence %, per academic year/term.
- Feeds directly into report cards (Feature 7) and Principal Intelligence (Feature 1).

### 4.5 Correction workflow
- Teacher submits a correction request (student, date, old status, requested status, reason) after the lock window.
- Routed to incharge/admin for approval; approved changes update the record and write to the Audit Log.

### 4.6 Data model notes
- `AttendanceSession` (class/section, date, period [optional], locked)
- `AttendanceRecord` (session_id, student_id, status, marked_by, marked_at)
- `AttendanceCorrectionRequest` (record_id, requested_status, reason, requested_by, status, approved_by)

---

## 5. Feature 3 — Staff Attendance

### 5.1 Sub-features
- Daily status per staff member: Present, Absent, Late, Leave.
- Marking method configurable per school: self-marked with admin approval, or admin/HR-marked directly.
- Leave request flow: staff submits, admin approves/rejects.
- Monthly staff attendance summary — structured to support future payroll, not built this phase.

### 5.2 Data model notes
- `StaffAttendanceRecord` (staff_id, date, status, marked_by)
- `StaffLeaveRequest` (staff_id, start_date, end_date, reason, status, approved_by)

---

## 6. Feature 4 — Parent Notifications (One-Way Only)

### 6.1 Design principle
Outbound-only, trigger-based SMS/WhatsApp. No parent login, no inbox, no announcement composer.

### 6.2 Data requirement
- Every student record stores at least one guardian phone number (primary); a second is optional.

### 6.3 Triggers
- Student marked Absent → same-day SMS.
- Result published → SMS notifying result is available.
- Fee due date approaching → reminder SMS.
- Fee marked as paid → confirmation SMS.

### 6.4 Sub-features
- **Notification log:** recipient number, trigger type, timestamp, delivery status — needed for support and disputes.
- **Retry logic:** limited retries on failure (bad number, gateway timeout), then marked failed and visible to admin.
- **Fixed templates per trigger type**, with school/student values interpolated — no custom campaign builder.

### 6.5 Data model notes
- `GuardianContact` (student_id, phone_number, is_primary)
- `NotificationLog` (student_id, trigger_type, message_body, recipient_number, status, sent_at, retry_count)

---

## 7. Feature 5 — Fee Management (Reconciliation-Focused)

### 7.1 Existing (kept as-is)
Fee structure creation, assignment, partial payment tracking, challan generation, student "my dues" view.

### 7.2 New sub-features
- **Mark as paid, with method:** Cash, Bank Transfer, JazzCash, Easypaisa recorded per payment (no live gateway integration).
- **Instant status visibility:** student's "my dues" view updates immediately on payment — satisfies visibility without a parent portal.
- **Defaulter list:** unpaid-past-due students, filterable by class/section.
- **Fee due reminder:** ties into Feature 4.
- **Collection reporting:** daily/monthly totals, overall and by class.
- **Bulk challan generation:** whole class/term in one action.
- **Late fine:** optional, fixed or percentage, with grace period.
- **Sibling discount:** percentage or flat, applied at fee assignment.
- **Accountant role:** scoped to fee data only.

### 7.3 Data model notes
- Extend `FeePayment` with `payment_method`.
- `FeeFine` (fee_id, amount/percentage, grace_period_days)
- `SiblingDiscount` (student_id, discount_type, value)
- Role: `ACCOUNTANT` added to RBAC.

---

## 8. Feature 6 — Principal Operational Dashboard

### 8.1 Purpose
The single screen a principal checks every morning — distinct from Feature 1's analytical depth, this is a fast operational snapshot.

### 8.2 Sub-features
- Attendance snapshot: % present today, absent count, by class.
- Fee snapshot: collected today, collected this month, total pending, defaulter count.
- Staff snapshot: present, on leave, absent.
- Quick links into defaulter list, today's absentees, low-attendance students, and Feature 1's weak-performing classes.

### 8.3 Notes
Read-only aggregation composed from Features 2, 3, 5, and Feature 1. No new data created here.

---

## 9. Feature 7 — Printable PDF Report Cards

### 9.1 Sub-features
- Generated from existing `results/student/:id/summary` data.
- School branding: logo, header, school name/address.
- Subject-wise marks, total, percentage, grade, class position.
- Attendance summary for the term (from Feature 2).
- Term-over-term comparison where prior data exists.
- Free-text teacher/incharge remarks field.
- Bulk generation for an entire class in one action (combined PDF or zipped set).

### 9.2 Data model notes
- `ReportCardRemark` (student_id, term_id, remark_text, entered_by)
- No new results calculation — this is a presentation/export layer.

---

## 10. Feature 8 — Marks Correction After Publishing

### 10.1 Sub-features
- Published marks remain locked by default.
- **Correction request:** teacher submits student, subject, old value, requested value, reason.
- **Approval routing:** to class incharge or admin.
- **On approval:** mark updates, result recalculates (percentage/grade/position may shift), report card reflects the corrected value only after approval.
- **On rejection:** original value stands, request closed with a reason.
- Every step logged in the Audit Log (old value, new value, requester, approver).

### 10.2 Data model notes
- `MarksCorrectionRequest` (mark_id, old_value, requested_value, reason, requested_by, status, reviewed_by, reviewed_at)

---

## 11. Feature 9 — Onboarding & Year-End Operations

### 11.1 Bulk Import
- Bulk import of students, guardian phone numbers, and fee structures via Excel/CSV.
- Same pattern as existing marks import: full pre-validation, then a single atomic commit; any invalid row rolls back the entire import with a clear error report.

### 11.2 Year-End Promotion
- Bulk-promote a class/section to the next academic year in one action.
- Ability to hold back individual students.
- Student profile and historical records carry forward; attendance and fee counters reset for the new year.

---

## 12. Roles Summary

| Role | Attendance | Fees | Marks | Analytics / Intelligence | Notifications |
|---|---|---|---|---|---|
| Admin | Full | Full | Full | Full | Full (view logs) |
| Accountant | View only | Full | None | None | Fee-related only (view logs) |
| Principal | View | View | View | Full (Feature 1 is principal-only) | View logs, receives alerts |
| Incharge | Mark (own class) | None | Approve corrections | Own class | None |
| Teacher | Mark (assigned classes) | None | Enter, request correction | Own classes | None |

Note: Feature 1 (Principal Intelligence Suite) is visible only to the Principal and Admin roles — it is the paid differentiator and should not be diluted by making it generally available to teachers/incharges.

---

## 13. Suggested Build Order

1. **Attendance (student + staff)** — foundational; required as input data for almost everything else.
2. **Principal Intelligence Suite (threshold filters, teacher leaderboard, at-risk list, trend views)** — highest business value, reuses existing + newly available attendance/result data, no new data collection needed.
3. **Parent notification triggers** (absence, result, fee due, fee paid).
4. **Fee reconciliation, defaulters, bulk challans.**
5. **Principal operational dashboard** — composes data from steps 1–4.
6. **Principal alerts** (push/SMS on threshold breaches) — natural extension once Feature 1 and dashboard exist.
7. **Printable PDF report cards** — depends on attendance summary being available.
8. **Marks correction workflow.**
9. **Bulk import + year-end promotion** — onboarding/operations, can run in parallel with the above.

## 14. Non-Functional Requirements

- All new endpoints respect existing tenant isolation (RLS) and role scoping.
- All state-changing actions on attendance, fees, and marks corrections write to the existing Audit Log.
- SMS/WhatsApp delivery must degrade gracefully — a failed notification must never block the underlying action (e.g., attendance marking succeeds even if the SMS gateway is down).
- Report card and challan PDFs are generated server-side and print correctly at A4 without manual formatting.
- Principal Intelligence Suite computations (leaderboards, trends, risk lists) should be pre-aggregated/cached where possible rather than computed on every dashboard load, to keep the principal's daily-use screens fast.
