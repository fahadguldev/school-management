# MVP Context

## Product

Build a multi-tenant school management and academic intelligence SaaS for private schools.

Initial target scale is about 5,000 students across multiple schools.

Recommended stack:

- Frontend: React
- Backend: NestJS
- Database: PostgreSQL

The product should manage school operations while making academic performance understandable and actionable, not merely storing marks.

## Roles

V1 roles:

- STUDENT
- TEACHER
- INCHARGE
- ADMIN
- PRINCIPAL

Authorization should use a role and permission matrix. Every API endpoint must enforce both role permissions and organization-level access control.

## Multi-Tenancy

Use a shared PostgreSQL schema.

Tenant-owned tables must include `organization_id`.

Backend services must derive tenant context from the authenticated user. The frontend must never be trusted to provide or choose `organization_id`.

JWTs may contain `user_id` and `organization_id`, but the backend must validate tenant context against the authenticated user record.

PostgreSQL Row-Level Security should be used as an additional isolation layer for tenant-owned tables.

## Authentication

Use JWT access tokens and refresh tokens.

V1 requires:

- Login
- Logout
- Password reset
- Session or token management
- Refresh token rotation/invalidation
- Role-based access control
- Organization-level access control

## Academic Model

Each school can have multiple academic years, but only one active academic year at a time.

Terms are configurable per school.

A student has one current class and section within an academic year. Historical enrollment must be preserved across academic years.

Core academic entities:

- Organization
- User
- Student
- Teacher
- Class
- Section
- Subject
- TeacherAssignment
- StudentEnrollment
- AcademicYear
- Term
- Assessment
- AssessmentSubject
- Mark
- Result

## Teacher Assignment

Teacher assignment is many-to-many:

Teacher <-> Class/Section <-> Subject

Teachers can only access academic data for their assigned classes, sections, and subjects.

Class incharges can see all subjects for their assigned class/section.

## Assessments And Marks

Supported assessment types:

- Test
- Monthly Test
- Exam
- Term Exam

Assessment lifecycle:

1. Draft
2. Open
3. Marks Entry
4. Completed
5. Published

Marks are editable until the assessment is published.

Published marks are immutable.

Publishing can happen in bulk per assessment or exam.

Excel import must validate the entire file and commit atomically. If any row is invalid, no marks from that import should be saved.

Excel import validation must detect:

- Invalid student
- Duplicate marks
- Marks greater than maximum marks
- Missing marks
- Incorrect subject/class
- Invalid student-class mapping

## Results And Grading

Use percentage-based/simple average calculation initially.

Each school can configure its grading system.

Passing marks can be configured per subject or assessment.

Calculated result data should include:

- Obtained marks
- Percentage
- Grade
- Pass/fail
- Subject average
- Class average

Only published results are visible to students.

## Analytics

Dashboards should prioritize actionable intelligence.

The analytics layer should answer:

- What is happening?
- Where is the problem?
- Which students need attention?
- Has performance improved?
- Which subjects/classes are changing?

V1 analytics should identify:

- Strong students
- Weak students
- Best students
- Most improved students
- Declining students
- Weak subjects
- Strong subjects
- Class performance trends
- Subject performance trends
- Teacher/class performance trends based on observable academic metrics

## Fees

V1 includes basic fee management with per-student fee records.

Admin can:

- Define fee amount
- Create fee record
- Generate challan
- Set due date
- Mark paid
- Mark unpaid
- Record payment date
- Maintain payment history
- View outstanding fees

Students can:

- View current fee
- View paid/unpaid status
- View fee history
- View challan

No automated fee notifications are included in V1.

## Audit Logs

Important administrative and academic actions must be recorded, especially marks and fee changes.

Audit log fields:

- User
- Action
- Resource
- Timestamp
- Old value
- New value

Examples:

- Admin created student
- Admin changed fee
- Teacher entered marks
- Teacher updated marks
- Admin published result
- Admin assigned teacher

## V1 Success Workflow

The MVP is successful when a real school can complete this workflow:

1. Create school
2. Create academic year
3. Create classes
4. Create subjects
5. Add teachers
6. Add students
7. Assign teachers
8. Assign class incharges
9. Create exam
10. Enter or import marks
11. Publish results
12. Student sees result
13. Teacher sees subject analytics
14. Incharge sees class analytics
15. Principal sees school analytics
16. Admin manages fees
17. Student sees fee status

## V1 Non-Goals

Do not build in V1:

- Parent portal
- WhatsApp notifications
- SMS
- Email automation
- Push notifications
- Attendance
- Homework
- Timetable
- Payroll
- HR
- Transport
- Library
- Inventory
- AI chatbot
- AI teacher evaluation
- Microservices
