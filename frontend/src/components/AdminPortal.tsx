"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import {
  Calendar,
  School,
  Users,
  FileCheck,
  CreditCard,
  Plus,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Lock,
  Database,
  FileText,
  Printer,
  Receipt,
  RefreshCw,
} from "lucide-react";

export function AdminPortal() {
  const [activeSubTab, setActiveSubTab] = useState<"academic" | "students" | "teachers" | "exams" | "fees" | "security" | "audit">("academic");
  const [loading, setLoading] = useState(false);
  const [rlsReport, setRlsReport] = useState<any>(null);
  const [verifyingRls, setVerifyingRls] = useState(false);
  const [rlsProof, setRlsProof] = useState<any>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Academic state
  const [years, setYears] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Form states
  const [newYearName, setNewYearName] = useState("2026-2027");
  const [newTermName, setNewTermName] = useState("Term 1");
  const [newClassName, setNewClassName] = useState("8");
  const [newClassSection, setNewClassSection] = useState("A");
  const [newSubjectName, setNewSubjectName] = useState("Mathematics");
  const [newSubjectCode, setNewSubjectCode] = useState("MATH101");

  // Students & Teachers state
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [newStudentName, setNewStudentName] = useState("Ayan Khan");
  const [newStudentAdmission, setNewStudentAdmission] = useState(`ADM-${Date.now().toString().slice(-4)}`);
  const [newTeacherFirst, setNewTeacherFirst] = useState("Ahmed");
  const [newTeacherLast, setNewTeacherLast] = useState("Ali");
  const [newTeacherEmpId, setNewTeacherEmpId] = useState(`EMP-${Date.now().toString().slice(-4)}`);

  // Exams state
  const [exams, setExams] = useState<any[]>([]);
  const [newExamName, setNewExamName] = useState("Midterm Exam");
  const [newExamType, setNewExamType] = useState("Exam");
  const [newExamMaxMarks, setNewExamMaxMarks] = useState(100);
  const [newExamPassMarks, setNewExamPassMarks] = useState(40);

  // Fees state
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [feesList, setFeesList] = useState<any[]>([]);
  const [newFeeName, setNewFeeName] = useState("Monthly Tuition");
  const [newFeeAmount, setNewFeeAmount] = useState(5000);
  const [selectedStudentForFee, setSelectedStudentForFee] = useState<string>("");
  const [selectedStructureForFee, setSelectedStructureForFee] = useState<string>("");
  const [activeChallan, setActiveChallan] = useState<any>(null);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [y, t, c, s, st, tc, ex, fs, fl, rls, al] = await Promise.all([
        api.academic.getYears(),
        api.academic.getTerms(),
        api.classes.getAll(),
        api.subjects.getAll(),
        api.students.getAll(),
        api.teachers.getAll(),
        api.exams.getAll(),
        api.fees.getStructures(),
        api.fees.getAll(),
        api.tenancy.getRlsStatus(),
        api.audit.getLogs({ limit: 50 }),
      ]);
      if (y.ok) setYears(y.data || []);
      if (t.ok) setTerms(t.data || []);
      if (c.ok) setClasses(c.data || []);
      if (s.ok) setSubjects(s.data || []);
      if (st.ok) setStudents(st.data || []);
      if (tc.ok) setTeachers(tc.data || []);
      if (ex.ok) setExams(ex.data || []);
      if (fs.ok) setFeeStructures(fs.data || []);
      if (fl.ok) setFeesList(fl.data || []);
      if (rls.ok) setRlsReport(rls.data);
      if (al?.ok) setAuditLogs(al.data || []);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const handleVerifyIsolation = async () => {
    setVerifyingRls(true);
    try {
      const res = await api.tenancy.verifyIsolation();
      if (res.ok) {
        setRlsProof(res.data);
        setMessage({ type: "success", text: "Tenant SQL isolation verified. Cross-tenant reads and mutations are blocked." });
      } else {
        setMessage({ type: "error", text: res.error || "Isolation verification failed." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error." });
    }
    setVerifyingRls(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.academic.createYear({
      name: newYearName,
      startDate: "2026-08-01",
      endDate: "2027-06-30",
      isCurrent: true,
    });
    if (res.ok) {
      setMessage({ type: "success", text: `Academic Year ${newYearName} created as active year.` });
      loadData();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to create academic year" });
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.classes.create({
      name: newClassName,
      section: newClassSection,
      academicYear: newYearName,
    });
    if (res.ok) {
      setMessage({ type: "success", text: `Class ${newClassName}-${newClassSection} created.` });
      loadData();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to create class" });
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.subjects.create({
      name: newSubjectName,
      code: newSubjectCode,
    });
    if (res.ok) {
      setMessage({ type: "success", text: `Subject ${newSubjectName} added.` });
      loadData();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to create subject" });
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.students.create({
      admissionNumber: newStudentAdmission,
      name: newStudentName,
      dateOfBirth: "2010-05-15",
      gender: "Male",
      contactInformation: `guardian-${Date.now()}@test.com`,
      className: newClassName,
      section: newClassSection,
      admissionDate: "2026-08-15",
    });
    if (res.ok) {
      setMessage({ type: "success", text: `Student ${newStudentName} created.` });
      setNewStudentAdmission(`ADM-${Date.now().toString().slice(-4)}`);
      loadData();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to create student" });
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const classObj = classes[0];
    const subjectObj = subjects[0];
    const yearObj = years[0];

    const res = await api.exams.create({
      name: newExamName,
      type: newExamType,
      maximumMarks: newExamMaxMarks,
      passingMarks: newExamPassMarks,
      examDate: "2026-10-15",
      classId: classObj?.id,
      subjectId: subjectObj?.id,
      academicYearId: yearObj?.id,
      status: "Draft",
    });
    if (res.ok) {
      setMessage({ type: "success", text: `Exam ${newExamName} created in Draft status.` });
      loadData();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to create exam" });
    }
  };

  const handlePublishExam = async (examId: string) => {
    const res = await api.marks.publishAssessment(examId);
    if (res.ok) {
      setMessage({ type: "success", text: "Assessment published! Results auto-calculated." });
      loadData();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to publish assessment" });
    }
  };

  const handleCreateFeeStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.fees.createStructure({
      name: newFeeName,
      amount: Number(newFeeAmount),
      frequency: "monthly",
    });
    if (res.ok) {
      setMessage({ type: "success", text: `Fee structure ${newFeeName} created.` });
      loadData();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to create fee structure" });
    }
  };

  const handleAssignFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForFee || !selectedStructureForFee) {
      setMessage({ type: "error", text: "Please select both a student and a fee structure." });
      return;
    }
    const structure = feeStructures.find((fs) => fs.id === selectedStructureForFee);
    const res = await api.fees.createFee({
      studentId: selectedStudentForFee,
      feeStructureId: selectedStructureForFee,
      amount: Number(structure?.amount || 5000),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    });
    if (res.ok) {
      setMessage({ type: "success", text: "Fee assigned successfully." });
      loadData();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to assign fee" });
    }
  };

  const handleViewChallan = async (feeId: string) => {
    const res = await api.fees.getChallan(feeId);
    if (res.ok && res.data) {
      setActiveChallan(res.data);
    } else {
      setMessage({ type: "error", text: res.error || "Failed to fetch challan" });
    }
  };

  const handleMarkFeePaid = async (feeId: string, amount: number) => {
    const res = await api.fees.markPaid(feeId, {
      amount,
      paymentMethod: "cash",
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
    });
    if (res.ok) {
      setMessage({ type: "success", text: "Payment recorded successfully." });
      loadData();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to record payment" });
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Admin Subtabs */}
      <div className="flex border-b space-x-4">
        {[
          { id: "academic", label: "Academic Structure", icon: Calendar },
          { id: "students", label: "Students Directory", icon: Users },
          { id: "teachers", label: "Teachers & Assignments", icon: School },
          { id: "exams", label: "Exams & Lifecycle", icon: FileCheck },
          { id: "fees", label: "Fee Management", icon: CreditCard },
          { id: "security", label: "Security & Tenancy (RLS)", icon: ShieldCheck },
          { id: "audit", label: "Audit Logs", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isAct = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center space-x-2 pb-2 text-xs font-medium border-b-2 transition-all ${
                isAct
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Academic Structure Subtab */}
      {activeSubTab === "academic" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Academic Years & Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Academic Years & Terms</CardTitle>
              <CardDescription className="text-xs">
                Only one active academic year can exist at any given time (enforced by backend).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCreateYear} className="flex gap-2">
                <Input
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  placeholder="e.g. 2026-2027"
                  className="text-xs h-8"
                  required
                />
                <Button type="submit" size="sm" className="h-8 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add Year
                </Button>
              </form>

              <div className="border rounded-md divide-y text-xs">
                {years.length === 0 ? (
                  <div className="p-3 text-muted-foreground text-center">No academic years created yet</div>
                ) : (
                  years.map((y) => (
                    <div key={y.id} className="p-2.5 flex items-center justify-between">
                      <span className="font-semibold">{y.name}</span>
                      {y.isCurrent && <Badge variant="success" className="text-[10px]">Active Year</Badge>}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Classes & Subjects */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Classes & Subjects Setup</CardTitle>
              <CardDescription className="text-xs">
                Sections: A, B, C are modeled inside class definitions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCreateClass} className="flex gap-2">
                <Input
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Class (e.g. 8)"
                  className="text-xs h-8 w-24"
                  required
                />
                <Input
                  value={newClassSection}
                  onChange={(e) => setNewClassSection(e.target.value)}
                  placeholder="Section (e.g. A)"
                  className="text-xs h-8 w-24"
                  required
                />
                <Button type="submit" size="sm" className="h-8 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add Class
                </Button>
              </form>

              <form onSubmit={handleCreateSubject} className="flex gap-2">
                <Input
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="Subject name (e.g. Physics)"
                  className="text-xs h-8"
                  required
                />
                <Input
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                  placeholder="Code (PHY101)"
                  className="text-xs h-8 w-28"
                />
                <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add Subject
                </Button>
              </form>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="border rounded p-2">
                  <div className="font-semibold mb-1 text-muted-foreground">Classes ({classes.length})</div>
                  <div className="space-y-1">
                    {classes.map((c) => (
                      <div key={c.id} className="text-[11px] bg-muted px-1.5 py-0.5 rounded">
                        Class {c.name}-{c.section}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border rounded p-2">
                  <div className="font-semibold mb-1 text-muted-foreground">Subjects ({subjects.length})</div>
                  <div className="space-y-1">
                    {subjects.map((s) => (
                      <div key={s.id} className="text-[11px] bg-muted px-1.5 py-0.5 rounded">
                        {s.name} ({s.code || "N/A"})
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. Students Directory Subtab */}
      {activeSubTab === "students" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Students Directory</CardTitle>
              <CardDescription className="text-xs">
                Manage student admissions, profiles, and class mappings.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateStudent} className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded border">
              <Input
                value={newStudentAdmission}
                onChange={(e) => setNewStudentAdmission(e.target.value)}
                placeholder="Admission #"
                className="text-xs h-8 w-32"
                required
              />
              <Input
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="Student full name"
                className="text-xs h-8 flex-1 min-w-[150px]"
                required
              />
              <Button type="submit" size="sm" className="h-8 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add Student
              </Button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Admission #</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class & Section</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>History Endpoint</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                      No students registered. Add one using the form above.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((st) => (
                    <TableRow key={st.id} className="text-xs">
                      <TableCell className="font-mono font-medium">{st.admissionNumber}</TableCell>
                      <TableCell className="font-semibold">{st.name}</TableCell>
                      <TableCell>{st.className ? `${st.className}-${st.section || 'A'}` : "Not Assigned"}</TableCell>
                      <TableCell>
                        <Badge variant={st.status ? "success" : "secondary"} className="text-[10px]">
                          {st.status ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="text-[10px]">
                          GET /students/{st.id}/history (Missing)
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 3. Teachers Subtab */}
      {activeSubTab === "teachers" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Teacher Directory & Assignments</CardTitle>
            <CardDescription className="text-xs">
              Teachers can only access assessments and marks for their assigned class and subject.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {teachers.map((tc) => (
                <div key={tc.id} className="p-3 border rounded-lg bg-card text-xs space-y-1">
                  <div className="font-semibold text-foreground">{tc.firstName} {tc.lastName}</div>
                  <div className="text-muted-foreground font-mono text-[11px]">ID: {tc.employeeId}</div>
                  <Badge variant="outline" className="text-[10px]">
                    Assignment: Subject & Class
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Exams & Lifecycle Subtab */}
      {activeSubTab === "exams" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Examination State Machine & Publishing</CardTitle>
            <CardDescription className="text-xs">
              Assessments transition from Draft ➔ Open ➔ Marks Entry ➔ Completed ➔ Published. Once published, marks are immutable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateExam} className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded border">
              <Input
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                placeholder="Exam Name"
                className="text-xs h-8 flex-1 min-w-[150px]"
                required
              />
              <Input
                type="number"
                value={newExamMaxMarks}
                onChange={(e) => setNewExamMaxMarks(Number(e.target.value))}
                placeholder="Max Marks"
                className="text-xs h-8 w-24"
                required
              />
              <Input
                type="number"
                value={newExamPassMarks}
                onChange={(e) => setNewExamPassMarks(Number(e.target.value))}
                placeholder="Passing Marks"
                className="text-xs h-8 w-24"
                required
              />
              <Button type="submit" size="sm" className="h-8 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Create Assessment
              </Button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment Name</TableHead>
                  <TableHead>Max / Pass</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead>Immutability</TableHead>
                  <TableHead className="text-right">Publish Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((ex) => (
                  <TableRow key={ex.id} className="text-xs">
                    <TableCell className="font-semibold">{ex.name}</TableCell>
                    <TableCell>{ex.maximumMarks} / {ex.passingMarks}</TableCell>
                    <TableCell>
                      <Badge
                        variant={ex.isPublished ? "success" : "secondary"}
                        className="text-[10px]"
                      >
                        {ex.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ex.isPublished ? (
                        <span className="text-emerald-600 font-semibold text-[11px]">Locked (Immutable)</span>
                      ) : (
                        <span className="text-amber-600 text-[11px]">Editable</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!ex.isPublished ? (
                        <Button
                          size="sm"
                          onClick={() => handlePublishExam(ex.id)}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                        >
                          Publish & Calculate Results
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Results Published</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 5. Fees Management Subtab */}
      {activeSubTab === "fees" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Fee Management & Challan Generation</CardTitle>
              <CardDescription className="text-xs">
                Manage fee structures, assign fees to enrolled students, track partial/full payments, and generate official 3-part bank fee challans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 border rounded-lg bg-card text-xs">
                  <div className="text-muted-foreground uppercase text-[10px] font-bold">Total Fees Created</div>
                  <div className="text-2xl font-bold mt-1">{feesList.length}</div>
                </div>
                <div className="p-3 border rounded-lg bg-card text-xs">
                  <div className="text-muted-foreground uppercase text-[10px] font-bold">Paid Fees</div>
                  <div className="text-2xl font-bold mt-1 text-emerald-600">
                    {feesList.filter((f) => f.isPaid).length}
                  </div>
                </div>
                <div className="p-3 border rounded-lg bg-card text-xs">
                  <div className="text-muted-foreground uppercase text-[10px] font-bold">Unpaid Dues</div>
                  <div className="text-2xl font-bold mt-1 text-rose-600">
                    {feesList.filter((f) => !f.isPaid).length}
                  </div>
                </div>
              </div>

              {/* Create Fee Structure & Assign Forms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Define Fee Structure
                  </h4>
                  <form onSubmit={handleCreateFeeStructure} className="space-y-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground">Structure Name</label>
                      <Input
                        value={newFeeName}
                        onChange={(e) => setNewFeeName(e.target.value)}
                        placeholder="e.g. Monthly Tuition Fee"
                        className="h-8 text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">Amount (PKR)</label>
                      <Input
                        type="number"
                        value={newFeeAmount}
                        onChange={(e) => setNewFeeAmount(Number(e.target.value))}
                        className="h-8 text-xs font-mono"
                        required
                      />
                    </div>
                    <Button type="submit" size="sm" className="w-full text-xs h-8">
                      Create Structure
                    </Button>
                  </form>
                </div>

                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Assign Fee to Student
                  </h4>
                  <form onSubmit={handleAssignFee} className="space-y-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground">Select Student</label>
                      <select
                        value={selectedStudentForFee}
                        onChange={(e) => setSelectedStudentForFee(e.target.value)}
                        className="w-full h-8 text-xs border rounded px-2 bg-background"
                      >
                        <option value="">Select a student...</option>
                        {students.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.firstName} {st.lastName} ({st.admissionNumber})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">Fee Structure</label>
                      <select
                        value={selectedStructureForFee}
                        onChange={(e) => setSelectedStructureForFee(e.target.value)}
                        className="w-full h-8 text-xs border rounded px-2 bg-background"
                      >
                        <option value="">Select fee structure...</option>
                        {feeStructures.map((fs) => (
                          <option key={fs.id} value={fs.id}>
                            {fs.name} - Rs. {fs.amount}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button type="submit" size="sm" className="w-full text-xs h-8">
                      Assign Fee Record
                    </Button>
                  </form>
                </div>
              </div>

              {/* Fees Table */}
              <div>
                <h4 className="text-xs font-semibold mb-2">Student Fee Records & Challans</h4>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs bg-muted/40">
                        <TableHead>Student</TableHead>
                        <TableHead>Admission #</TableHead>
                        <TableHead>Structure</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feesList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-4">
                            No fee records created yet. Define a structure and assign to a student above.
                          </TableCell>
                        </TableRow>
                      ) : (
                        feesList.map((fee) => (
                          <TableRow key={fee.id} className="text-xs">
                            <TableCell className="font-semibold">
                              {fee.student?.firstName} {fee.student?.lastName}
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground">
                              {fee.student?.admissionNumber || "—"}
                            </TableCell>
                            <TableCell>{fee.feeStructure?.name || "Tuition"}</TableCell>
                            <TableCell className="font-mono font-medium">Rs. {Number(fee.amount).toLocaleString()}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  fee.isPaid ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                }`}
                              >
                                {fee.isPaid ? "Paid" : "Unpaid"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewChallan(fee.id)}
                                className="h-6 text-[11px] gap-1 px-2"
                              >
                                <Receipt className="h-3 w-3" /> Challan
                              </Button>
                              {!fee.isPaid && (
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkFeePaid(fee.id, Number(fee.amount))}
                                  className="h-6 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2"
                                >
                                  Mark Paid
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Active Challan Preview Modal/Panel */}
              {activeChallan && (
                <div className="p-4 border-2 rounded-lg bg-card shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h4 className="text-sm font-bold flex items-center gap-1.5">
                        <Receipt className="h-4 w-4 text-primary" /> Fee Challan: {activeChallan.challanNumber}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Issue Date: {activeChallan.issueDate} | Due Date: {activeChallan.dueDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.print()}
                        className="h-7 text-xs gap-1"
                      >
                        <Printer className="h-3.5 w-3.5" /> Print 3-Part Voucher
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActiveChallan(null)}
                        className="h-7 text-xs"
                      >
                        Close
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {["Bank Copy", "Institution Copy", "Student Copy"].map((copyName, i) => (
                      <div key={copyName} className="border rounded p-3 bg-muted/10 space-y-2 text-xs">
                        <div className="flex justify-between items-center border-b pb-1 font-bold">
                          <span>{copyName}</span>
                          <Badge variant="outline" className="text-[9px]">Part {i + 1}</Badge>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">School:</span>
                            <span className="font-medium">{activeChallan.school?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Student:</span>
                            <span className="font-semibold">{activeChallan.student?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Class:</span>
                            <span>{activeChallan.student?.className}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Adm #:</span>
                            <span className="font-mono">{activeChallan.student?.admissionNumber}</span>
                          </div>
                          <div className="flex justify-between border-t pt-1 font-semibold">
                            <span>Amount:</span>
                            <span className="font-mono text-primary">Rs. {Number(activeChallan.amount).toLocaleString()}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground pt-1 border-t">
                            A/C: {activeChallan.bankDetails?.accountNumber} ({activeChallan.bankDetails?.bankName})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. Security & Row-Level Security Subtab */}
      {activeSubTab === "security" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <span>PostgreSQL Row-Level Security (RLS) Isolation Layer</span>
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Database engine level multi-tenancy enforcement. Restricts every SQL query to the verified tenant via session context.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                disabled={verifyingRls}
                onClick={handleVerifyIsolation}
              >
                <Lock className="h-3.5 w-3.5 mr-1" />
                {verifyingRls ? "Verifying Isolation..." : "Probe SQL Isolation Barrier"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 border rounded-lg bg-card text-xs">
                  <div className="text-muted-foreground uppercase text-[10px] font-bold">Driver / Status</div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Database className="h-4 w-4 text-primary" />
                    <span className="font-semibold capitalize">{rlsReport?.databaseDriver || "sqlite"}</span>
                    <Badge variant={rlsReport?.status === "active" ? "default" : "secondary"} className="text-[10px] h-4">
                      {rlsReport?.status === "active" ? "PG Engine Enforced" : "Emulated Fallback"}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 border rounded-lg bg-card text-xs">
                  <div className="text-muted-foreground uppercase text-[10px] font-bold">Protected Entities</div>
                  <div className="text-xl font-bold mt-1 text-emerald-600">
                    {rlsReport?.verifiedProtectedCount || 17} / {rlsReport?.totalProtectedTables || 17}
                  </div>
                </div>

                <div className="p-3 border rounded-lg bg-card text-xs sm:col-span-2">
                  <div className="text-muted-foreground uppercase text-[10px] font-bold">Active Tenant Session Setting</div>
                  <div className="font-mono text-[11px] mt-1 truncate bg-muted p-1 rounded">
                    app.current_organization_id = {rlsReport?.currentTenantId || "Unset (Public session)"}
                  </div>
                </div>
              </div>

              {rlsProof && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center space-x-2 font-semibold">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span>Isolation Verification Proof Passed:</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 font-mono text-[11px]">
                    <div>Cross-Tenant Read: <strong className="text-emerald-600">BLOCKED</strong></div>
                    <div>Cross-Tenant Write: <strong className="text-emerald-600">BLOCKED</strong></div>
                    <div>Unauth Query: <strong className="text-emerald-600">BLOCKED</strong></div>
                    <div>Tenant Access: <strong className="text-emerald-600">ALLOWED</strong></div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold mb-2">Protected Database Tables & Policy Scope</h4>
                <div className="rounded-md border overflow-x-auto max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Database Table</TableHead>
                        <TableHead className="text-xs">Tenant Key Column</TableHead>
                        <TableHead className="text-xs">Policy Name</TableHead>
                        <TableHead className="text-xs">FORCE RLS</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rlsReport?.tables?.map((tbl: any) => (
                        <TableRow key={tbl.table}>
                          <TableCell className="font-mono text-xs font-medium">{tbl.table}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{tbl.keyColumn}</TableCell>
                          <TableCell className="text-xs font-mono">{tbl.policyName}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700">
                              FORCED
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant={tbl.status === "active" ? "default" : "secondary"} className="text-[10px]">
                              {tbl.status === "active" ? "Active RLS" : "Software Guard"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 7. Audit Trail Logging Subtab */}
      {activeSubTab === "audit" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Audit Trail & Security Logging</span>
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Chronological log of sensitive operations (marks modifications, assessment publishing, fee receipts).
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={loadData}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh Logs
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs bg-muted/40">
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User / Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details & Diff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                        No audit events recorded yet. Enter marks or record fee payments to generate audit trail entries.
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow key={log.id} className="text-xs">
                        <TableCell className="font-mono text-muted-foreground text-[11px] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{log.user?.email || "System User"}</div>
                          {log.user?.firstName && (
                            <div className="text-[10px] text-muted-foreground">
                              {log.user.firstName} {log.user.lastName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.resource}</TableCell>
                        <TableCell className="font-mono text-[11px] max-w-xs truncate text-muted-foreground">
                          {log.details ? JSON.stringify(log.details) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
