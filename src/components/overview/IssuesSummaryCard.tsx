import { useTranslation } from "react-i18next";
import { AlertTriangle, AlertCircle, Shield } from "lucide-react";

interface IssuesSummaryCardProps {
  issuesByLevel: Record<string, number>;
  filterLevel: string | null;
  onFilterChange: (level: string | null) => void;
}

const levelConfig = {
  Critical: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  Medium: { icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
  Safe: { icon: Shield, color: "text-success", bg: "bg-success/10" },
};

export function IssuesSummaryCard({
  issuesByLevel,
  filterLevel,
  onFilterChange,
}: IssuesSummaryCardProps) {
  const { t } = useTranslation();

  return (
    <div className="grid h-full grid-cols-3 gap-3">
      {Object.entries(levelConfig).map(([level, config]) => {
        const Icon = config.icon;
        const count = issuesByLevel[level] || 0;
        const isSelected = filterLevel === level;

        return (
          <button
            key={level}
            onClick={() => onFilterChange(isSelected ? null : level)}
            className={`macos-card p-4 text-left transition-all hover:shadow-md ${
              isSelected ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className={`p-2 rounded-lg ${config.bg} w-fit mb-2`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <div className={`text-2xl font-semibold ${config.color}`}>{count}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t(`overview.riskLevels.${level.toLowerCase()}`)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
