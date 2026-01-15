import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  Info,
  Eye,
  CheckCircle,
} from "lucide-react";
import type { SkillScanResult } from "@/types/security";
import { SecurityDetailDialog } from "../SecurityDetailDialog";
import { api } from "@/lib/api";
import { appToast } from "@/lib/toast";

interface IssuesListProps {
  issues: SkillScanResult[];
  onOpenDirectory: (localPath: string) => void;
}

const levelConfig = {
  Critical: { color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle },
  Medium: { color: "text-warning", bg: "bg-warning/10", icon: AlertCircle },
  Safe: { color: "text-success", bg: "bg-success/10", icon: Info },
};

const mapSeverityTo3Levels = (severity: string): keyof typeof levelConfig => {
  if (severity === "Critical" || severity === "High") return "Critical";
  if (severity === "Medium" || severity === "Low") return "Medium";
  return "Safe";
};

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-success";
  if (score >= 70) return "text-warning";
  return "text-destructive";
};

export function IssuesList({ issues, onOpenDirectory }: IssuesListProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());
  const [selectedSkill, setSelectedSkill] = useState<SkillScanResult | null>(null);

  const toggleExpanded = (skillId: string) => {
    setExpandedSkills((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(skillId)) newSet.delete(skillId);
      else newSet.add(skillId);
      return newSet;
    });
  };

  const uninstallMutation = useMutation({
    mutationFn: async (skillId: string) => api.uninstallSkill(skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills", "installed"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["scanResults"] });
      appToast.success(t("skills.toast.uninstalled"), { duration: 3000 });
    },
    onError: (error: Error) => {
      appToast.error(t("skills.toast.uninstallFailed") + `: ${error.message}`, { duration: 4000 });
    },
  });

  if (issues.length === 0) return null;

  return (
    <div className="divide-y divide-border">
      {issues.map((issue) => {
        const isExpanded = expandedSkills.has(issue.skill_id);
        const LevelIcon = levelConfig[issue.level as keyof typeof levelConfig]?.icon || AlertCircle;
        const levelColorClass = levelConfig[issue.level as keyof typeof levelConfig]?.color || "";
        const levelBgClass = levelConfig[issue.level as keyof typeof levelConfig]?.bg || "";

        const issueStats = issue.report.issues.reduce(
          (acc, item) => {
            const mappedSeverity = mapSeverityTo3Levels(item.severity);
            acc[mappedSeverity] = (acc[mappedSeverity] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        const uniqueIssues = Array.from(
          new Map(
            issue.report.issues.map((item) => [`${item.file_path || ""}::${item.description}`, item])
          ).values()
        );
        const topIssues = uniqueIssues
          .sort((a, b) => {
            const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3, Safe: 4 };
            return (
              (severityOrder[a.severity as keyof typeof severityOrder] || 999) -
              (severityOrder[b.severity as keyof typeof severityOrder] || 999)
            );
          })
          .slice(0, 3);

        return (
          <div key={issue.skill_id} className="p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-medium text-foreground">{issue.skill_name}</h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${levelBgClass} ${levelColorClass}`}
                  >
                    <LevelIcon className="w-3 h-3" />
                    {t(`overview.riskLevels.${issue.level.toLowerCase()}`)}
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0">
                <div className={`text-xs ${getScoreColor(issue.score)}`}>
                  {t("skills.securityScore")}：<span className="text-base font-semibold">{issue.score}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onOpenDirectory(issue.skill_id)}
                  className="macos-button-secondary text-xs flex items-center gap-1"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t("overview.issues.openDirectory")}</span>
                </button>
                <button
                  onClick={() => uninstallMutation.mutate(issue.skill_id)}
                  disabled={uninstallMutation.isPending}
                  className="macos-button-destructive text-xs flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t("overview.issues.uninstall")}</span>
                </button>
              </div>
            </div>

            <div className="mt-3 pl-0 md:pl-0">
              {issue.report.issues.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle className="w-4 h-4" />
                  <span>{t("overview.issues.skillSafe")}</span>
                </div>
              ) : !isExpanded ? (
                <button
                  onClick={() => toggleExpanded(issue.skill_id)}
                  className="flex items-center justify-between w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <span>
                    {t("overview.issues.found", {
                      count: issue.report.issues.length,
                      breakdown: Object.entries(issueStats)
                        .map(([severity, count]) =>
                          t("overview.issues.issueCount", {
                            count,
                            level: t(`security.levels.${severity.toLowerCase()}`),
                          })
                        )
                        .join("，"),
                    })}
                  </span>
                  <ChevronDown className="w-4 h-4 text-primary" />
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => toggleExpanded(issue.skill_id)}
                    className="flex items-center justify-between w-full text-left text-xs font-medium py-2"
                  >
                    <span>{t("overview.issues.found", { count: issue.report.issues.length, breakdown: "" }).split("：")[0]}</span>
                    <ChevronUp className="w-4 h-4 text-primary" />
                  </button>

                  {topIssues.map((item, idx) => {
                    const mappedSeverity = mapSeverityTo3Levels(item.severity);
                    const IssueIcon = levelConfig[mappedSeverity]?.icon || AlertCircle;
                    const issueColor = levelConfig[mappedSeverity]?.color || "";

                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs p-2 rounded-lg bg-muted/50"
                      >
                        <IssueIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${issueColor}`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-foreground">
                            {item.file_path && (
                              <span className="text-primary mr-1">[{item.file_path}]</span>
                            )}
                            {item.description}
                          </span>
                          {item.line_number && (
                            <span className="text-muted-foreground text-[11px] ml-2">
                              (行 {item.line_number})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {issue.report.issues.length > 3 && (
                    <button
                      onClick={() => setSelectedSkill(issue)}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <span>{t("overview.issues.viewFullReport")}</span>
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <SecurityDetailDialog
        result={selectedSkill}
        open={selectedSkill !== null}
        onClose={() => setSelectedSkill(null)}
      />
    </div>
  );
}
