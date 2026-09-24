export interface UserSession {
  id: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "INCHARGE" | "ADMIN" | "PRINCIPAL";
  organizationId: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: UserSession;
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

class ApiClient {
  private tokens: AuthTokens | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sm_auth");
      if (stored) {
        try {
          this.tokens = JSON.parse(stored);
        } catch {
          this.tokens = null;
        }
      }
    }
  }

  setAuth(tokens: AuthTokens | null) {
    this.tokens = tokens;
    if (typeof window !== "undefined") {
      if (tokens) {
        localStorage.setItem("sm_auth", JSON.stringify(tokens));
      } else {
        localStorage.removeItem("sm_auth");
      }
    }
  }

  getAuth(): AuthTokens | null {
    return this.tokens;
  }

  async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; status: number; ok: boolean; error?: string }> {
    const url = `${API_BASE}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.tokens?.accessToken) {
      headers["Authorization"] = `Bearer ${this.tokens.accessToken}`;
    }

    try {
      let res = await fetch(url, { ...options, headers });

      if (res.status === 401 && this.tokens?.refreshToken && path !== "/auth/refresh") {
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          headers["Authorization"] = `Bearer ${refreshed.accessToken}`;
          res = await fetch(url, { ...options, headers });
        }
      }

      const contentType = res.headers.get("content-type");
      let data = null;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      }

      if (!res.ok) {
        return {
          data,
          status: res.status,
          ok: false,
          error: data?.message || `Request failed with status ${res.status}`,
        };
      }

      return { data, status: res.status, ok: true };
    } catch (err: any) {
      return {
        data: null,
        status: 0,
        ok: false,
        error: err.message || `Network error. Is the backend reachable at ${API_BASE}?`,
      };
    }
  }

  private async refreshTokens(): Promise<AuthTokens | null> {
    if (!this.tokens?.refreshToken) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        this.setAuth(data);
        return data;
      }
    } catch {
      // refresh failed
    }
    this.setAuth(null);
    return null;
  }

  async uploadFile<T = any>(
    path: string,
    file: File | Blob,
    filename: string = "marks.csv"
  ): Promise<{ data: T | null; status: number; ok: boolean; error?: string }> {
    const url = `${API_BASE}${path}`;
    const formData = new FormData();
    formData.append("file", file, filename);

    const headers: Record<string, string> = {};
    if (this.tokens?.accessToken) {
      headers["Authorization"] = `Bearer ${this.tokens.accessToken}`;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      const contentType = res.headers.get("content-type");
      let data = null;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      }

      if (!res.ok) {
        return {
          data,
          status: res.status,
          ok: false,
          error: data?.message || `Upload failed with status ${res.status}`,
        };
      }

      return { data, status: res.status, ok: true };
    } catch (err: any) {
      return {
        data: null,
        status: 0,
        ok: false,
        error: err.message || "Network error during file upload",
      };
    }
  }

  // Domain API helpers
  auth = {
    bootstrapSchool: (payload: { schoolName: string; email: string; password: string; firstName: string; lastName: string }) =>
      this.request<AuthTokens>("/auth/bootstrap-school", { method: "POST", body: JSON.stringify(payload) }),
    login: (payload: { email: string; password: string }) =>
      this.request<AuthTokens>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
    logout: () => this.request("/auth/logout", { method: "POST" }),
    requestPasswordReset: (email: string) =>
      this.request("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (token: string, password: string) =>
      this.request("/auth/password-reset/confirm", { method: "POST", body: JSON.stringify({ token, password }) }),
  };

  organizations = {
    getCurrent: () => this.request("/organizations/current"),
  };

  tenancy = {
    getRlsStatus: () => this.request("/tenancy/rls-status"),
    verifyIsolation: () => this.request("/tenancy/verify-isolation"),
  };

  academic = {
    getYears: () => this.request("/academic/years"),
    createYear: (payload: { name: string; startDate: string; endDate: string; isCurrent?: boolean }) =>
      this.request("/academic/years", { method: "POST", body: JSON.stringify(payload) }),
    getTerms: () => this.request("/academic/terms"),
    createTerm: (payload: { name: string; startDate: string; endDate: string; academicYearId?: string }) =>
      this.request("/academic/terms", { method: "POST", body: JSON.stringify(payload) }),
    getEnrollments: () => this.request("/academic/enrollments"),
    createEnrollment: (payload: { studentId: string; classId: string; academicYear?: string; term?: string; isCurrent?: boolean }) =>
      this.request("/academic/enrollments", { method: "POST", body: JSON.stringify(payload) }),
    getTeacherAssignments: () => this.request("/academic/teacher-assignments"),
    createTeacherAssignment: (payload: { teacherId: string; classId: string; subjectId: string; isClassIncharge?: boolean }) =>
      this.request("/academic/teacher-assignments", { method: "POST", body: JSON.stringify(payload) }),
  };

  classes = {
    getAll: (params?: { name?: string; section?: string; academicYear?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/classes${q ? `?${q}` : ""}`);
    },
    getSections: () => this.request("/classes/sections"),
    getSectionsForClass: (id: string) => this.request(`/classes/${id}/sections`),
    getRoster: (id: string) => this.request(`/classes/${id}/roster`),
    getOne: (id: string) => this.request(`/classes/${id}`),
    create: (payload: { name: string; section: string; academicYear: string }) =>
      this.request("/classes", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<{ name: string; section: string; academicYear: string }>) =>
      this.request(`/classes/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  };

  subjects = {
    getAll: () => this.request("/subjects"),
    create: (payload: { name: string; code?: string; class?: any }) =>
      this.request("/subjects", { method: "POST", body: JSON.stringify(payload) }),
  };

  students = {
    getAll: (params?: { classId?: string; section?: string; isActive?: string | boolean; search?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/students${q ? `?${q}` : ""}`);
    },
    getOne: (id: string) => this.request(`/students/${id}`),
    getHistory: (id: string) => this.request(`/students/${id}/history`),
    create: (payload: any) => this.request("/students", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: any) => this.request(`/students/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    deactivate: (id: string) => this.request(`/students/${id}/deactivate`, { method: "PATCH" }),
    activate: (id: string) => this.request(`/students/${id}/activate`, { method: "PATCH" }),
  };

  teachers = {
    getAll: () => this.request("/teachers"),
    getOne: (id: string) => this.request(`/teachers/${id}`),
    create: (payload: { firstName: string; lastName: string; employeeId: string }) =>
      this.request("/teachers", { method: "POST", body: JSON.stringify(payload) }),
  };

  exams = {
    getAll: () => this.request("/exams"),
    create: (payload: any) => this.request("/exams", { method: "POST", body: JSON.stringify(payload) }),
    updateStatus: (id: string, status: string) =>
      this.request(`/exams/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  };

  marks = {
    getByAssessment: (assessmentId: string) => this.request(`/marks/assessment/${assessmentId}`),
    enterMark: (payload: { assessmentId: string; studentId: string; subjectId: string; obtainedMarks: number; isAbsent?: boolean }) =>
      this.request("/marks", { method: "POST", body: JSON.stringify(payload) }),
    importMarks: (rows: any[]) => this.request("/marks/import", { method: "POST", body: JSON.stringify({ rows }) }),
    importFile: (file: File | Blob, filename?: string) => this.uploadFile("/marks/import", file, filename),
    getTemplate: () => this.request("/marks/import/template"),
    publishAssessment: (assessmentId: string) =>
      this.request(`/marks/assessment/${assessmentId}/publish`, { method: "POST" }),
  };

  results = {
    getByAssessment: (assessmentId: string) => this.request(`/results/assessment/${assessmentId}`),
    getStudentSummary: (studentId: string, termId?: string) =>
      this.request(`/results/student/${studentId}/summary${termId ? `?termId=${termId}` : ""}`),
    getStudentReportCard: (studentId: string, termId?: string) =>
      this.request(`/results/student/${studentId}/report-card${termId ? `?termId=${termId}` : ""}`),
  };

  fees = {
    getStructures: () => this.request("/fees/structures"),
    createStructure: (payload: { name: string; amount: number; frequency?: string; academicYear?: string }) =>
      this.request("/fees/structures", { method: "POST", body: JSON.stringify(payload) }),
    getAll: () => this.request("/fees"),
    getChallan: (feeId: string) => this.request(`/fees/${feeId}/challan`),
    getMyDues: () => this.request("/fees/my-dues"),
    getStudentFees: (studentId: string) => this.request(`/fees/student/${studentId}`),
    createFee: (payload: { studentId: string; feeStructureId: string; amount: number; dueDate: string }) =>
      this.request("/fees", { method: "POST", body: JSON.stringify(payload) }),
    markPaid: (feeId: string, payload: { amount: number; paymentMethod: string; receiptNumber?: string }) =>
      this.request(`/fees/${feeId}/pay`, { method: "POST", body: JSON.stringify(payload) }),
    markUnpaid: (feeId: string) => this.request(`/fees/${feeId}/unpay`, { method: "POST" }),
    getPayments: (feeId: string) => this.request(`/fees/${feeId}/payments`),
  };

  audit = {
    getLogs: (params?: { action?: string; resource?: string; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/audit-logs${q ? `?${q}` : ""}`);
    },
  };

  analytics = {
    getSchoolOverview: () => this.request("/analytics/school-overview"),
    getStudentPerformance: (params?: { strongThreshold?: number; weakThreshold?: number; classId?: string; section?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request(`/analytics/student-performance${q ? `?${q}` : ""}`);
    },
    getPrincipalClassComparison: () => this.request("/analytics/principal/class-comparison"),
    getPrincipalTeacherPerformance: () => this.request("/analytics/principal/teacher-performance"),
    getInchargeClassOverview: (classId?: string) =>
      this.request(`/analytics/incharge/class-overview${classId ? `?classId=${classId}` : ""}`),
  };
}

export const api = new ApiClient();
