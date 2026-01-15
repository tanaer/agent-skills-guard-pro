import { useTranslation } from "react-i18next";
import { Info, Github, RefreshCw, ExternalLink, Package } from "lucide-react";
import { useState } from "react";
import { appToast } from "@/lib/toast";
import { useUpdate } from "../contexts/UpdateContext";
import { GroupCard, GroupCardItem } from "./ui/GroupCard";

declare const __APP_VERSION__: string;

export function SettingsPage() {
  const { t } = useTranslation();
  const updateContext = useUpdate();
  const [updateStatus, setUpdateStatus] = useState<"idle" | "downloading" | "installing">("idle");

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

    setUpdateStatus("downloading");
    appToast.info(t("update.downloading"));

    try {
      await updateContext.updateHandle.downloadAndInstall((progress) => {
        if (progress.event === "Started") {
          setUpdateStatus("downloading");
        } else if (progress.event === "Finished") {
          setUpdateStatus("installing");
          appToast.success(t("update.installing"));
        }
      });
    } catch (error) {
      console.error("Install update error:", error);
      appToast.error(t("update.failed"));
      setUpdateStatus("idle");
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      <GroupCard title={t("settings.appInfo.title")}>
        <GroupCardItem>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{t("settings.appInfo.version")}</span>
            </div>
            <span className="text-sm text-primary">{__APP_VERSION__}</span>
          </div>
        </GroupCardItem>

        <GroupCardItem>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{t("settings.appInfo.repository")}</span>
            </div>
            <a
              href="https://github.com/brucevanfdm/agent-skills-guard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <span>agent-skills-guard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </GroupCardItem>

        <GroupCardItem noBorder>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{t("settings.appInfo.updates")}</span>
            </div>
            <div className="flex items-center gap-2">
              {updateContext.hasUpdate && updateContext.updateHandle && updateStatus === "idle" && (
                <button
                  onClick={handleInstallUpdate}
                  disabled={updateContext.isChecking}
                  className="macos-button-primary text-xs"
                >
                  {t("update.downloadAndInstall")}
                </button>
              )}
              {updateStatus === "downloading" && (
                <span className="text-xs text-primary">{t("update.downloading")}</span>
              )}
              {updateStatus === "installing" && (
                <span className="text-xs text-primary">{t("update.installing")}</span>
              )}
              <button
                onClick={handleCheckUpdate}
                disabled={updateContext.isChecking || updateStatus === "downloading" || updateStatus === "installing"}
                className="macos-button-secondary text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${updateContext.isChecking ? "animate-spin" : ""}`} />
                {updateContext.isChecking ? t("update.checking") : t("update.check")}
              </button>
            </div>
          </div>
        </GroupCardItem>
      </GroupCard>

      {updateContext.hasUpdate && updateContext.updateInfo && (
        <GroupCard title={t("update.newVersionAvailable")}>
          <GroupCardItem noBorder>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {updateContext.updateInfo.availableVersion}
                </span>
              </div>
              {updateContext.updateInfo.notes && (
                <div className="text-xs text-muted-foreground max-h-40 overflow-y-auto">
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
