"use client";

import React, { useState, useEffect } from "react";
import { Navbar, ActiveTab } from "@/components/Navbar";
import { TestBench } from "@/components/TestBench";
import { AdminPortal } from "@/components/AdminPortal";
import { PrincipalPortal } from "@/components/PrincipalPortal";
import { InchargePortal } from "@/components/InchargePortal";
import { TeacherPortal } from "@/components/TeacherPortal";
import { StudentPortal } from "@/components/StudentPortal";
import { AuthModal } from "@/components/AuthModal";
import { api, UserSession, API_BASE } from "@/lib/api";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("test-bench");
  const [user, setUser] = useState<UserSession | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Check initial authentication and backend health
  useEffect(() => {
    const auth = api.getAuth();
    if (auth?.user) {
      setUser(auth.user);
    }

    // Ping backend
    const checkBackend = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "OPTIONS",
        }).catch(() => null);
        // If server answered or refused connection
        setBackendOnline(res !== null);
      } catch {
        setBackendOnline(false);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    api.setAuth(null);
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthModalOpen(true)}
        backendOnline={backendOnline}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        {activeTab === "test-bench" && <TestBench />}
        {activeTab === "admin" && <AdminPortal />}
        {activeTab === "principal" && <PrincipalPortal />}
        {activeTab === "incharge" && <InchargePortal />}
        {activeTab === "teacher" && <TeacherPortal />}
        {activeTab === "student" && <StudentPortal />}
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground bg-muted/20">
        School Management & Academic Intelligence SaaS — MVP Diagnostic & Testing Workspace
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(tokens) => setUser(tokens.user)}
      />
    </div>
  );
}
