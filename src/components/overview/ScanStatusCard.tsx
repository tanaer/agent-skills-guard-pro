import { useTranslation } from "react-i18next";
import { CheckCircle, Activity, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";

interface ScanStatusCardProps {
  lastScanTime: Date | null;
  scannedCount: number;
  totalCount: number;
  issueCount: number;
  isScanning: boolean;
}

export function ScanStatusCard({
  lastScanTime,
  scannedCount,
  totalCount,
  issueCount,
  isScanning,
}: ScanStatusCardProps) {
  const { t, i18n } = useTranslation();

  const progress = totalCount > 0 ? (scannedCount / totalCount) * 100 : 0;
  const isComplete = scannedCount === totalCount && totalCount > 0;

  const formatRelativeTime = (date: Date) => {
    const locale = i18n.language === "zh" ? zhCN : enUS;
    return formatDistanceToNow(date, { addSuffix: true, locale });
  };

  const getStatusColor = () => {
    if (isScanning) return "primary";
    if (isComplete && issueCount === 0) return "success";
    if (isComplete && issueCount > 0) return "warning";
    return "primary";
  };

  const statusColor = getStatusColor();

  return (
    <div className="macos-card p-5 h-full">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center">
        <div className="flex-shrink-0 min-w-[180px] space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t("overview.scanStatus.lastScan")}</span>
          </div>
          {lastScanTime ? (
            <div className={`text-sm font-medium text-${statusColor} pl-6`}>
              {formatRelativeTime(lastScanTime)}
            </div>
          ) : (
            <div className="text-sm font-medium text-warning pl-6">{t("overview.scanStatus.never")}</div>
          )}
          <div className="flex items-center gap-2 pl-6 pt-1">
            <Activity className={`w-4 h-4 text-${statusColor} ${isScanning ? "animate-pulse" : ""}`} />
            <div className="text-xs text-muted-foreground">
              {t("overview.scanStatus.scanned")}
              <span className={`font-medium mx-1 text-${statusColor}`}>{scannedCount}</span>
              {t("overview.scanStatus.of")}
              <span className={`font-medium mx-1 text-${statusColor}`}>{totalCount}</span>
              {t("overview.scanStatus.skills")}
            </div>
          </div>
        </div>

        <div className="flex-1 w-full space-y-3">
          <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isScanning
                  ? "bg-primary"
                  : isComplete && issueCount === 0
                    ? "bg-success"
                    : isComplete && issueCount > 0
                      ? "bg-warning"
                      : "bg-primary"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {isComplete && !isScanning ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className={`w-4 h-4 ${issueCount === 0 ? "text-success" : "text-warning"}`} />
              <span className="text-muted-foreground">
                {issueCount === 0
                  ? t("overview.scanStatus.noIssues")
                  : t("overview.scanStatus.completed", { count: issueCount })}
              </span>
            </div>
          ) : isScanning ? (
            <div className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-primary">{t("overview.scanStatus.scanning")}...</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
