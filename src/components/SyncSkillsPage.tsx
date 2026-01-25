import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { appToast } from "../lib/toast";
import {
    RefreshCw,
    ArrowRightLeft,
    CheckCircle,
    Loader2,
    Box,
    Layers,
    ArrowRight
} from "lucide-react";
import { api } from "../lib/api";

interface ToolPath {
    tool_id: string;
    tool_name: string;
    skills_path: string;
    is_default: boolean;
}

export function SyncSkillsPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [sourceToolId, setSourceToolId] = useState<string | null>(null);
    const [targetToolIds, setTargetToolIds] = useState<Set<string>>(new Set());
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{
        success: number;
        failed: number;
        details: string[];
    } | null>(null);

    // Fetch installed tools/paths
    const { data: toolPaths = [], isLoading: isToolsLoading } = useQuery({
        queryKey: ["tool_paths"],
        queryFn: async () => await invoke<ToolPath[]>("get_installed_tool_paths"),
    });

    // Fetch installed skills to know what to sync
    const { data: installedSkills = [], isLoading: isSkillsLoading } = useQuery({
        queryKey: ["skills", "installed"],
        queryFn: async () => await api.getInstalledSkills(),
    });

    const handleToggleTarget = (toolId: string) => {
        const newSet = new Set(targetToolIds);
        if (newSet.has(toolId)) {
            newSet.delete(toolId);
        } else {
            newSet.add(toolId);
        }
        setTargetToolIds(newSet);
    };

    const handleSync = async () => {
        if (!sourceToolId || targetToolIds.size === 0) return;

        setIsSyncing(true);
        setSyncResult(null);
        const details: string[] = [];
        let successCount = 0;
        let failedCount = 0;

        try {
            // 1. Identify skills installed in source tool
            // We look at `local_paths` of all skills.
            const sourceTool = toolPaths.find(t => t.tool_id === sourceToolId);
            if (!sourceTool) throw new Error("Source tool not found");

            const sourcePath = sourceTool.skills_path;

            const skillsToSync = installedSkills.filter(skill => {
                // Check if skill is installed in the source path
                // Normalize paths for comparison if needed, but simple includes might work for now
                // given `local_paths` usually contains absolute paths.
                return skill.local_paths?.some(p => p.includes(sourcePath) || p === sourcePath);
            });

            if (skillsToSync.length === 0) {
                appToast.info(t("skills.sync.noSkillsFound"));
                setIsSyncing(false);
                return;
            }

            // 2. Install each skill to target tools
            const targetPaths = toolPaths
                .filter(t => targetToolIds.has(t.tool_id))
                .map(t => t.skills_path);

            for (const skill of skillsToSync) {
                for (const targetPath of targetPaths) {
                    // Skip if already in target path
                    if (skill.local_paths?.some(p => p === targetPath)) {
                        continue;
                    }

                    try {
                        await invoke("sync_skill", {
                            skillId: skill.id,
                            installPath: targetPath,
                        });
                        successCount++;
                    } catch (error: any) {
                        failedCount++;
                        details.push(`${skill.name} -> ${targetPath}: ${error.message || error}`);
                    }
                }
            }

            setSyncResult({
                success: successCount,
                failed: failedCount,
                details
            });

            if (successCount > 0) {
                await queryClient.invalidateQueries({ queryKey: ["skills"] });
                appToast.success(t("skills.sync.success", { count: successCount }));
            }
            if (failedCount > 0) {
                appToast.error(t("skills.sync.failed", { count: failedCount }));
            }

        } catch (error: any) {
            appToast.error(`Sync failed: ${error.message || error}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const getToolIcon = (id: string) => {
        // Simple mapping or reuse from InstallPathSelector
        const iconMap: Record<string, string> = {
            claude: "🤖", cursor: "🖱️", codex: "🧠", "github-copilot": "🐙",
            windsurf: "🏄", gemini: "✨", kiro: "☁️", vscode: "💻",
            cline: "📝", roo: "🦘", aider: "🔧", augment: "➕",
            continue: "▶️", opencode: "📂", kilocode: "📊", zencoder: "🧘", zed: "⚡",
        };
        return iconMap[id] || "🛠️";
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="px-8 pt-8 pb-4 border-b border-border/50">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                        <ArrowRightLeft className="w-8 h-8 text-primary" />
                        {t("skills.sync.title") || "Skill Synchronization"}
                    </h1>
                    <p className="text-muted-foreground">
                        {t("skills.sync.description") || "Synchronize your installed skills across different AI tools."}
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-8 items-start">

                    {/* Source Column */}
                    <div className="apple-card p-6 space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Box className="w-5 h-5 text-blue-500" />
                            {t("skills.sync.source") || "Source Tool"}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {t("skills.sync.selectSource") || "Select where to copy skills from."}
                        </p>

                        <div className="space-y-2">
                            {toolPaths.map(tool => (
                                <label
                                    key={`source-${tool.tool_id}`}
                                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${sourceToolId === tool.tool_id
                                        ? "border-blue-500 bg-blue-50/10 ring-1 ring-blue-500"
                                        : "border-border hover:bg-secondary/50"
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="sourceTool"
                                        value={tool.tool_id}
                                        checked={sourceToolId === tool.tool_id}
                                        onChange={() => {
                                            setSourceToolId(tool.tool_id);
                                            // Remove from target if selected
                                            if (targetToolIds.has(tool.tool_id)) {
                                                const newSet = new Set(targetToolIds);
                                                newSet.delete(tool.tool_id);
                                                setTargetToolIds(newSet);
                                            }
                                        }}
                                        className="sr-only"
                                    />
                                    <div className="flex items-center gap-3 w-full">
                                        <span className="text-xl">{getToolIcon(tool.tool_id)}</span>
                                        <div className="flex-1">
                                            <div className="font-medium">{tool.tool_name}</div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={tool.skills_path}>
                                                {tool.skills_path}
                                            </div>
                                        </div>
                                        {sourceToolId === tool.tool_id && <CheckCircle className="w-4 h-4 text-blue-500" />}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Middle Action Area */}
                    <div className="flex flex-col items-center justify-center pt-20 gap-4">
                        <ArrowRight className="w-8 h-8 text-muted-foreground hidden md:block" />
                        <button
                            onClick={handleSync}
                            disabled={!sourceToolId || targetToolIds.size === 0 || isSyncing}
                            className="apple-button-primary px-6 py-4 rounded-full flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:shadow-none transition-all hover:scale-105 active:scale-95"
                        >
                            {isSyncing ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-5 h-5" />
                            )}
                            <span className="text-lg font-medium">{t("skills.sync.button") || "Sync"}</span>
                        </button>
                    </div>

                    {/* Target Column */}
                    <div className="apple-card p-6 space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Layers className="w-5 h-5 text-purple-500" />
                            {t("skills.sync.target") || "Target Tools"}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {t("skills.sync.selectTarget") || "Select where to copy skills to."}
                        </p>

                        <div className="space-y-2">
                            {toolPaths.map(tool => {
                                const isSource = sourceToolId === tool.tool_id;
                                return (
                                    <label
                                        key={`target-${tool.tool_id}`}
                                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${targetToolIds.has(tool.tool_id)
                                            ? "border-purple-500 bg-purple-50/10 ring-1 ring-purple-500"
                                            : isSource ? "opacity-50 cursor-not-allowed border-dashed" : "border-border hover:bg-secondary/50"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={targetToolIds.has(tool.tool_id)}
                                            disabled={isSource}
                                            onChange={() => handleToggleTarget(tool.tool_id)}
                                            className="sr-only"
                                        />
                                        <div className="flex items-center gap-3 w-full">
                                            <span className="text-xl">{getToolIcon(tool.tool_id)}</span>
                                            <div className="flex-1">
                                                <div className="font-medium">{tool.tool_name}</div>
                                                <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={tool.skills_path}>
                                                    {tool.skills_path}
                                                </div>
                                            </div>
                                            {targetToolIds.has(tool.tool_id) && <CheckCircle className="w-4 h-4 text-purple-500" />}
                                        </div>
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                </div>

                {syncResult && (
                    <div className="max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className={`p-4 rounded-lg border ${syncResult.failed === 0 ? "bg-green-500/10 border-green-500/30" : "bg-orange-500/10 border-orange-500/30"}`}>
                            <h3 className="font-medium mb-2">{t("skills.sync.syncCompleted") || "Sync Completed"}</h3>
                            <p className="text-sm">
                                {t("skills.sync.results.success", { count: syncResult.success })}
                                {syncResult.failed > 0 && (
                                    <span className="text-destructive ml-2">
                                        {t("skills.sync.results.failed", { count: syncResult.failed })}
                                    </span>
                                )}
                            </p>
                            {syncResult.details.length > 0 && (
                                <div className="mt-4 p-2 bg-background/50 rounded text-xs font-mono max-h-40 overflow-y-auto">
                                    {syncResult.details.map((line, i) => (
                                        <div key={i} className="text-destructive">{line}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
