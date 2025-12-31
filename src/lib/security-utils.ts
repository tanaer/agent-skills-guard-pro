import type { SecurityIssue } from "@/types/security";

export function countIssuesBySeverity(issues: SecurityIssue[]) {
  return {
    critical: issues.filter((i) => i.severity === "Critical").length,
    error: issues.filter((i) => i.severity === "Error").length,
    warning: issues.filter((i) => i.severity === "Warning").length,
    info: issues.filter((i) => i.severity === "Info").length,
  };
}
