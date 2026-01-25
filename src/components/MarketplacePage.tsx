import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSkills,
  useInstallSkill,
  useUninstallSkill,
  useUninstallSkillPath,
  useDeleteSkill,
} from "../hooks/useSkills";
import { useSkillTranslation, TranslatedSkill } from "../hooks/useTranslatedSkills";
import { Skill } from "../types";
import { SecurityReport } from "../types/security";
import {
  Trash2,
  Download,
  Loader2,
  Search,
  SearchX,
  FolderOpen,
  Languages,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { openPath } from "@tauri-apps/plugin-opener";
import { formatRepositoryTag } from "../lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { CyberSelect, type CyberSelectOption } from "./ui/CyberSelect";
import { appToast } from "@/lib/toast";
import { InstallConfirmDialog } from "./InstallConfirmDialog";
import { addRecentInstallPath } from "@/lib/storage";

interface MarketplacePageProps {
  onNavigateToRepositories?: () => void;
}

export function MarketplacePage({ onNavigateToRepositories }: MarketplacePageProps = {}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { data: allSkills, isLoading } = useSkills();
  const installMutation = useInstallSkill();
  const uninstallMutation = useUninstallSkill();
  const uninstallPathMutation = useUninstallSkillPath();
  const deleteMutation = useDeleteSkill();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepository, setSelectedRepository] = useState("all");
  const [sortOption, setSortOption] = useState("default");
  const [hideInstalled, setHideInstalled] = useState(false);
  const [pendingInstall, setPendingInstall] = useState<{
    skill: Skill;
    report: SecurityReport;
  } | null>(null);
  const [preparingSkillId, setPreparingSkillId] = useState<string | null>(null);
  const [deletingSkillId, setDeletingSkillId] = useState<string | null>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  const sortOptions: CyberSelectOption[] = [
    { value: "default", label: t("skills.marketplace.sort.default") || "Default (A-Z)" },
    { value: "latest", label: t("skills.marketplace.sort.latest") || "Latest Updated" },
  ];

  const repositorySkills = useMemo(() => {
    if (!allSkills) return [];
    return allSkills.filter((skill) => skill.repository_owner !== "local");
  }, [allSkills]);

  const repositories = useMemo(() => {
    if (!repositorySkills) return [];
    const ownerMap = new Map<string, number>();

    repositorySkills.forEach((skill) => {
      const owner = skill.repository_owner || "unknown";
      ownerMap.set(owner, (ownerMap.get(owner) || 0) + 1);
    });

    const repos = Array.from(ownerMap.entries())
      .map(([owner, count]) => ({
        owner,
        count,
        displayName: `@${owner}`,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return [
      {
        owner: "all",
        count: repositorySkills.length,
        displayName: t("skills.marketplace.allRepos"),
      },
      ...repos,
    ];
  }, [repositorySkills, i18n.language, t]);

  const repositoryOptions: CyberSelectOption[] = useMemo(() => {
    return repositories.map((repo) => ({
      value: repo.owner,
      label: `${repo.displayName} (${repo.count})`,
    }));
  }, [repositories]);

  const filteredSkills = useMemo(() => {
    if (!repositorySkills) return [];

    const query = searchQuery.toLowerCase();

    let filtered = repositorySkills.filter((skill) => {
      const matchesRepo =
        selectedRepository === "all" || skill.repository_owner === selectedRepository;
      const matchesInstalled = !hideInstalled || !skill.installed;
      const matchesSearch =
        !searchQuery ||
        skill.name.toLowerCase().includes(query) ||
        skill.description?.toLowerCase().includes(query);

      return matchesSearch && matchesRepo && matchesInstalled;
    });

    if (searchQuery) {
      const nameMatches: Skill[] = [];
      const descriptionMatches: Skill[] = [];

      filtered.forEach((skill) => {
        const nameMatch = skill.name.toLowerCase().includes(query);
        if (nameMatch) {
          nameMatches.push(skill);
        } else {
          descriptionMatches.push(skill);
        }
      });

      filtered = [...nameMatches, ...descriptionMatches];
    } else {
      // Apply sorting only when not searching (or apply on top?)
      // User request implies sorting capability generally.
      // Search usually implies relevance sort, but valid to sort results too.
      // Let's sort the 'filtered' list.

      filtered.sort((a, b) => {
        if (sortOption === "latest") {
          const timeA = a.scanned_at ? new Date(a.scanned_at).getTime() : 0;
          const timeB = b.scanned_at ? new Date(b.scanned_at).getTime() : 0;
          return timeB - timeA;
        }
        // Default: A-Z
        return a.name.localeCompare(b.name);
      });
    }

    return filtered;
  }, [repositorySkills, searchQuery, selectedRepository, hideInstalled, sortOption]);

  // Manual translation hook with toggle support
  const { translateSkill, toggleTranslation, getTranslatedSkill, translatingSkillIds } = useSkillTranslation();

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex-shrink-0 border-b border-border/50"
        onWheel={(e) => {
          if (!listContainerRef.current) return;
          listContainerRef.current.scrollBy({ top: e.deltaY });
          e.preventDefault();
        }}
      >
        <div className="px-8 pt-8 pb-4" style={{ animation: "fadeIn 0.4s ease-out" }}>
          <div className="max-w-6xl mx-auto">
            <div
              className={`overflow-hidden transition-all duration-200 ${isHeaderCollapsed ? "max-h-0 opacity-0" : "max-h-24 opacity-100"
                }`}
            >
              <h1 className="text-headline text-foreground mb-4">{t("nav.marketplace")}</h1>
            </div>

            <div className="flex gap-3 items-center flex-wrap">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("skills.marketplace.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="apple-input w-full h-10 pl-10 pr-4"
                />
              </div>

              <CyberSelect
                value={sortOption}
                onChange={setSortOption}
                options={sortOptions}
                className="min-w-[160px]"
              />

              <CyberSelect
                value={selectedRepository}
                onChange={setSelectedRepository}
                options={repositoryOptions}
                className="min-w-[200px]"
              />

              <label className="flex items-center gap-2 h-10 px-4 apple-card text-sm cursor-pointer hover:bg-secondary/50 transition-colors">
                <input
                  type="checkbox"
                  checked={hideInstalled}
                  onChange={(e) => setHideInstalled(e.target.checked)}
                  className="rounded border-border accent-blue-500"
                />
                <span>{t("skills.marketplace.hideInstalled")}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={listContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain px-8 pb-8"
        onScroll={(e) => {
          const top = (e.currentTarget as HTMLDivElement).scrollTop;
          setIsHeaderCollapsed(top > 8);
        }}
      >
        <div className={`max-w-6xl mx-auto ${isHeaderCollapsed ? "pt-4" : "pt-6"}`}>
          {/* Skills Grid */}
          {isLoading ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3 py-4">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">{t("skills.loading")}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="apple-card p-5 flex flex-col animate-in fade-in-50 duration-500">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <div className="animate-pulse bg-muted/60 rounded h-5 w-28" />
                          <div className="animate-pulse bg-muted/60 rounded-full h-5 w-14" />
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <div className="animate-pulse bg-muted/60 rounded-lg h-8 w-16" />
                      </div>
                    </div>
                    <div className="space-y-2 mb-3 h-[6.25rem]">
                      <div className="animate-pulse bg-muted/60 rounded h-4 w-full" />
                      <div className="animate-pulse bg-muted/60 rounded h-4 w-full" />
                      <div className="animate-pulse bg-muted/60 rounded h-4 w-3/4" />
                    </div>
                    <div className="mb-3">
                      <div className="animate-pulse bg-muted/60 rounded h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredSkills && filteredSkills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {filteredSkills.map((skill) => {
                const translatedSkill = getTranslatedSkill(skill);
                return (
                  <SkillCard
                    key={skill.id}
                    skill={translatedSkill}
                    onTranslate={() => translateSkill(skill.id, skill)}
                    onToggleTranslation={() => toggleTranslation(skill.id, skill)}
                    isTranslatingSkill={translatingSkillIds.has(skill.id)}
                    onInstall={async () => {
                      try {
                        setPreparingSkillId(skill.id);
                        const report = await invoke<SecurityReport>("prepare_skill_installation", {
                          skillId: skill.id,
                          locale: i18n.language,
                        });
                        setPreparingSkillId(null);
                        setPendingInstall({ skill, report });
                      } catch (error: any) {
                        setPreparingSkillId(null);
                        appToast.error(
                          `${t("skills.toast.installFailed")}: ${error.message || error}`
                        );
                      }
                    }}
                    onUninstall={() => {
                      uninstallMutation.mutate(skill.id, {
                        onSuccess: () => appToast.success(t("skills.toast.uninstalled")),
                        onError: (error: any) =>
                          appToast.error(
                            `${t("skills.toast.uninstallFailed")}: ${error.message || error}`
                          ),
                      });
                    }}
                    onUninstallPath={(path: string) => {
                      uninstallPathMutation.mutate(
                        { skillId: skill.id, path },
                        {
                          onSuccess: () => appToast.success(t("skills.toast.uninstalled")),
                          onError: (error: any) =>
                            appToast.error(
                              `${t("skills.toast.uninstallFailed")}: ${error.message || error}`
                            ),
                        }
                      );
                    }}
                    onDelete={() => {
                      setDeletingSkillId(skill.id);
                      deleteMutation.mutate(skill.id, {
                        onSuccess: () => {
                          setDeletingSkillId(null);
                          appToast.success(t("skills.toast.deleted"));
                        },
                        onError: (error: any) => {
                          setDeletingSkillId(null);
                          appToast.error(
                            `${t("skills.toast.deleteFailed")}: ${error.message || error}`
                          );
                        },
                      });
                    }}
                    isInstalling={
                      installMutation.isPending && installMutation.variables?.skillId === skill.id
                    }
                    isUninstalling={
                      uninstallMutation.isPending && uninstallMutation.variables === skill.id
                    }
                    isDeleting={deletingSkillId === skill.id}
                    isPreparing={preparingSkillId === skill.id}
                    isAnyOperationPending={
                      installMutation.isPending ||
                      uninstallMutation.isPending ||
                      preparingSkillId !== null ||
                      deletingSkillId !== null
                    }
                    t={t}
                  />
                )
              })}
            </div>
          ) : (
            <div className="apple-card p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-5 mx-auto">
                <SearchX className="w-10 h-10 text-muted-foreground" />
              </div>
              {searchQuery ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("skills.marketplace.noResults", { query: searchQuery })}
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedRepository("all");
                      setHideInstalled(false);
                    }}
                    className="apple-button-secondary"
                  >
                    {t("skills.marketplace.clearFilters")}
                  </button>
                </>
              ) : repositorySkills.length === 0 ? (
                <div className="max-w-md mx-auto">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("skills.marketplace.noSkillsYet")}
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    {t("skills.marketplace.scanningRepositories")}
                  </p>
                  <button
                    onClick={() => onNavigateToRepositories?.()}
                    disabled={!onNavigateToRepositories}
                    className="apple-button-primary disabled:opacity-50"
                  >
                    {t("skills.marketplace.goToRepositories")}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("skills.marketplace.noSkillsInFilter")}
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedRepository("all");
                      setHideInstalled(false);
                    }}
                    className="apple-button-secondary"
                  >
                    {t("skills.marketplace.clearFilters")}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Install Confirmation Dialog */}
      <InstallConfirmDialog
        open={pendingInstall !== null}
        onClose={async () => {
          if (pendingInstall) {
            try {
              await invoke("cancel_skill_installation", { skillId: pendingInstall.skill.id });
            } catch (error: any) {
              console.error("[ERROR] 取消安装失败:", error);
            }
          }
          setPendingInstall(null);
        }}
        onConfirm={async (selectedPaths) => {
          if (pendingInstall && selectedPaths.length > 0) {
            try {
              // 循环安装到每个选中的路径
              for (const path of selectedPaths) {
                await invoke("confirm_skill_installation", {
                  skillId: pendingInstall.skill.id,
                  installPath: path,
                });
                addRecentInstallPath(path);
              }
              await queryClient.refetchQueries({ queryKey: ["skills"] });
              await queryClient.refetchQueries({ queryKey: ["skills", "installed"] });
              await queryClient.refetchQueries({ queryKey: ["scanResults"] });
              appToast.success(t("skills.toast.installedToMultiple", { count: selectedPaths.length }));
            } catch (error: any) {
              appToast.error(`${t("skills.toast.installFailed")}: ${error.message || error}`);
            }
          }
          setPendingInstall(null);
        }}
        report={pendingInstall?.report || null}
        skillName={pendingInstall?.skill.name || ""}
      />
    </div>
  );
}

