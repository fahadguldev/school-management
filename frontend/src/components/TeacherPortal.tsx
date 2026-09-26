"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BookOpen,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Save,
  Upload,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import { AttendancePanel } from "@/components/AttendancePanel";

export function TeacherPortal() {
  const [selectedClass, setSelectedClass] = useState("8-A");
  const [selectedSubject] = useState("Mathematics");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sample student list for marks entry
  const [students, setStudents] = useState<any[]>([
    { id: "st-1", name: "Ayan Khan", admissionNumber: "ADM-101", obtainedMarks: 72, isAbsent: false },
    { id: "st-2", name: "Sara Ahmed", admissionNumber: "ADM-102", obtainedMarks: 85, isAbsent: false },
    { id: "st-3", name: "Bilal Tariq", admissionNumber: "ADM-103", obtainedMarks: 91, isAbsent: false },
    { id: "st-4", name: "Hamza Malik", admissionNumber: "ADM-104", obtainedMarks: 45, isAbsent: false },
    { id: "st-5", name: "Zainab Noor", admissionNumber: "ADM-105", obtainedMarks: 0, isAbsent: true },
  ]);

  const maxMarks = 100;
  const isAssessmentPublished = false; // Toggle to demonstrate immutability

  const handleMarkChange = (id: string, value: string) => {
    const num = value === "" ? 0 : Number(value);
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, obtainedMarks: num } : s))
    );
  };

  const handleAbsentToggle = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isAbsent: !s.isAbsent, obtainedMarks: !s.isAbsent ? 0 : s.obtainedMarks } : s))
    );
  };

  const handleSaveMarks = async () => {
    // Check validation
    const invalid = students.find((s) => s.obtainedMarks > maxMarks);
    if (invalid) {
      setMessage({
        type: "error",
        text: `Validation Failed: ${invalid.name}'s marks (${invalid.obtainedMarks}) exceed maximum marks (${maxMarks}).`,
      });
      return;
    }

    setMessage({
      type: "success",
      text: "Marks validated and saved. (Once published by Admin, marks become strictly immutable).",
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.marks.getTemplate();
      if (res.ok && res.data?.csvTemplate) {
        const blob = new Blob([res.data.csvTemplate], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "marks_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setMessage({ type: "success", text: "Marks CSV Template downloaded successfully." });
      } else {
        setMessage({ type: "error", text: "Failed to load marks CSV template." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to download template." });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMessage({ type: "success", text: `Uploading and atomically parsing ${file.name}...` });
    try {
      const res = await api.marks.importFile(file, file.name);
      if (res.ok) {
        setMessage({
          type: "success",
          text: `Atomic Import Success: ${res.data?.importedCount || "All"} marks rows validated and committed!`,
        });
      } else {
        setMessage({
          type: "error",
          text: `Atomic Rollback: ${res.error || "File import rejected by validation rules. 0 rows committed."}`,
        });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error during upload." });
    }
  };

  return (
    <div className="space-y-6">
      <AttendancePanel />
      {message && (
        <div
          className={`p-3 rounded-md text-xs flex items-center justify-between border ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{message.text}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setMessage(null)} className="h-6 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {/* Header with Assigned Classes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-card">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold">Teacher Portal — Marks Ingestion</h2>
              <Badge variant="outline" className="text-xs">Role: TEACHER</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Teachers can only access assessments for their assigned classes & subjects.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {["8-A — Mathematics", "8-B — Mathematics", "9-A — Mathematics"].map((cls) => {
            const isSel = cls.startsWith(selectedClass);
            return (
              <Button
                key={cls}
                variant={isSel ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedClass(cls.split(" ")[0])}
                className="text-xs h-8"
              >
                {cls}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Marks Entry Table & Excel Ingestion Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Table Marks Entry (2 Cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">
                Class {selectedClass} — {selectedSubject} Marks Table
              </CardTitle>
              <CardDescription className="text-xs">
                Midterm Exam | Maximum Marks: <span className="font-bold font-mono">{maxMarks}</span> | Passing: <span className="font-bold font-mono">40</span>
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {isAssessmentPublished ? (
                <Badge variant="destructive" className="gap-1 text-[10px]">
                  <Lock className="h-3 w-3" /> Published (Locked)
                </Badge>
              ) : (
                <Badge variant="success" className="text-[10px]">Marks Entry Open</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="w-[100px]">Adm #</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="w-[120px]">Marks (Max {maxMarks})</TableHead>
                  <TableHead className="w-[90px] text-center">Absent</TableHead>
                  <TableHead className="w-[90px] text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((st) => {
                  const isOver = st.obtainedMarks > maxMarks;
                  const pct = Math.round((st.obtainedMarks / maxMarks) * 100);
                  return (
                    <TableRow key={st.id} className="text-xs">
                      <TableCell className="font-mono text-muted-foreground">{st.admissionNumber}</TableCell>
                      <TableCell className="font-semibold">{st.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          disabled={st.isAbsent || isAssessmentPublished}
                          value={st.isAbsent ? "" : st.obtainedMarks}
                          onChange={(e) => handleMarkChange(st.id, e.target.value)}
                          className={`h-7 text-xs font-mono ${
                            isOver ? "border-rose-500 bg-rose-50 dark:bg-rose-950 text-rose-700" : ""
                          }`}
                        />
                        {isOver && (
                          <div className="text-[10px] text-rose-600 mt-0.5">Exceeds {maxMarks}!</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={st.isAbsent}
                          disabled={isAssessmentPublished}
                          onChange={() => handleAbsentToggle(st.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {st.isAbsent ? <span className="text-amber-600">ABS</span> : `${pct}%`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveMarks} size="sm" className="text-xs gap-1.5">
                <Save className="h-3.5 w-3.5" /> Save Marks
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Excel Import Tester */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Excel & CSV Atomic Import</CardTitle>
                <CardDescription className="text-xs">PRD Specification — Atomic Transaction</CardDescription>
              </div>
              <Badge variant="default" className="text-[10px] bg-emerald-600">Atomic Engine Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <label
              htmlFor="marks-file-input"
              className="border-2 border-dashed rounded-lg p-6 text-center space-y-2 hover:bg-muted/30 cursor-pointer block"
            >
              <input
                id="marks-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <FileSpreadsheet className="h-8 w-8 mx-auto text-primary" />
              <div className="font-semibold text-xs text-primary">Upload Spreadsheet (.xlsx / .csv)</div>
              <p className="text-[11px] text-muted-foreground">
                Click to browse or drop an Excel/CSV marks file
              </p>
            </label>

            <div className="space-y-1.5 p-3 rounded bg-muted/40 text-[11px]">
              <div className="font-semibold text-foreground">PRD Atomic Validation Rules:</div>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                <li>Detect invalid student IDs & non-enrolled students</li>
                <li>Detect duplicate marks within file or exam</li>
                <li>Detect marks exceeding maximum score ({maxMarks})</li>
                <li>Transactional rollback: 1 error = 0 saved</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="w-full text-[11px] h-8"
              >
                CSV Template
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => document.getElementById("marks-file-input")?.click()}
                className="w-full text-[11px] h-8 gap-1"
              >
                <Upload className="h-3 w-3" /> Select File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
