"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Banknote, Bell, CalendarCheck, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Metric = "passRate" | "attendance" | "feeCollection" | "improvement";

const metricLabels: Record<Metric, string> = {
  passRate: "Pass rate",
  attendance: "Attendance",
  feeCollection: "Fee collection",
  improvement: "Term improvement",
};

export function PrincipalIntelligenceSuite() {
  const [metric, setMetric] = useState<Metric>("passRate");
  const [threshold, setThreshold] = useState(70);
  const [matches, setMatches] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  const loadThreshold = useCallback(() => {
    api.intelligence.getThreshold(metric, threshold).then((response) => {
      if (response.ok) setMatches(response.data?.matches || []);
    });
  }, [metric, threshold]);

  useEffect(() => {
    const timer = window.setTimeout(loadThreshold, 150);
    return () => window.clearTimeout(timer);
  }, [loadThreshold]);

  useEffect(() => {
    Promise.all([
      api.intelligence.getDashboard(),
      api.intelligence.getAtRiskStudents(),
      api.intelligence.getAlerts(),
    ]).then(([dashboardResponse, riskResponse, alertResponse]) => {
      if (dashboardResponse.ok) setDashboard(dashboardResponse.data);
      if (riskResponse.ok) setRisks((riskResponse.data as any[]) || []);
      if (alertResponse.ok) setAlerts((alertResponse.data as any[]) || []);
    });
  }, []);

  const evaluateAlerts = async () => {
    await api.intelligence.evaluateAlerts();
    const response = await api.intelligence.getAlerts();
    if (response.ok) setAlerts((response.data as any[]) || []);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Snapshot icon={CalendarCheck} label="Present today" value={`${dashboard?.attendance?.presentPercentage ?? 0}%`} />
        <Snapshot icon={Users} label="Absent today" value={dashboard?.attendance?.absentCount ?? 0} />
        <Snapshot icon={Banknote} label="Collected this month" value={Number(dashboard?.fees?.collectedThisMonth || 0).toLocaleString()} />
        <Snapshot icon={AlertTriangle} label="Fee defaulters" value={dashboard?.fees?.defaulterCount ?? 0} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Adjustable threshold explorer</CardTitle>
          <CardDescription className="text-xs">Move one control to surface every class or section below the selected benchmark.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select value={metric} onChange={(event) => setMetric(event.target.value as Metric)} className="h-9 rounded-md border bg-background px-3 text-xs">
              {Object.entries(metricLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
            <input aria-label="Threshold" type="range" min={metric === "improvement" ? -20 : 0} max="100" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} className="min-w-52 flex-1" />
            <Badge variant="secondary">Below {threshold}{metric === "improvement" ? " pts" : "%"}</Badge>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Class</TableHead><TableHead>Current</TableHead><TableHead>Gap</TableHead><TableHead>Drill down</TableHead></TableRow></TableHeader>
            <TableBody>
              {matches.length ? matches.map((row) => (
                <TableRow key={row.classId} className="text-xs">
                  <TableCell className="font-medium">{row.className}-{row.section}</TableCell>
                  <TableCell>{row.currentValue}{metric === "improvement" ? " pts" : "%"}</TableCell>
                  <TableCell className="text-rose-600">{row.gap}</TableCell>
                  <TableCell><a href={row.detailUrl} className="text-primary underline">Open class</a></TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No classes fall below this threshold.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Early-warning students</CardTitle><CardDescription className="text-xs">Consecutive academic decline, cross-referenced with attendance.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {risks.slice(0, 6).map((student) => (
              <div key={student.studentId} className="flex items-center justify-between rounded border p-2 text-xs">
                <div><div className="font-semibold">{student.studentName}</div><div className="text-muted-foreground">{student.className}-{student.section} · {student.consecutiveDrops} consecutive drops</div></div>
                <Badge variant={student.attendancePerformanceRisk ? "destructive" : "secondary"}>{student.totalDecline} pts</Badge>
              </div>
            ))}
            {!risks.length && <div className="py-4 text-center text-xs text-muted-foreground">No sustained declines detected.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div><CardTitle className="text-sm">Principal alerts</CardTitle><CardDescription className="text-xs">Proactive threshold breaches with direct drill-down links.</CardDescription></div>
            <Button size="sm" variant="outline" onClick={evaluateAlerts}><Bell className="mr-1 h-3 w-3" />Evaluate</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 6).map((alert) => (
              <a href={alert.detailUrl} key={alert.id} className="block rounded border p-2 text-xs hover:bg-muted/50">
                <div className="font-semibold">{alert.title}</div><div className="text-muted-foreground">{alert.message}</div>
              </a>
            ))}
            {!alerts.length && <div className="py-4 text-center text-xs text-muted-foreground">No active alerts. Run evaluation to check current thresholds.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Snapshot({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return <Card><CardContent className="flex items-center gap-3 p-4"><Icon className="h-5 w-5 text-primary" /><div><div className="text-[11px] uppercase text-muted-foreground">{label}</div><div className="text-xl font-bold">{value}</div></div></CardContent></Card>;
}
