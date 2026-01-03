import { useTranslation } from "react-i18next";
import { Package, FolderGit, Shield } from "lucide-react";

interface StatisticsCardsProps {
  installedCount: number;
  repositoryCount: number;
  scannedCount: number;
}

export function StatisticsCards({
  installedCount,
  repositoryCount,
  scannedCount
}: StatisticsCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 已安装技能卡片（青色主题） */}
      <div
        className="
          bg-card border border-border
          rounded-lg p-6
          hover:shadow-lg hover:border-terminal-cyan/50
          transition-all duration-300
          relative overflow-hidden
        "
        style={{
          animation: 'fadeIn 0.4s ease-out'
        }}
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-terminal-cyan opacity-70"></div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-4xl font-bold text-terminal-cyan font-mono">
              {installedCount}
            </div>
            <div className="text-sm text-muted-foreground mt-2 font-medium">
              {t('overview.statistics.installedSkills')}
            </div>
          </div>
          <div className="ml-4">
            <Package className="w-8 h-8 text-terminal-cyan opacity-40" />
          </div>
        </div>
      </div>

      {/* 仓库数量卡片（绿色主题） */}
      <div
        className="
          bg-card border border-border
          rounded-lg p-6
          hover:shadow-lg hover:border-terminal-green/50
          transition-all duration-300
          relative overflow-hidden
        "
        style={{
          animation: 'fadeIn 0.4s ease-out 0.05s',
          animationFillMode: 'backwards'
        }}
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-terminal-green opacity-70"></div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-4xl font-bold text-terminal-green font-mono">
              {repositoryCount}
            </div>
            <div className="text-sm text-muted-foreground mt-2 font-medium">
              {t('overview.statistics.repositories')}
            </div>
          </div>
          <div className="ml-4">
            <FolderGit className="w-8 h-8 text-terminal-green opacity-40" />
          </div>
        </div>
      </div>

      {/* 扫描总数卡片（紫色主题） */}
      <div
        className="
          bg-card border border-border
          rounded-lg p-6
          hover:shadow-lg hover:border-terminal-purple/50
          transition-all duration-300
          relative overflow-hidden
        "
        style={{
          animation: 'fadeIn 0.4s ease-out 0.1s',
          animationFillMode: 'backwards'
        }}
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-terminal-purple opacity-70"></div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-4xl font-bold text-terminal-purple font-mono">
              {scannedCount}
            </div>
            <div className="text-sm text-muted-foreground mt-2 font-medium">
              {t('overview.statistics.scannedSkills')}
            </div>
          </div>
          <div className="ml-4">
            <Shield className="w-8 h-8 text-terminal-purple opacity-40" />
          </div>
        </div>
      </div>
    </div>
  );
}
