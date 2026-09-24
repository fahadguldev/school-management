import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { MarkPayload } from './mark-payload.interface';

interface RawImportRow {
  assessmentId?: string;
  studentId?: string;
  subjectId?: string;
  obtainedMarks?: number;
  isAbsent?: boolean;
  [key: string]: unknown;
}

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function lookupColumn(keys: string[], candidates: string[]): string | null {
  const normalized = candidates.map((c) => normalizeKey(c));
  return keys.find((key) => normalized.includes(normalizeKey(key))) ?? null;
}

function toMarkPayload(row: Record<string, unknown>, keys: string[]): RawImportRow {
  const assessmentKey = lookupColumn(keys, ['assessmentId', 'assessmentid', 'assessment', 'examId', 'exam']);
  const studentKey = lookupColumn(keys, ['studentId', 'studentid', 'student', 'admissionNumber', 'admission']);
  const subjectKey = lookupColumn(keys, ['subjectId', 'subjectid', 'subject', 'subjectCode']);
  const marksKey = lookupColumn(keys, ['obtainedMarks', 'obtainedmarks', 'marks', 'mark', 'obtained', 'score']);
  const absentKey = lookupColumn(keys, ['isAbsent', 'isabsent', 'absent', 'ab']);

  const payload: RawImportRow = {};

  if (assessmentKey) payload.assessmentId = String(row[assessmentKey] ?? '').trim();
  if (studentKey) payload.studentId = String(row[studentKey] ?? '').trim();
  if (subjectKey) payload.subjectId = String(row[subjectKey] ?? '').trim();
  if (marksKey) {
    const raw = row[marksKey];
    payload.obtainedMarks = raw === '' || raw === null || raw === undefined ? undefined : Number(raw);
  }
  if (absentKey) {
    const raw = row[absentKey];
    if (raw === true || String(raw).toLowerCase() === 'true' || String(raw).toLowerCase() === 'yes' || String(raw) === '1') {
      payload.isAbsent = true;
    }
  }

  return payload;
}

function validatePayload(payload: RawImportRow, rowNumber: number): MarkPayload {
  if (!payload.studentId) {
    throw new BadRequestException(`Row ${rowNumber}: studentId (or student/admissionNumber) is required`);
  }

  if (!payload.assessmentId) {
    throw new BadRequestException(`Row ${rowNumber}: assessmentId (or examId) is required`);
  }

  if (!payload.subjectId) {
    throw new BadRequestException(`Row ${rowNumber}: subjectId (or subject) is required`);
  }

  if (payload.obtainedMarks === undefined && !payload.isAbsent) {
    throw new BadRequestException(`Row ${rowNumber}: obtainedMarks is required or isAbsent must be true`);
  }

  return {
    assessmentId: payload.assessmentId!,
    studentId: payload.studentId!,
    subjectId: payload.subjectId!,
    obtainedMarks: payload.isAbsent ? 0 : payload.obtainedMarks ?? 0,
    isAbsent: payload.isAbsent ?? false,
  };
}

export function parseMarksFile(buffer: Buffer, originalName: string): MarkPayload[] {
  let workbook: XLSX.WorkBook;

  try {
    if (originalName.toLowerCase().endsWith('.csv')) {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } else if (originalName.toLowerCase().endsWith('.xlsx') || originalName.toLowerCase().endsWith('.xls')) {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } else {
      throw new BadRequestException(
        'Unsupported file type. Upload a .xlsx or .csv file containing marks rows.',
      );
    }
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException('Failed to parse the uploaded file. Ensure it is a valid Excel/CSV file.');
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    throw new BadRequestException('The uploaded file contains no sheets');
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  if (!rawRows.length) {
    throw new BadRequestException('The uploaded file contains no data rows');
  }

  const keys = Object.keys(rawRows[0]);
  return rawRows.map((row, index) => validatePayload(toMarkPayload(row, keys), index + 2));
}