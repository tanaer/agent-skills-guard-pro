import { useTranslation } from "react-i18next";
import { Loader2, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";

interface ScanStatusCardProps {
  lastScanTime: Date | null;
  scannedCount: number;
  totalCount: number;
  issueCount: number;
  isScanning: boolean;
  onScan: () => void;
}

export function ScanStatusCard({
  lastScanTime,
  scannedCount,
  totalCount,
  issueCount,
  isScanning,
  onScan
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
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center">
        {/* 左侧：扫描信息 */}
        <div className="flex-shrink-0 min-w-[200px]">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{t('overview.scanStatus.lastScan')}：</span>
            {lastScanTime ? (
              <span className="text-foreground">{formatRelativeTime(lastScanTime)}</span>
            ) : (
              <span className="text-yellow-600 dark:text-yellow-400">{t('overview.scanStatus.never')}</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
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

        {/* 中间：进度条 */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`
                h-full transition-all duration-300 rounded-full
                ${isScanning
                  ? 'bg-terminal-cyan animate-pulse'
                  : isComplete && issueCount === 0
                  ? 'bg-green-500'
                  : isComplete && issueCount > 0
                  ? 'bg-yellow-500'
                  : 'bg-terminal-cyan'
                }
              `}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* 进度文本 */}
          {isComplete && !isScanning && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-muted-foreground">
                {issueCount === 0
                  ? t('overview.scanStatus.noIssues')
                  : t('overview.scanStatus.completed', { count: issueCount })
                }
              </span>
            </div>
          )}
        </div>

        {/* 右侧：扫描按钮 */}
        <div className="flex-shrink-0">
          <button
            onClick={onScan}
            disabled={isScanning}
            className="
              px-6 py-2
              bg-terminal-cyan text-background
              font-mono font-medium text-sm
              rounded
              hover:bg-terminal-cyan/90
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              flex items-center gap-2
              shadow-md hover:shadow-lg
            "
          >
            {isScanning && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {isScanning
                ? t('overview.scanStatus.scanning')
                : t('overview.scanStatus.scanAll')
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
