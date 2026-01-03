import { useTranslation } from "react-i18next";
import { Package, FolderGit, Shield } from "lucide-react";

interface StatisticsCardsProps {
  installedCount: number;
  repositoryCount: number;
  scannedCount: number;
}

const cards = [
  {
    key: 'installedSkills',
    color: 'terminal-cyan',
    icon: Package,
    hoverBorder: 'hover:border-terminal-cyan/50',
    hoverShadow: 'hover:shadow-terminal-cyan/20',
    accentBar: 'bg-terminal-cyan',
    textClass: 'text-terminal-cyan',
  },
  {
    key: 'repositories',
    color: 'terminal-green',
    icon: FolderGit,
    hoverBorder: 'hover:border-terminal-green/50',
    hoverShadow: 'hover:shadow-terminal-green/20',
    accentBar: 'bg-terminal-green',
    textClass: 'text-terminal-green',
  },
  {
    key: 'scannedSkills',
    color: 'terminal-purple',
    icon: Shield,
    hoverBorder: 'hover:border-terminal-purple/50',
    hoverShadow: 'hover:shadow-terminal-purple/20',
    accentBar: 'bg-terminal-purple',
    textClass: 'text-terminal-purple',
  },
];

export function StatisticsCards({
  installedCount,
  repositoryCount,
  scannedCount
}: StatisticsCardsProps) {
  const { t } = useTranslation();
  const counts = [installedCount, repositoryCount, scannedCount];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const count = counts[index];

        return (
          <div
            key={card.key}
            className={`
              bg-card border border-border
              rounded-lg p-6
              hover:shadow-lg ${card.hoverBorder} ${card.hoverShadow}
              transition-all duration-300
              relative overflow-hidden
            `}
            style={{
              animation: `fadeIn 0.4s ease-out ${index * 0.05}s`,
              animationFillMode: 'backwards'
            }}
          >
            {/* 左侧赛博朋克风格竖线 */}
            <div className={`absolute top-0 left-0 w-1 h-full ${card.accentBar} opacity-70`}></div>

            {/* 顶部角落装饰 */}
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-border/30 rounded-tr-lg"></div>

            {/* 背景六边形装饰 */}
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 ${card.textClass} opacity-5`}>
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="currentColor" />
              </svg>
            </div>

            {/* 内容区 */}
            <div className="relative pl-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className={`text-4xl font-bold ${card.textClass} font-mono mb-2`}>
                    {count}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                    {t(`overview.statistics.${card.key}`)}
                  </div>
                </div>
                <div className="ml-4">
                  <Icon className={`w-8 h-8 ${card.textClass} opacity-40`} />
                </div>
              </div>
            </div>

            {/* 底部扫描线效果 */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-30"></div>
          </div>
        );
      })}
    </div>
  );
}
