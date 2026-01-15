import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, CheckCircle, Shield, X, RefreshCw } from "lucide-react";
import type { SkillScanResult } from "@/types/security";
import type { Skill, Repository } from "@/types";
import { api } from "@/lib/api";
import { StatisticsCards } from "./overview/StatisticsCards";
import { ScanStatusCard } from "./overview/ScanStatusCard";
import { IssuesSummaryCard } from "./overview/IssuesSummaryCard";
import { IssuesList } from "./overview/IssuesList";
import { appToast } from "@/lib/toast";
import { GroupCard, GroupCardItem } from "./ui/GroupCard";

export function OverviewPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);

  const { data: installedSkills = [] } = useQuery<Skill[]>({
    queryKey: ["skills", "installed"],
    queryFn: api.getInstalledSkills,
  });

  const { data: repositories = [] } = useQuery<Repository[]>({
    queryKey: ["repositories"],
    queryFn: api.getRepositories,
  });

  const { data: scanResults = [], isLoading } = useQuery<SkillScanResult[]>({
    queryKey: ["scanResults"],
    queryFn: async () => {
      return await invoke("get_scan_results");
    },
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      setIsScanning(true);
      let localSkillsCount = 0;

      try {
        const localSkills = await api.scanLocalSkills();
        localSkillsCount = localSkills.length;
        await queryClient.refetchQueries({ queryKey: ["skills", "installed"] });
        await queryClient.refetchQueries({ queryKey: ["skills"] });
      } catch (error: any) {
        console.error("扫描本地技能失败:", error);
        appToast.error(t("overview.scan.localSkillsFailed", { error: error.message }), { duration: 4000 });
      }

      const results = await invoke<SkillScanResult[]>("scan_all_installed_skills", {
        locale: i18n.language,
      });

      return { results, localSkillsCount };
    },
    onSuccess: ({ results, localSkillsCount }) => {
      queryClient.invalidateQueries({ queryKey: ["scanResults"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["skills", "installed"] });
      appToast.success(
        t("overview.scan.allCompleted", {
          localCount: localSkillsCount,
          scannedCount: results.length,
        }),
        { duration: 4000 }
      );
    },
    onError: (error: any) => {
      appToast.error(t("overview.scan.failed", { error: error.message }), { duration: 4000 });
    },
    onSettled: () => {
      setIsScanning(false);
    },
  });

  const statistics = useMemo(
    () => ({
      installedCount: installedSkills.length,
      repositoryCount: repositories.length,
      scannedCount: scanResults.length,
    }),
    [installedSkills, repositories, scanResults]
  );

  const issuesByLevel = useMemo(() => {
    const result: Record<string, number> = { Critical: 0, Medium: 0, Safe: 0 };
    scanResults.forEach((r) => {
      if (r.level === "Critical" || r.level === "High") result.Critical++;
      else if (r.level === "Medium" || r.level === "Low") result.Medium++;
      else if (r.level === "Safe") result.Safe++;
    });
    return result;
  }, [scanResults]);

  const lastScanTime = useMemo(() => {
    if (!scanResults.length) return null;
    return new Date(Math.max(...scanResults.map((r) => new Date(r.scanned_at).getTime())));
  }, [scanResults]);

  const issueCount = useMemo(() => {
    return scanResults.filter((r) => r.level !== "Safe").length;
  }, [scanResults]);

  const filteredIssues = useMemo(() => {
    return scanResults
      .filter((result) => {
        if (!filterLevel && result.level === "Safe") return false;
        if (filterLevel && result.level !== filterLevel) return false;
        return true;
      })
      .sort((a, b) => {
        const levelOrder = { Critical: 0, High: 1, Medium: 2, Low: 3, Safe: 4 };
        return (
          (levelOrder[a.level as keyof typeof levelOrder] || 999) -
          (levelOrder[b.level as keyof typeof levelOrder] || 999)
        );
      });
  }, [scanResults, filterLevel]);

  const handleOpenDirectory = async (skillId: string) => {
    try {
      const skill = installedSkills.find((s) => s.id === skillId);
      if (skill?.local_path) {
        await invoke("open_skill_directory", { localPath: skill.local_path });
      } else {
        appToast.error("无法找到技能路径", { duration: 4000 });
      }
    } catch (error: any) {
      appToast.error(t("skills.folder.openFailed", { error: error.message }), { duration: 4000 });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{t("overview.title")}</h1>
        <button
          onClick={() => scanMutation.mutate()}
          disabled={isScanning}
          className="macos-button-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
          {isScanning ? t("overview.scanStatus.scanning") : t("overview.scanStatus.scanAll")}
        </button>
      </div>

      <StatisticsCards
        installedCount={statistics.installedCount}
        repositoryCount={statistics.repositoryCount}
        scannedCount={statistics.scannedCount}
      />

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ScanStatusCard
            lastScanTime={lastScanTime}
            scannedCount={statistics.scannedCount}
            totalCount={statistics.installedCount}
            issueCount={issueCount}
            isScanning={isScanning}
          />
        </div>
        <div className="lg:col-span-5">
          <IssuesSummaryCard
            issuesByLevel={issuesByLevel}
            filterLevel={filterLevel}
            onFilterChange={setFilterLevel}
          />
        </div>
      </div>

      <GroupCard title={t("overview.section.issueDetails")}>
        <GroupCardItem noBorder className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm text-muted-foreground">
              {filteredIssues.length > 0
                ? t("overview.issues.showing", { count: filteredIssues.length })
                : t("overview.issues.noIssues")}
            </span>
            {filterLevel && (
              <button
                onClick={() => setFilterLevel(null)}
                className="macos-button-secondary text-xs flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                {t("overview.issues.clearFilters")}
              </button>
            )}
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-3">
                  {filterLevel === "Safe" ? (
                    <Shield className="w-10 h-10 text-success" />
                  ) : (
                    <CheckCircle className="w-10 h-10 text-success" />
                  )}
                  <div className="text-sm text-muted-foreground">
                    {filterLevel === "Critical"
                      ? t("overview.issues.noCriticalIssues")
                      : filterLevel === "Medium"
                        ? t("overview.issues.noMediumIssues")
                        : filterLevel === "Safe"
                          ? t("overview.issues.noSafeSkills")
                          : t("overview.issues.noIssues")}
                  </div>
                </div>
              </div>
            ) : (
              <IssuesList issues={filteredIssues} onOpenDirectory={handleOpenDirectory} />
            )}
          </div>
        </GroupCardItem>
      </GroupCard>
    </div>
  );
}
