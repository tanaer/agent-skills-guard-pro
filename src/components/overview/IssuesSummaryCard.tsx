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
    bgClass: "bg-card",
    borderClass: "border-border",
    textClass: "text-terminal-red",
    labelClass: "text-muted-foreground",
    accentColor: "terminal-red",
  },
  Medium: {
    icon: AlertCircle,
    bgClass: "bg-card",
    borderClass: "border-border",
    textClass: "text-terminal-yellow",
    labelClass: "text-muted-foreground",
    accentColor: "terminal-yellow",
  },
  Safe: {
    icon: CheckCircle,
    bgClass: "bg-card",
    borderClass: "border-border",
    textClass: "text-terminal-green",
    labelClass: "text-muted-foreground",
    accentColor: "terminal-green",
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
              ${config.bgClass}
              border ${config.borderClass}
              rounded-lg p-4
              cursor-pointer
              transition-all duration-200
              hover:shadow-lg hover:border-${config.accentColor}/50
              relative overflow-hidden
              ${isSelected ? 'ring-2 ring-terminal-cyan ring-offset-2 dark:ring-offset-background scale-105' : ''}
            `}
            style={{
              animation: `fadeIn 0.4s ease-out ${index * 0.05}s`,
              animationFillMode: 'backwards'
            }}
          >
            <div className={`absolute top-0 left-0 w-1 h-full bg-${config.accentColor} ${isSelected ? 'opacity-100' : 'opacity-40'} transition-opacity`}></div>
            <div className="flex items-start justify-between mb-2">
              <Icon className={`w-5 h-5 ${config.textClass} opacity-70`} />
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-terminal-cyan animate-pulse" />
              )}
            </div>
            <div className={`text-3xl font-bold font-mono ${config.textClass}`}>
              {count}
            </div>
            <div className={`text-sm font-medium mt-2 ${config.labelClass}`}>
              {t(`overview.riskLevels.${level.toLowerCase()}`)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
