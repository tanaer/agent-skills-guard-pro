import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Eye, Trash2, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { SkillScanResult } from "@/types/security";
import { SecurityDetailDialog } from "../SecurityDetailDialog";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface IssuesListProps {
  issues: SkillScanResult[];
  onOpenDirectory: (localPath: string) => void;
}

const levelConfig = {
  Critical: { color: "text-terminal-red", bg: "bg-terminal-red/10", icon: AlertTriangle },
  Medium: { color: "text-terminal-yellow", bg: "bg-terminal-yellow/10", icon: AlertCircle },
  Safe: { color: "text-terminal-green", bg: "bg-terminal-green/10", icon: Info },
};

// 将原始的4级分类映射到3级
const mapSeverityTo3Levels = (severity: string): keyof typeof levelConfig => {
  if (severity === 'Critical' || severity === 'High') {
    return 'Critical';
  } else if (severity === 'Medium' || severity === 'Low') {
    return 'Medium';
  }
  return 'Safe';
};

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-terminal-green";
  if (score >= 70) return "text-terminal-yellow";
  if (score >= 50) return "text-terminal-orange";
  return "text-terminal-red";
};

export function IssuesList({ issues, onOpenDirectory }: IssuesListProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());
  const [selectedSkill, setSelectedSkill] = useState<SkillScanResult | null>(null);

  const toggleExpanded = (skillId: string) => {
    setExpandedSkills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skillId)) {
        newSet.delete(skillId);
      } else {
        newSet.add(skillId);
      }
      return newSet;
    });
  };

  // 卸载 mutation
  const uninstallMutation = useMutation({
    mutationFn: async (skillId: string) => {
      return await api.uninstallSkill(skillId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installedSkills"] });
      queryClient.invalidateQueries({ queryKey: ["scanResults"] });
      toast.success(t('skills.toast.uninstalled'));
    },
    onError: (error: Error) => {
      toast.error(t('skills.toast.uninstallFailed') + `: ${error.message}`);
    },
  });

  const handleUninstall = (skillId: string) => {
    if (window.confirm(t('overview.issues.confirmUninstall'))) {
      uninstallMutation.mutate(skillId);
    }
  };

  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {issues.map((issue, index) => {
        const isExpanded = expandedSkills.has(issue.skill_id);
        const LevelIcon = levelConfig[issue.level as keyof typeof levelConfig]?.icon || AlertCircle;
        const levelColorClass = levelConfig[issue.level as keyof typeof levelConfig]?.color || "";
        const levelBgClass = levelConfig[issue.level as keyof typeof levelConfig]?.bg || "";

        // 统计各等级问题数量（映射到3级分类）
        const issueStats = issue.report.issues.reduce((acc, item) => {
          const mappedSeverity = mapSeverityTo3Levels(item.severity);
          acc[mappedSeverity] = (acc[mappedSeverity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // 获取最严重的前 3 个问题
        const topIssues = issue.report.issues
          .sort((a, b) => {
            const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3, Safe: 4 };
            return (severityOrder[a.severity as keyof typeof severityOrder] || 999) -
                   (severityOrder[b.severity as keyof typeof severityOrder] || 999);
          })
          .slice(0, 3);

        return (
          <div
            key={issue.skill_id}
            className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300"
            style={{
              animation: `fadeIn 0.4s ease-out ${index * 0.05}s`,
              animationFillMode: 'backwards'
            }}
          >
            {/* 顶部栏 */}
            <div className="p-4 border-b border-border">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* 左侧：技能名称 + 风险等级 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-mono font-bold text-lg text-foreground truncate">
                      {issue.skill_name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${levelBgClass} ${levelColorClass}`}>
                      <LevelIcon className="w-3 h-3" />
                      {t(`overview.riskLevels.${issue.level.toLowerCase()}`)}
                    </span>
                  </div>
                </div>

                {/* 中间：安全评分 */}
                <div className="flex-shrink-0">
                  <div className={`text-3xl font-bold font-mono ${getScoreColor(issue.score)}`}>
                    {issue.score}
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {t('skills.securityScore')}
                  </div>
                </div>

                {/* 右侧：操作按钮 */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const skill = issues.find(i => i.skill_id === issue.skill_id);
                      if (skill) {
                        // 需要从已安装技能中获取 local_path
                        // 这里暂时使用 skill_id，实际需要查询
                        onOpenDirectory(issue.skill_id);
                      }
                    }}
                    className="
                      px-3 py-1.5 text-sm
                      bg-terminal-cyan/10
                      text-terminal-cyan
                      border border-terminal-cyan/30
                      rounded font-medium
                      hover:bg-terminal-cyan/20 hover:border-terminal-cyan/50
                      transition-all
                      flex items-center gap-1
                    "
                    title={t('overview.issues.openDirectory')}
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('overview.issues.openDirectory')}</span>
                  </button>

                  <button
                    onClick={() => setSelectedSkill(issue)}
                    className="
                      px-3 py-1.5 text-sm
                      bg-terminal-purple/10
                      text-terminal-purple
                      border border-terminal-purple/30
                      rounded font-medium
                      hover:bg-terminal-purple/20 hover:border-terminal-purple/50
                      transition-all
                      flex items-center gap-1
                    "
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('overview.issues.viewDetails')}</span>
                  </button>

                  <button
                    onClick={() => handleUninstall(issue.skill_id)}
                    disabled={uninstallMutation.isPending}
                    className="
                      px-3 py-1.5 text-sm
                      bg-terminal-red/10
                      text-terminal-red
                      border border-terminal-red/30
                      rounded font-medium
                      hover:bg-terminal-red/20 hover:border-terminal-red/50
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all
                      flex items-center gap-1
                    "
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('overview.issues.uninstall')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 问题预览区 */}
            <div className="p-4 bg-muted/30">
              {!isExpanded ? (
                // 折叠状态：显示摘要
                <div
                  onClick={() => toggleExpanded(issue.skill_id)}
                  className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -m-2 p-2 rounded transition-colors"
                >
                  <div className="text-sm text-muted-foreground">
                    {t('overview.issues.found', {
                      count: issue.report.issues.length,
                      breakdown: Object.entries(issueStats)
                        .map(([severity, count]) =>
                          t('overview.issues.issueCount', {
                            count,
                            level: t(`security.levels.${severity.toLowerCase()}`)
                          })
                        )
                        .join('，')
                    })}
                  </div>
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                </div>
              ) : (
                // 展开状态：显示前 3 个问题
                <div className="space-y-3">
                  <div
                    onClick={() => toggleExpanded(issue.skill_id)}
                    className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -m-2 p-2 rounded transition-colors mb-2"
                  >
                    <div className="text-sm font-medium text-foreground">
                      {t('overview.issues.found', {
                        count: issue.report.issues.length,
                        breakdown: ''
                      }).split('：')[0]}
                    </div>
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  </div>

                  {topIssues.map((item, idx) => {
                    const mappedSeverity = mapSeverityTo3Levels(item.severity);
                    const IssueIcon = levelConfig[mappedSeverity]?.icon || AlertCircle;
                    const issueColor = levelConfig[mappedSeverity]?.color || "";

                    return (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <IssueIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${issueColor}`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-foreground line-clamp-2">
                            {item.description}
                          </span>
                          {item.line_number && (
                            <span className="text-muted-foreground text-xs ml-2">
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
                      className="text-sm text-terminal-cyan hover:underline font-medium"
                    >
                      {t('overview.issues.viewFullReport')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 安全详情对话框 */}
      <SecurityDetailDialog
        result={selectedSkill}
        open={selectedSkill !== null}
        onClose={() => setSelectedSkill(null)}
      />
    </div>
  );
}
