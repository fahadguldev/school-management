"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserSession, API_BASE } from "@/lib/api";
import {
  GraduationCap,
  ShieldCheck,
  UserCheck,
  BookOpen,
  LineChart,
  Terminal,
  LogOut,
  Sparkles,
} from "lucide-react";

export type ActiveTab =
  | "test-bench"
  | "admin"
  | "principal"
  | "incharge"
  | "teacher"
  | "student";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user: UserSession | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  backendOnline: boolean | null;
}

export function Navbar({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  onOpenAuth,
  backendOnline,
}: NavbarProps) {
  const tabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "test-bench", label: "Diagnostics & Test Bench", icon: Terminal },
    { id: "admin", label: "Admin Portal", icon: ShieldCheck },
    { id: "principal", label: "Principal Portal", icon: LineChart },
    { id: "incharge", label: "Class Incharge", icon: UserCheck },
    { id: "teacher", label: "Teacher Portal", icon: BookOpen },
    { id: "student", label: "Student Portal", icon: GraduationCap },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-lg">EduSaaS</span>
              <Badge variant="outline" className="text-xs">Academic Intelligence</Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Multi-tenant School Operations & Performance Engine
            </p>
          </div>
        </div>

        {/* Backend health status badge */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border bg-muted/40">
          <span
            className={`h-2 w-2 rounded-full ${
              backendOnline === true
                ? "bg-emerald-500 animate-pulse"
                : backendOnline === false
                ? "bg-rose-500"
                : "bg-amber-500"
            }`}
          />
          <span className="text-muted-foreground">
            API {API_BASE.replace(/^https?:\/\//, "")} {backendOnline === true ? "Online" : backendOnline === false ? "Offline" : "Checking..."}
          </span>
        </div>

        {/* User / Auth Controls */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold">{user.email}</div>
                <div className="flex items-center justify-end space-x-1">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 uppercase">
                    {user.role}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onLogout} title="Log out">
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={onOpenAuth} className="text-xs">
              Bootstrap / Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Switcher Bar */}
      <nav className="flex overflow-x-auto border-t bg-muted/20 px-4 sm:px-8 py-1.5 space-x-1 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-background text-foreground shadow-xs border font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span>{tab.label}</span>
              {tab.id === "test-bench" && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] text-primary font-bold">
                  Test Matrix
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
