import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateChannel = "stable" | "beta";

export type UpdaterPhase =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "installing"
  | "restarting"
  | "upToDate"
  | "error";

export interface UpdateInfo {
  currentVersion: string;
  availableVersion: string;
  notes?: string;
  pubDate?: string;
}

export interface UpdateProgressEvent {
  event: "Started" | "Progress" | "Finished";
  total?: number;
  downloaded?: number;
}

export interface UpdateHandle {
  version: string;
  notes?: string;
  date?: string;
  downloadAndInstall(onProgress?: (e: UpdateProgressEvent) => void): Promise<void>;
}

export interface CheckOptions {
  timeout?: number;
}

export async function getCurrentVersion(): Promise<string> {
  const { getVersion } = await import("@tauri-apps/api/app");
  return await getVersion();
}

export async function checkForUpdate(
  opts: CheckOptions = {}
): Promise<
  | { status: "up-to-date" }
  | { status: "available"; info: UpdateInfo; update: UpdateHandle }
> {
  const currentVersion = await getCurrentVersion();
  const update = await check();

  if (!update?.available) {
    return { status: "up-to-date" };
  }

  const info: UpdateInfo = {
    currentVersion,
    availableVersion: update.version,
    notes: update.body,
    pubDate: update.date,
  };

  const updateHandle: UpdateHandle = {
    version: update.version,
    notes: update.body,
    date: update.date,
    async downloadAndInstall(onProgress) {
      await update.downloadAndInstall((event) => {
        if (!onProgress) return;

        const mapped: UpdateProgressEvent = {
          event: event.event,
        };

        if (event.event === "Started") {
          mapped.total = event.data.contentLength ?? 0;
          mapped.downloaded = 0;
        } else if (event.event === "Progress") {
          mapped.downloaded = event.data.chunkLength ?? 0;
        }

        onProgress(mapped);
      });
    },
  };

  return { status: "available", info, update: updateHandle };
}

export async function relaunchApp(): Promise<void> {
  await relaunch();
}
