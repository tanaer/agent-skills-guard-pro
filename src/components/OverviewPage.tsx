import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Loader2 } from "lucide-react";
import type { SkillScanResult } from "@/types/security";
import type { Skill, Repository } from "@/types";
import { api } from "@/lib/api";
import { StatisticsCards } from "./overview/StatisticsCards";
import { ScanStatusCard } from "./overview/ScanStatusCard";
import { IssuesSummaryCard } from "./overview/IssuesSummaryCard";
import { IssuesList } from "./overview/IssuesList";
import { toast } from "sonner";

export function OverviewPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);

  // 获取已安装技能
  const { data: installedSkills = [] } = useQuery<Skill[]>({
    queryKey: ["installedSkills"],
    queryFn: api.getInstalledSkills,
  });

  // 获取仓库列表
  const { data: repositories = [] } = useQuery<Repository[]>({
    queryKey: ["repositories"],
    queryFn: api.getRepositories,
  });

  // 获取扫描结果
  const { data: scanResults = [], isLoading } = useQuery<SkillScanResult[]>({
    queryKey: ["scanResults"],
    queryFn: async () => {
      return await invoke("get_scan_results");
    },
  });

  // 扫描 mutation - 先扫描本地技能，然后进行安全扫描
  const scanMutation = useMutation({
    mutationFn: async () => {
      setIsScanning(true);

      let localSkillsCount = 0;

      // 第一步：扫描本地技能目录，刷新技能列表
      try {
        const localSkills = await api.scanLocalSkills();
        localSkillsCount = localSkills.length;
        console.log(`扫描到 ${localSkillsCount} 个本地技能`);

        // 重新获取技能列表并等待完成
        await queryClient.refetchQueries({ queryKey: ["installedSkills"] });
        await queryClient.refetchQueries({ queryKey: ["skills"] });
      } catch (error: any) {
        console.error('扫描本地技能失败:', error);
        toast.error(t('overview.scan.localSkillsFailed', { error: error.message }), {
          duration: 4000,
          style: {
            background: 'rgba(239, 68, 68, 0.1)',
            border: '2px solid rgb(239, 68, 68)',
            backdropFilter: 'blur(8px)',
            color: 'rgb(252, 165, 165)',
            fontFamily: 'monospace',
            fontSize: '14px',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)',
          },
        });
      }

      // 第二步：对所有已安装技能进行安全扫描
      const results = await invoke<SkillScanResult[]>("scan_all_installed_skills", {
        locale: i18n.language,
      });

      return { results, localSkillsCount };
    },
    onSuccess: ({ results, localSkillsCount }) => {
      queryClient.invalidateQueries({ queryKey: ["scanResults"] });

      // 显示合并的成功提示
      toast.success(
        t('overview.scan.allCompleted', {
          localCount: localSkillsCount,
          scannedCount: results.length
        }),
        {
          duration: 4000,
          style: {
            background: 'rgba(6, 182, 212, 0.1)',
            border: '2px solid rgb(6, 182, 212)',
            backdropFilter: 'blur(8px)',
            color: 'rgb(94, 234, 212)',
            fontFamily: 'monospace',
            fontSize: '14px',
            boxShadow: '0 0 30px rgba(6, 182, 212, 0.3)',
          },
        }
      );
    },
    onError: (error: any) => {
      toast.error(t('overview.scan.failed', { error: error.message }), {
        duration: 4000,
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgb(239, 68, 68)',
          backdropFilter: 'blur(8px)',
          color: 'rgb(252, 165, 165)',
          fontFamily: 'monospace',
          fontSize: '14px',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)',
        },
      });
    },
    onSettled: () => {
      setIsScanning(false);
    },
  });

  // 统计数据
  const statistics = useMemo(() => ({
    installedCount: installedSkills.length,
    repositoryCount: repositories.length,
    scannedCount: scanResults.length,
  }), [installedSkills, repositories, scanResults]);

  // 按风险等级统计问题（简化为3级：Critical、Medium、Safe）
  const issuesByLevel = useMemo(() => {
    const result: Record<string, number> = {
      Critical: 0,
      Medium: 0,
      Safe: 0,
    };

    scanResults.forEach(r => {
      // 将 High 和 Critical 合并为 Critical
      if (r.level === 'Critical' || r.level === 'High') {
        result.Critical++;
      }
      // 将 Low 和 Medium 合并为 Medium
      else if (r.level === 'Medium' || r.level === 'Low') {
        result.Medium++;
      }
      // Safe 保持不变
      else if (r.level === 'Safe') {
        result.Safe++;
      }
    });

    return result;
  }, [scanResults]);

  // 最后扫描时间
  const lastScanTime = useMemo(() => {
    if (!scanResults.length) return null;
    return new Date(Math.max(...scanResults.map(r => new Date(r.scanned_at).getTime())));
  }, [scanResults]);

  // 问题数量（非 Safe 的技能）
  const issueCount = useMemo(() => {
    return scanResults.filter(r => r.level !== 'Safe').length;
  }, [scanResults]);

  // 过滤后的问题列表
  const filteredIssues = useMemo(() => {
    return scanResults
      .filter(result => {
        // 默认只显示有问题的技能
        if (!filterLevel && result.level === 'Safe') return false;
        // 如果选择了过滤等级
        if (filterLevel && result.level !== filterLevel) return false;
        return true;
      })
      .sort((a, b) => {
        // 按风险等级排序：Critical > High > Medium > Low
        const levelOrder = { Critical: 0, High: 1, Medium: 2, Low: 3, Safe: 4 };
        return (levelOrder[a.level as keyof typeof levelOrder] || 999) -
               (levelOrder[b.level as keyof typeof levelOrder] || 999);
      });
  }, [scanResults, filterLevel]);

  // 打开技能目录
  const handleOpenDirectory = async (skillId: string) => {
    try {
      // 从已安装技能中查找 local_path
      const skill = installedSkills.find(s => s.id === skillId);
      if (skill?.local_path) {
        await invoke('open_skill_directory', { localPath: skill.local_path });
      } else {
        toast.error('无法找到技能路径', {
          duration: 4000,
          style: {
            background: 'rgba(239, 68, 68, 0.1)',
            border: '2px solid rgb(239, 68, 68)',
            backdropFilter: 'blur(8px)',
            color: 'rgb(252, 165, 165)',
            fontFamily: 'monospace',
            fontSize: '14px',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)',
          },
        });
      }
    } catch (error: any) {
      toast.error(t('skills.folder.openFailed', { error: error.message }), {
        duration: 4000,
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgb(239, 68, 68)',
          backdropFilter: 'blur(8px)',
          color: 'rgb(252, 165, 165)',
          fontFamily: 'monospace',
          fontSize: '14px',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)',
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-terminal-cyan" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <h1 className="text-2xl font-bold text-terminal-cyan tracking-wider uppercase">
        {t('overview.title')}
      </h1>

      {/* 第一行：统计卡片 */}
      <StatisticsCards
        installedCount={statistics.installedCount}
        repositoryCount={statistics.repositoryCount}
        scannedCount={statistics.scannedCount}
      />

      {/* 第二行：扫描状态卡片 */}
      <ScanStatusCard
        lastScanTime={lastScanTime}
        scannedCount={statistics.scannedCount}
        totalCount={statistics.installedCount}
        issueCount={issueCount}
        isScanning={isScanning}
        onScan={() => scanMutation.mutate()}
      />

      {/* 第三行：问题汇总卡片 */}
      <IssuesSummaryCard
        issuesByLevel={issuesByLevel}
        filterLevel={filterLevel}
        onFilterChange={setFilterLevel}
      />

      {/* 第四行：问题详情列表 */}
      {filteredIssues.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-lg">
          <div className="text-lg font-medium mb-2">
            {filterLevel ? t('security.noResults') : t('overview.issues.noIssues')}
          </div>
          {!filterLevel && lastScanTime && (
            <div className="text-sm">
              {t('overview.issues.lastScanned', { time: lastScanTime.toLocaleString() })}
            </div>
          )}
        </div>
      ) : (
        <IssuesList
          issues={filteredIssues}
          onOpenDirectory={handleOpenDirectory}
        />
      )}
    </div>
  );
}
