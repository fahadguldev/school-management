"use client";

import React, { useEffect, useState } from "react";
import { CalendarCheck, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const statuses = ["PRESENT", "ABSENT", "LATE", "LEAVE"] as const;

export function AttendancePanel() {
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState("");
  const [session, setSession] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.classes.getAll().then((response) => {
      const rows = response.ok ? (response.data as any[]) || [] : [];
      setClasses(rows);
      if (rows[0]) setClassId(rows[0].id);
    });
  }, []);

  const openSession = async () => {
    if (!classId) return;
    const response = await api.attendance.createSession({ classId, date: new Date().toISOString().slice(0, 10) });
    if (response.ok) setSession(response.data);
    else setMessage(response.error || "Could not open attendance");
  };

  const mark = async (studentIds: string[], status: string) => {
    if (!session || !studentIds.length) return;
    const response = await api.attendance.mark(session.id, { studentIds, status });
    if (response.ok) {
      setSession(response.data);
      setSelected(new Set());
      setMessage(`${studentIds.length} attendance record(s) updated.`);
    } else setMessage(response.error || "Attendance update failed");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm"><CalendarCheck className="h-4 w-4" />Today&apos;s attendance</CardTitle>
        <CardDescription className="text-xs">Everyone starts Present. Touch only exceptions, or select a group for one bulk action.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <select className="h-9 rounded-md border bg-background px-3 text-xs" value={classId} onChange={(event) => { setClassId(event.target.value); setSession(null); }}>
            {classes.map((item) => <option key={item.id} value={item.id}>Class {item.name}-{item.section}</option>)}
          </select>
          <Button size="sm" onClick={openSession}>Open class</Button>
          {session && !session.locked && <Button size="sm" variant="destructive" onClick={() => mark(session.records.map((record: any) => record.student.id), "ABSENT")}>Mark whole class absent</Button>}
          {session?.locked && <Badge variant="secondary"><Lock className="mr-1 h-3 w-3" />Locked</Badge>}
        </div>
        {message && <div className="rounded bg-muted p-2 text-xs">{message}</div>}
        {session && <>
          <div className="flex flex-wrap gap-2 text-xs">
            {statuses.map((status) => <Badge key={status} variant="secondary">{status}: {session.counts?.[status.toLowerCase()] || 0}</Badge>)}
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {session.records.map((record: any) => (
              <div key={record.id} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                <label className="flex min-w-0 items-center gap-2"><input type="checkbox" checked={selected.has(record.student.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(record.student.id)) next.delete(record.student.id); else next.add(record.student.id); return next; })} /><span className="truncate font-medium">{record.student.name}</span></label>
                <div className="flex gap-1">{statuses.filter((status) => status !== "PRESENT").map((status) => <button disabled={session.locked} key={status} onClick={() => mark([record.student.id], status)} className={`rounded px-1.5 py-1 text-[10px] ${record.status === status ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{status}</button>)}</div>
              </div>
            ))}
          </div>
          {!!selected.size && <div className="flex items-center gap-2 rounded border p-2 text-xs"><span>{selected.size} selected:</span>{statuses.map((status) => <Button key={status} size="sm" variant="outline" onClick={() => mark(Array.from(selected), status)}>{status}</Button>)}</div>}
        </>}
      </CardContent>
    </Card>
  );
}
