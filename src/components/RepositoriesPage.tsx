import { useEffect, useRef, useState } from "react";
import {
  useRepositories,
  useAddRepository,
  useDeleteRepository,
  useScanRepository,
} from "../hooks/useRepositories";
import {
  Search,
  Plus,
  Trash2,
  GitBranch,
  Loader2,
  Database,
  X,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { FeaturedRepositories } from "./FeaturedRepositories";
import { appToast } from "../lib/toast";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatDate(dateStr: string, t: (key: string, options?: any) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return t("repositories.date.today");
  if (days === 1) return t("repositories.date.yesterday");
  if (days < 7) return t("repositories.date.daysAgo", { days });

  return date.toLocaleDateString();
}

export function RepositoriesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: repositories, isLoading } = useRepositories();
  const addMutation = useAddRepository();
  const deleteMutation = useDeleteRepository();
  const scanMutation = useScanRepository();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [newRepoName, setNewRepoName] = useState("");
  const [scanningRepoId, setScanningRepoId] = useState<string | null>(null);
  const [refreshingRepoId, setRefreshingRepoId] = useState<string | null>(null);
  const [deletingRepoId, setDeletingRepoId] = useState<string | null>(null);
  const addFormRef = useRef<HTMLDivElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  const { data: cacheStats } = useQuery({
    queryKey: ["cache-stats"],
    queryFn: api.getCacheStats,
    refetchInterval: 30000,
  });

  const refreshCacheMutation = useMutation({
    mutationFn: api.refreshRepositoryCache,
    onSuccess: (skills) => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      appToast.success(t("repositories.cache.refreshed", { count: skills.length }));
    },
    onError: (error: any) => {
      appToast.error(t("repositories.cache.refreshFailed", { error: error.message || error }));
    },
  });

  const clearAllCachesMutation = useMutation({
    mutationFn: api.clearAllRepositoryCaches,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      queryClient.invalidateQueries({ queryKey: ["cache-stats"] });
      appToast.success(
        t("repositories.cache.clearedAll", {
          cleared: result.clearedCount,
          failed: result.failedCount,
          size: formatBytes(result.totalSizeFreed),
        })
      );
    },
    onError: (error: any) => {
      appToast.error(t("repositories.cache.clearAllFailed", { error: error.message || error }));
    },
  });

  const extractRepoNameFromUrl = (url: string): string => {
    try {
      const match = url.match(/github\.com[:/]([^/]+)\//);
      if (match && match[1]) {
        return match[1];
      }
      return "";
    } catch {
      return "";
    }
  };

  const handleUrlChange = (url: string) => {
    setNewRepoUrl(url);
    if (!newRepoName) {
      const extracted = extractRepoNameFromUrl(url);
      if (extracted) {
        setNewRepoName(extracted);
      }
    }
  };

  const handleAddRepository = () => {
    if (newRepoUrl && newRepoName) {
      addMutation.mutate(
        { url: newRepoUrl, name: newRepoName },
        {
          onSuccess: (repoId) => {
            setNewRepoUrl("");
            setNewRepoName("");
            setShowAddForm(false);
            appToast.success(t("repositories.toast.added"));

            setScanningRepoId(repoId);
            scanMutation.mutate(repoId, {
              onSuccess: (skills) => {
                setScanningRepoId(null);
                appToast.success(t("repositories.toast.foundSkills", { count: skills.length }));
              },
              onError: (error: any) => {
                setScanningRepoId(null);
                appToast.error(`${t("repositories.toast.scanError")}${error.message || error}`);
              },
            });
          },
          onError: (error: any) => {
            appToast.error(`${t("repositories.toast.error")}${error.message || error}`);
          },
        }
      );
    }
  };

  useEffect(() => {
    if (!showAddForm) return;
    requestAnimationFrame(() => {
      addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      urlInputRef.current?.focus();
    });
  }, [showAddForm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("repositories.title")}
          </h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={showAddForm ? "macos-button-secondary" : "macos-button-primary"}
        >
          {showAddForm ? (
            <>
              <X className="w-4 h-4" />
              {t("repositories.cancel")}
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              {t("repositories.addRepo")}
            </>
          )}
        </button>
      </div>

      {/* Cache Statistics */}
      {cacheStats && (
        <div className="macos-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-sm">
                {t("repositories.cache.stats")}
              </h3>
            </div>

            {cacheStats.cachedRepositories > 0 && (
              <button
                onClick={() => clearAllCachesMutation.mutate()}
                disabled={clearAllCachesMutation.isPending}
                className="macos-button-destructive text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {clearAllCachesMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t("repositories.cache.clearing")}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    {t("repositories.cache.clearAll")}
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">
                {t("repositories.cache.totalRepos")}
              </div>
              <div className="text-2xl font-semibold text-primary">
                {cacheStats.totalRepositories}
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">
                {t("repositories.cache.cached")}
              </div>
              <div className="text-2xl font-semibold text-success">
                {cacheStats.cachedRepositories}
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">
                {t("repositories.cache.size")}
              </div>
              <div className="text-2xl font-semibold text-primary">
                {formatBytes(cacheStats.totalSizeBytes)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featured Repositories */}
      <FeaturedRepositories
        onAdd={(url, name) => {
          setNewRepoUrl(url);
          setNewRepoName(name);
          setShowAddForm(true);
        }}
        isAdding={addMutation.isPending}
      />

      {/* Add Repository Form */}
      {showAddForm && (
        <div ref={addFormRef} className="macos-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-5 h-5 text-primary" />
            <h3 className="font-medium">
              {t("repositories.newRepository")}
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                {t("repositories.githubUrl")}
              </label>
              <input
                type="text"
                value={newRepoUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full h-10 px-3 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                ref={urlInputRef}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("repositories.urlHint")}
              </p>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                {t("repositories.repoName")}
              </label>
              <input
                type="text"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                placeholder="owner"
                className="w-full h-10 px-3 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("repositories.nameHint")}
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleAddRepository}
              className="macos-button-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={!newRepoUrl || !newRepoName || addMutation.isPending}
            >
              {addMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("repositories.adding")}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {t("repositories.confirmAdd")}
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewRepoUrl("");
                setNewRepoName("");
              }}
              className="macos-button-secondary"
              disabled={addMutation.isPending}
            >
              {t("repositories.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Repository List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">
            {t("repositories.loading")}
          </p>
        </div>
      ) : repositories && repositories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {repositories.map((repo) => (
            <div key={repo.id} className="macos-card p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch className="w-4 h-4 text-primary" />
                      <h3 className="font-medium text-foreground">
                        {repo.name}
                      </h3>
                    </div>

                    <div className="text-xs text-muted-foreground mb-2 pl-6">
                      <span className="text-primary">{t("repositories.url")}</span>{" "}
                      <span className="break-all">{repo.url}</span>
                    </div>

                    {repo.description && (
                      <p className="text-sm text-muted-foreground pl-6">{repo.description}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        if (repo.cache_path) {
                          setRefreshingRepoId(repo.id);
                          refreshCacheMutation.mutate(repo.id, {
                            onSuccess: (skills) => {
                              setRefreshingRepoId(null);
                              appToast.success(
                                t("repositories.toast.foundSkills", { count: skills.length })
                              );
                            },
                            onError: (error: any) => {
                              setRefreshingRepoId(null);
                              appToast.error(
                                `${t("repositories.toast.scanError")}${error.message || error}`
                              );
                            },
                          });
                        } else {
                          setScanningRepoId(repo.id);
                          scanMutation.mutate(repo.id, {
                            onSuccess: (skills) => {
                              setScanningRepoId(null);
                              appToast.success(
                                t("repositories.toast.foundSkills", { count: skills.length })
                              );
                            },
                            onError: (error: any) => {
                              setScanningRepoId(null);
                              appToast.error(
                                `${t("repositories.toast.scanError")}${error.message || error}`
                              );
                            },
                          });
                        }
                      }}
                      disabled={
                        scanMutation.isPending ||
                        refreshCacheMutation.isPending ||
                        deleteMutation.isPending
                      }
                      className="macos-button-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {(scanningRepoId === repo.id && scanMutation.isPending) ||
                      (refreshingRepoId === repo.id && refreshCacheMutation.isPending) ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="hidden sm:inline">
                            {repo.cache_path
                              ? t("repositories.rescanning")
                              : t("repositories.scanning")}
                          </span>
                        </>
                      ) : (
                        <>
                          {repo.cache_path ? (
                            <RefreshCw className="w-3.5 h-3.5" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">
                            {repo.cache_path ? t("repositories.rescan") : t("repositories.scan")}
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setDeletingRepoId(repo.id);
                        deleteMutation.mutate(repo.id, {
                          onSuccess: () => setDeletingRepoId(null),
                          onError: () => setDeletingRepoId(null),
                        });
                      }}
                      disabled={
                        scanMutation.isPending ||
                        refreshCacheMutation.isPending ||
                        deleteMutation.isPending
                      }
                      className="macos-button-destructive text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {deletingRepoId === repo.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 pl-6 text-xs">
                  {repo.last_scanned && (
                    <div className="text-muted-foreground">
                      <span className="text-primary">{t("repositories.lastScan")}</span>{" "}
                      {new Date(repo.last_scanned).toLocaleString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}

                  <div>
                    {repo.cache_path ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-success/10 text-success">
                        {t("repositories.cache.statusCached")}
                        {repo.cached_at && ` · ${formatDate(repo.cached_at, t)}`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                        {t("repositories.cache.statusUncached")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="macos-card p-12 text-center">
          <Database className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            {t("repositories.noReposFound")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("repositories.clickAddRepo")}
          </p>
        </div>
      )}
    </div>
  );
}
