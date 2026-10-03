"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, AuthTokens } from "@/lib/api";
import { X, Sparkles, AlertCircle } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tokens: AuthTokens) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"bootstrap" | "login">("bootstrap");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bootstrap fields
  const [schoolName, setSchoolName] = useState("Horizon Grammar School");
  const [email, setEmail] = useState(`admin-${Date.now().toString().slice(-4)}@horizonschool.edu`);
  const [password, setPassword] = useState("AdminSecret123!");
  const [firstName, setFirstName] = useState("Tariq");
  const [lastName, setLastName] = useState("Mehmood");

  if (!isOpen) return null;

  const submit = async (
    e: React.FormEvent,
    run: () => Promise<any>,
    errFallback: string
  ) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await run();
      if (res.ok && res.data) {
        api.setAuth(res.data);
        onSuccess(res.data);
        onClose();
      } else {
        setError(res.error || errFallback);
      }
    } catch (err: any) {
      setError(err.message || "Failed to reach server");
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = (e: React.FormEvent) =>
    submit(
      e,
      () => api.auth.bootstrapSchool({ schoolName, email, password, firstName, lastName }),
      "Bootstrap failed. Check backend connection."
    );

  const handleLogin = (e: React.FormEvent) =>
    submit(e, () => api.auth.login({ email, password }), "Login failed. Invalid credentials.");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <Card className="w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute right-3 top-3 h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>

        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">School SaaS Authentication</CardTitle>
              <CardDescription className="text-xs">
                {mode === "bootstrap" ? "Bootstrap a new school tenant with Admin role" : "Sign in to your school organization"}
              </CardDescription>
            </div>
          </div>

          <div className="flex pt-2 border-b">
            <button
              onClick={() => { setMode("bootstrap"); setError(null); }}
              className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition-all ${
                mode === "bootstrap" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              Bootstrap School Tenant
            </button>
            <button
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition-all ${
                mode === "login" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              User Login
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === "bootstrap" ? (
            <form onSubmit={handleBootstrap} className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground font-medium">School / Organization Name</label>
                <Input
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted-foreground font-medium">Admin First Name</label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-8 text-xs mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-muted-foreground font-medium">Last Name</label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-8 text-xs mt-1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-muted-foreground font-medium">Admin Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-muted-foreground font-medium">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full text-xs h-9 mt-2">
                {loading ? "Bootstrapping School..." : "Bootstrap School & Admin Account"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground font-medium">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-muted-foreground font-medium">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full text-xs h-9 mt-2">
                {loading ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
