import { useTranslation } from "react-i18next";
import { Info, Github, RefreshCw, ExternalLink, Package, Languages } from "lucide-react";
import { useEffect } from "react";
import { appToast } from "@/lib/toast";
import { useUpdate } from "../contexts/UpdateContext";
import { GroupCard, GroupCardItem } from "./ui/GroupCard";

declare const __APP_VERSION__: string;

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const updateContext = useUpdate();
  const currentLang = i18n.language;
  const updatePhase = updateContext.updatePhase;
  const isDownloading = updatePhase === "downloading";
  const isInstalling = updatePhase === "installing" || updatePhase === "restarting";
  const isRestartRequired = updatePhase === "restartRequired";
  const isUpdating = isDownloading || isInstalling || isRestartRequired;
  const downloadPercent = updateContext.updateProgress?.percent;

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang).catch((error) => {
      console.error('Failed to change language:', error);
    });
    try {
      localStorage.setItem('language', lang);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }
  };

  const handleCheckUpdate = async () => {
    try {
      const hasNewUpdate = await updateContext.checkUpdate();
      if (hasNewUpdate) {
        updateContext.resetDismiss();
        appToast.success(t("update.newVersionAvailable") + ": " + updateContext.updateInfo?.availableVersion);
      } else {
        appToast.success(t("update.upToDate"));
      }
    } catch (error) {
      console.error("Check update error:", error);
      appToast.error(t("update.checkFailed"));
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateContext.updateHandle) return;

    appToast.info(t("update.downloading"));

    const ok = await updateContext.installUpdate();
    if (!ok) {
      appToast.error(t("update.failed"));
    }
  };

  useEffect(() => {
    if (updatePhase === "installing") {
      appToast.success(t("update.installing"));
    }
    if (updatePhase === "restartRequired") {
      appToast.success(t("update.restartRequired"));
    }
  }, [updatePhase, t]);

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div>
        <h1 className="text-headline text-foreground">{t("nav.settings")}</h1>
      </div>

      {/* 语言设置 */}
      <GroupCard title={t("settings.language.title")}>
        <GroupCardItem noBorder>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                <Languages className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium">{t("settings.language.label")}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLanguageChange('zh')}
                className={`h-8 px-4 text-sm font-medium rounded-lg transition-all ${
                  currentLang === 'zh'
                    ? 'bg-blue-500 text-white'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`h-8 px-4 text-sm font-medium rounded-lg transition-all ${
                  currentLang === 'en'
                    ? 'bg-blue-500 text-white'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </GroupCardItem>
      </GroupCard>

      {/* 应用信息 */}
      <GroupCard title={t("settings.appInfo.title")}>
        <GroupCardItem>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium">{t("settings.appInfo.version")}</span>
            </div>
            <span className="text-sm text-blue-500 font-semibold">{__APP_VERSION__}</span>
          </div>
        </GroupCardItem>

        <GroupCardItem>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
                <Github className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium">{t("settings.appInfo.repository")}</span>
            </div>
            <a
              href="https://github.com/brucevanfdm/agent-skills-guard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 transition-colors"
            >
              <span>agent-skills-guard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </GroupCardItem>

        <GroupCardItem noBorder>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium">{t("settings.appInfo.updates")}</span>
            </div>
            <div className="flex items-center gap-2">
              {updateContext.hasUpdate && updateContext.updateHandle && !isUpdating && (
                <button
                  onClick={handleInstallUpdate}
                  disabled={updateContext.isChecking}
                  className="apple-button-primary h-8 px-3 text-xs"
                >
                  {t("update.downloadAndInstall")}
                </button>
              )}
              {isDownloading && (
                <span className="text-xs text-blue-500 font-medium">
                  {t("update.downloading")}
                  {typeof downloadPercent === "number" && downloadPercent > 0 ? ` ${downloadPercent}%` : ""}
                </span>
              )}
              {isInstalling && (
                <span className="text-xs text-blue-500 font-medium">{t("update.installing")}</span>
              )}
              {isRestartRequired && (
                <span className="text-xs text-blue-500 font-medium">{t("update.restartRequired")}</span>
              )}
              <button
                onClick={handleCheckUpdate}
                disabled={updateContext.isChecking || isUpdating}
                className="apple-button-secondary h-8 px-3 text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${updateContext.isChecking ? "animate-spin" : ""}`} />
                {updateContext.isChecking ? t("update.checking") : t("update.check")}
              </button>
            </div>
          </div>
        </GroupCardItem>
      </GroupCard>

      {updateContext.hasUpdate && updateContext.updateInfo && (
        <GroupCard title={t("update.newVersionAvailable")}>
          <GroupCardItem noBorder>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Info className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-orange-500">
                  {updateContext.updateInfo.availableVersion}
                </span>
              </div>
              {updateContext.updateInfo.notes && (
                <div className="text-sm text-muted-foreground max-h-40 overflow-y-auto p-3 bg-secondary/50 rounded-xl">
                  {updateContext.updateInfo.notes}
                </div>
              )}
            </div>
          </GroupCardItem>
        </GroupCard>
      )}
    </div>
  );
}
