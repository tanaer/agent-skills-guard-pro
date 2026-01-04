import { useTranslation } from "react-i18next";
import { CheckCircle } from "lucide-react";
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

  // 格式化相对时间
  const formatRelativeTime = (date: Date) => {
    const locale = i18n.language === 'zh' ? zhCN : enUS;
    return formatDistanceToNow(date, { addSuffix: true, locale });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg hover:shadow-terminal-cyan/10 hover:border-terminal-cyan/30 transition-all duration-300 relative overflow-hidden">
      {/* 左侧赛博朋克风格竖线 */}
      <div className="absolute top-0 left-0 w-1 h-full bg-terminal-cyan opacity-50"></div>

      {/* 顶部角落装饰 */}
      <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-border/30 rounded-tr-lg"></div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center relative pl-3">
        {/* 左侧：扫描信息 */}
        <div className="flex-shrink-0 min-w-[200px]">
          <div className="text-sm text-muted-foreground mb-2">
            <span className="font-medium uppercase tracking-wide">{t('overview.scanStatus.lastScan')}：</span>
            {lastScanTime ? (
              <span className="text-foreground font-mono">{formatRelativeTime(lastScanTime)}</span>
            ) : (
              <span className="text-terminal-yellow font-mono">{t('overview.scanStatus.never')}</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {t('overview.scanStatus.scanned')}
            <span className="font-mono font-bold text-terminal-cyan mx-1">
              {scannedCount}
            </span>
            {t('overview.scanStatus.of')}
            <span className="font-mono font-bold mx-1">
              {totalCount}
            </span>
            {t('overview.scanStatus.skills')}
          </div>
        </div>

        {/* 进度条 - 占据剩余全部空间 */}
        <div className="flex-1">
          <div className="relative w-full h-3 bg-muted/50 rounded-full overflow-hidden border border-border/50">
            {/* 背景扫描线动画 */}
            {isScanning && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-terminal-cyan/20 to-transparent animate-scan-line"></div>
            )}

            <div
              className={`
                h-full transition-all duration-500 rounded-full relative
                ${isScanning
                  ? 'bg-gradient-to-r from-terminal-cyan/70 to-terminal-cyan'
                  : isComplete && issueCount === 0
                  ? 'bg-gradient-to-r from-terminal-green/70 to-terminal-green'
                  : isComplete && issueCount > 0
                  ? 'bg-gradient-to-r from-terminal-yellow/70 to-terminal-yellow'
                  : 'bg-gradient-to-r from-terminal-cyan/70 to-terminal-cyan'
                }
              `}
              style={{ width: `${progress}%` }}
            >
              {/* 进度条发光效果 */}
              {isScanning && (
                <div className="absolute inset-0 bg-terminal-cyan opacity-50 animate-pulse"></div>
              )}
            </div>
          </div>

          {/* 进度文本 */}
          {isComplete && !isScanning && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <CheckCircle className="w-4 h-4 text-terminal-green" />
              <span className="text-muted-foreground font-mono">
                {issueCount === 0
                  ? t('overview.scanStatus.noIssues')
                  : t('overview.scanStatus.completed', { count: issueCount })
                }
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