interface SkillCardProps {
  skill: TranslatedSkill;
  onInstall: () => void;
  onUninstall: () => void;
  onUninstallPath: (path: string) => void;
  onDelete: () => void;
  onTranslate: () => void;
  onToggleTranslation: () => void;
  isInstalling: boolean;
  isUninstalling: boolean;
  isDeleting: boolean;
  isPreparing: boolean;
  isAnyOperationPending: boolean;
  isTranslatingSkill: boolean;
  t: (key: string, options?: any) => string;
}

function SkillCard({
  skill,
  onInstall,
  onUninstall,
  onUninstallPath,
  onTranslate,
  onToggleTranslation,
  isInstalling,
  isUninstalling,
  isPreparing,
  isAnyOperationPending,
  isTranslatingSkill,
  t,
}: SkillCardProps) {
  const descriptionRef = useRef<HTMLParagraphElement | null>(null);
  const [isDescriptionTruncated, setIsDescriptionTruncated] = useState(false);

  useLayoutEffect(() => {
    const element = descriptionRef.current;
    if (!element) return;

    const update = () => {
      setIsDescriptionTruncated(
        element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [skill.description]);

  // Use translated content if showing translation, otherwise original
  const showTranslated = skill.isTranslated && skill.showingTranslation;
  const displayDescription = showTranslated ? (skill.translatedDescription || skill.description) : skill.description;

  return (
    <div className="apple-card p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-medium text-foreground">{skill.name}</h3>
            {/* Translate/Toggle Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (skill.isTranslated) {
                  // Toggle between original and translated
                  onToggleTranslation();
                } else if (!isTranslatingSkill) {
                  // Start translation
                  onTranslate();
                }
              }}
              disabled={isTranslatingSkill}
              className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer ${skill.isTranslated
                ? skill.showingTranslation
                  ? "bg-purple-500/20 text-purple-600 hover:bg-purple-500/30"
                  : "bg-secondary text-muted-foreground hover:bg-purple-500/10 hover:text-purple-600"
                : isTranslatingSkill
                  ? "bg-purple-500/10 text-purple-400"
                  : "bg-secondary hover:bg-purple-500/10 text-muted-foreground hover:text-purple-600"
                }`}
              title={skill.isTranslated
                ? (skill.showingTranslation ? t("skills.translation.showOriginal") : t("skills.translation.showTranslated"))
                : t("skills.translation.translate")}
            >
              {isTranslatingSkill ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Languages className="w-3 h-3" />
              )}
            </button>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${skill.repository_owner === "local"
                ? "bg-muted text-muted-foreground"
                : "bg-blue-500/10 text-blue-600"
                }`}
            >
              {formatRepositoryTag(skill)}
            </span>
            {skill.installed && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                {t("skills.installed")}
              </span>
            )}
            {isInstalling && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                {t("skills.installing")}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onInstall}
            disabled={isAnyOperationPending}
            className="apple-button-primary h-8 px-3 text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {isPreparing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">{t("skills.scanning")}</span>
              </>
            ) : isInstalling ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">{t("skills.installing")}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {skill.installed ? t("skills.installToOther") : t("skills.install")}
                </span>
              </>
            )}
          </button>

          {skill.installed && (
            <button
              onClick={onUninstall}
              disabled={isAnyOperationPending}
              className="apple-button-destructive h-8 px-3 text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isUninstalling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">{t("skills.uninstalling")}</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t("skills.uninstallAll")}</span>
                </>
              )}
            </button>
          )}
          {/* 删除按钮暂时隐藏，功能未开放 */}
          {/* {!skill.installed && (
            <button
              onClick={onDelete}
              disabled={isAnyOperationPending}
              className="apple-button-destructive h-8 px-3 text-xs flex items-center gap-1.5 disabled:opacity-50"
              title={t('skills.deleteRecord')}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">{t('skills.deleting')}</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('skills.delete')}</span>
                </>
              )}
            </button>
          )} */}
        </div>
      </div>

      {/* Description - 自动填充剩余空间 */}
      <p
        ref={descriptionRef}
        title={isDescriptionTruncated && displayDescription ? (skill.isTranslated ? skill.description : displayDescription) : undefined}
        className="text-sm text-muted-foreground mb-3 leading-5 h-[6.25rem] overflow-hidden [display:-webkit-box] [-webkit-line-clamp:5] [-webkit-box-orient:vertical]"
      >
        {displayDescription || t("skills.noDescription")}
      </p>

      {/* Repository - 固定在底部 */}
      <div className="text-xs text-muted-foreground mb-3">
        <span className="text-blue-500 font-medium">{t("skills.repo")}</span>{" "}
        {skill.repository_url === "local" ? (
          <span>{skill.repository_url}</span>
        ) : (
          <a
            href={skill.repository_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 hover:underline break-all transition-colors"
          >
            {skill.repository_url}
          </a>
        )}
      </div>

      {/* Installed Paths */}
      {skill.local_paths && skill.local_paths.length > 0 && (
        <div className="pt-3 border-t border-border/60">
          <div className="text-xs text-muted-foreground mb-2">
            <span className="text-blue-500 font-medium">{t("skills.installedPaths")}</span> (
            {skill.local_paths.length})
          </div>
          <div className="space-y-1.5">
            {skill.local_paths.map((path, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-2.5 bg-secondary/50 rounded-xl text-xs"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    onClick={async () => {
                      try {
                        try {
                          await invoke("open_skill_directory", { localPath: path });
                        } catch {
                          await openPath(path);
                        }
                        appToast.success(t("skills.folder.opened"), { duration: 5000 });
                      } catch (error: any) {
                        appToast.error(
                          t("skills.folder.openFailed", { error: error?.message || String(error) }),
                          { duration: 5000 }
                        );
                      }
                    }}
                    className="text-blue-500 hover:text-blue-600 transition-colors"
                    title={t("skills.openFolder")}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-muted-foreground truncate" title={path}>
                    {path}
                  </span>
                </div>
                <button
                  onClick={() => onUninstallPath(path)}
                  disabled={isAnyOperationPending}
                  className="text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                  title={t("skills.uninstallPath")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


