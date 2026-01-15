import { useTranslation } from "react-i18next";
import { Package, FolderGit, Shield } from "lucide-react";

interface StatisticsCardsProps {
  installedCount: number;
  repositoryCount: number;
  scannedCount: number;
}

const cards = [
  { key: "installedSkills", icon: Package, color: "text-primary", bg: "bg-primary/10" },
  { key: "repositories", icon: FolderGit, color: "text-success", bg: "bg-success/10" },
  { key: "scannedSkills", icon: Shield, color: "text-[#AF52DE]", bg: "bg-[#AF52DE]/10" },
];

export function StatisticsCards({
  installedCount,
  repositoryCount,
  scannedCount,
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
            className="macos-card p-5 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className={`text-3xl font-semibold ${card.color}`}>{count}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {t(`overview.statistics.${card.key}`)}
              </div>
            </div>
            <div className={`p-3 rounded-xl ${card.bg}`}>
              <Icon className={`w-6 h-6 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
