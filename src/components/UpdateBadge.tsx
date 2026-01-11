import { X } from "lucide-react";
import { useUpdate } from "../contexts/UpdateContext";
import { useTranslation } from "react-i18next";

export function UpdateBadge() {
  const { hasUpdate, updateInfo, isDismissed, dismissUpdate } = useUpdate();
  const { t } = useTranslation();

  if (!hasUpdate || isDismissed || !updateInfo) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-terminal-cyan/10 border border-terminal-cyan/30 rounded-md">
      <span className="text-xs font-mono text-terminal-cyan">
        {t("update.available")}: v{updateInfo.availableVersion}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          dismissUpdate();
        }}
        className="text-terminal-cyan/70 hover:text-terminal-cyan transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
