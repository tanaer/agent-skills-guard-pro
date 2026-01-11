import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  checkForUpdate,
  type UpdateInfo,
  type UpdateHandle,
} from "../lib/updater";

interface UpdateContextValue {
  hasUpdate: boolean;
  updateInfo: UpdateInfo | null;
  updateHandle: UpdateHandle | null;
  isChecking: boolean;
  error: string | null;
  isDismissed: boolean;
  dismissUpdate: () => void;
  checkUpdate: () => Promise<boolean>;
  resetDismiss: () => void;
}

const UpdateContext = createContext<UpdateContextValue | undefined>(undefined);

const DISMISSED_KEY_PREFIX = "agent-skills-guard:update:dismissedVersion";

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateHandle, setUpdateHandle] = useState<UpdateHandle | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const isCheckingRef = useRef(false);

  const checkUpdate = useCallback(async (): Promise<boolean> => {
    if (isCheckingRef.current) return false;

    isCheckingRef.current = true;
    setIsChecking(true);
    setError(null);

    try {
      const result = await checkForUpdate({ timeout: 30000 });

      if (result.status === "available") {
        setHasUpdate(true);
        setUpdateInfo(result.info);
        setUpdateHandle(result.update);

        const dismissedVersion = localStorage.getItem(DISMISSED_KEY_PREFIX);
        setIsDismissed(dismissedVersion === result.info.availableVersion);

        return true;
      } else {
        setHasUpdate(false);
        setUpdateInfo(null);
        setUpdateHandle(null);
        setIsDismissed(false);
        return false;
      }
    } catch (err) {
      console.error("[UpdateContext] Check update failed:", err);
      setError(err instanceof Error ? err.message : String(err));
      setHasUpdate(false);
      return false;
    } finally {
      setIsChecking(false);
      isCheckingRef.current = false;
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    if (updateInfo) {
      localStorage.setItem(DISMISSED_KEY_PREFIX, updateInfo.availableVersion);
      setIsDismissed(true);
    }
  }, [updateInfo]);

  const resetDismiss = useCallback(() => {
    localStorage.removeItem(DISMISSED_KEY_PREFIX);
    setIsDismissed(false);
  }, []);

  // 应用启动时自动检查（延迟1秒避免阻塞）
  useEffect(() => {
    const timer = setTimeout(() => {
      checkUpdate().catch(console.error);
    }, 1000);

    return () => clearTimeout(timer);
  }, [checkUpdate]);

  const value: UpdateContextValue = {
    hasUpdate,
    updateInfo,
    updateHandle,
    isChecking,
    error,
    isDismissed,
    dismissUpdate,
    checkUpdate,
    resetDismiss,
  };

  return (
    <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
  );
}

export function useUpdate() {
  const context = useContext(UpdateContext);
  if (context === undefined) {
    throw new Error("useUpdate must be used within UpdateProvider");
  }
  return context;
}
