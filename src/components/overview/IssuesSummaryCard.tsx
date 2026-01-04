import { useTranslation } from "react-i18next";
import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";

interface IssuesSummaryCardProps {
  issuesByLevel: Record<string, number>;
  filterLevel: string | null;
  onFilterChange: (level: string | null) => void;
}

const levelConfig = {
  Critical: {
    icon: AlertTriangle,
    textClass: "text-terminal-red",
    accentBar: "bg-terminal-red",
    hoverBorder: "hover:border-terminal-red/50",
    hoverShadow: "hover:shadow-terminal-red/20",
  },
  Medium: {
    icon: AlertCircle,
    textClass: "text-terminal-yellow",
    accentBar: "bg-terminal-yellow",
    hoverBorder: "hover:border-terminal-yellow/50",
    hoverShadow: "hover:shadow-terminal-yellow/20",
  },
  Safe: {
    icon: CheckCircle,
    textClass: "text-terminal-green",
    accentBar: "bg-terminal-green",
    hoverBorder: "hover:border-terminal-green/50",
    hoverShadow: "hover:shadow-terminal-green/20",
  },
};

export function IssuesSummaryCard({
  issuesByLevel,
  filterLevel,
  onFilterChange
}: IssuesSummaryCardProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Object.entries(levelConfig).map(([level, config], index) => {
        const Icon = config.icon;
        const count = issuesByLevel[level] || 0;
        const isSelected = filterLevel === level;

        return (
          <div
            key={level}
            onClick={() => onFilterChange(isSelected ? null : level)}
            className={`
              bg-card
              border border-border
              rounded-lg p-5
              cursor-pointer
              transition-all duration-300
              hover:shadow-lg
              ${config.hoverBorder} ${config.hoverShadow}
              relative overflow-hidden
            `}
            style={{
              animation: `fadeIn 0.4s ease-out ${index * 0.05}s`,
              animationFillMode: 'backwards'
            }}
          >
            {/* 左侧赛博朋克风格竖线 */}
            <div className={`absolute top-0 left-0 ${isSelected ? 'w-2' : 'w-1'} h-full ${config.accentBar} ${isSelected ? 'opacity-100' : 'opacity-60'} transition-all duration-300`}></div>

            {/* 顶部角落装饰 */}
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-border/30 rounded-tr-lg"></div>

            {/* 内容区 */}
            <div className="relative pl-3">
              <div className="flex items-start justify-between mb-3">
                <Icon className={`w-6 h-6 ${config.textClass} opacity-80`} />
              </div>
              <div className={`text-4xl font-bold font-mono ${config.textClass} mb-2`}>
                {count}
              </div>
              <div className={`text-sm font-medium text-muted-foreground uppercase tracking-wide`}>
                {t(`overview.riskLevels.${level.toLowerCase()}`)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
