export interface MarkPayload {
  assessmentId: string;
  studentId: string;
  subjectId: string;
  obtainedMarks: number;
  isAbsent?: boolean;
}