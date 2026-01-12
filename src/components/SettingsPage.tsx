import { useTranslation } from "react-i18next";
import { Settings, Info, Github, RefreshCw, ExternalLink, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useUpdate } from "../contexts/UpdateContext";

declare const __APP_VERSION__: string;

export function SettingsPage() {
  const { t } = useTranslation();
  const updateContext = useUpdate();
  const [updateStatus, setUpdateStatus] = useState<"idle" | "downloading" | "installing">("idle");

  const handleCheckUpdate = async () => {
    try {
      const hasNewUpdate = await updateContext.checkUpdate();
      if (hasNewUpdate) {
        updateContext.resetDismiss(); // 重置已忽略状态，让用户看到更新
        toast.success(t("update.newVersionAvailable") + ": " + updateContext.updateInfo?.availableVersion);
      } else {
        toast.success(t("update.upToDate"));
      }
    } catch (error) {
      console.error("Check update error:", error);
      toast.error(t("update.checkFailed"));
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateContext.updateHandle) return;

    setUpdateStatus("downloading");
    toast.info(t("update.downloading"));

    try {
      await updateContext.updateHandle.downloadAndInstall((progress) => {
        if (progress.event === "Started") {
          setUpdateStatus("downloading");
        } else if (progress.event === "Finished") {
          setUpdateStatus("installing");
          toast.success(t("update.installing"));
        }
      });
    } catch (error) {
      console.error("Install update error:", error);
      toast.error(t("update.failed"));
      setUpdateStatus("idle");
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-terminal-cyan" />
        <h2 className="text-2xl font-bold font-mono text-foreground">
          {t("settings.title")}
        </h2>
      </div>

      {/* Application Information Section */}
      <div className="border border-border rounded-lg p-6 bg-card/30 backdrop-blur-sm space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-terminal-cyan" />
          <h3 className="text-lg font-semibold font-mono text-foreground">
            {t("settings.appInfo.title")}
          </h3>
        </div>

        {/* Version */}
        <div className="flex items-center justify-between py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-sm text-muted-foreground">
              {t("settings.appInfo.version")}
            </span>
          </div>
          <span className="font-mono text-sm text-terminal-cyan">
            {__APP_VERSION__}
          </span>
        </div>

        {/* GitHub Repository */}
        <div className="flex items-center justify-between py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-sm text-muted-foreground">
              {t("settings.appInfo.repository")}
            </span>
          </div>
          <a
            href="https://github.com/brucevanfdm/agent-skills-guard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-mono text-sm text-terminal-cyan hover:text-terminal-cyan/80 transition-colors"
          >
            <span>agent-skills-guard</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Check for Updates */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-sm text-muted-foreground">
              {t("settings.appInfo.updates")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {updateContext.hasUpdate && updateContext.updateHandle && updateStatus === "idle" && (
              <button
                onClick={handleInstallUpdate}
                disabled={updateContext.isChecking}
                className="px-4 py-2 bg-terminal-cyan/10 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan/20 rounded font-mono text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("update.downloadAndInstall")}
              </button>
            )}
            {updateStatus === "downloading" && (
              <span className="px-4 py-2 text-terminal-cyan font-mono text-xs">
                {t("update.downloading")}
              </span>
            )}
            {updateStatus === "installing" && (
              <span className="px-4 py-2 text-terminal-cyan font-mono text-xs">
                {t("update.installing")}
              </span>
            )}
            <button
              onClick={handleCheckUpdate}
              disabled={updateContext.isChecking || updateStatus === "downloading" || updateStatus === "installing"}
              className="px-4 py-2 bg-terminal-cyan/10 border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan/20 rounded font-mono text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw
                className={`w-3 h-3 ${updateContext.isChecking ? "animate-spin" : ""}`}
              />
              {updateContext.isChecking ? t("update.checking") : t("update.check")}
            </button>
          </div>
        </div>

        {/* Update Info */}
        {updateContext.hasUpdate && updateContext.updateInfo && (
          <div className="mt-4 p-4 bg-terminal-cyan/10 border border-terminal-cyan rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-terminal-cyan font-mono text-sm font-semibold">
                {t("update.newVersionAvailable")}: {updateContext.updateInfo.availableVersion}
              </span>
            </div>
            {updateContext.updateInfo.notes && (
              <div className="text-xs text-muted-foreground font-mono mt-2 max-h-40 overflow-y-auto">
                {updateContext.updateInfo.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
