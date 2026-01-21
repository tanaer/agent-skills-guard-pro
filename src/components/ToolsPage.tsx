import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import {
    Loader2,
    FolderOpen,
    Eye,
    CheckCircle2,
    XCircle,
    Wrench,
} from "lucide-react";
import { SkillViewerModal } from "./SkillViewerModal";
import { appToast } from "../lib/toast";

interface AiTool {
    id: string;
    name: string;
    base_path: string;
    skills_subdir: string;
    is_installed: boolean;
    icon: string | null;
}

export function ToolsPage() {
    const { t } = useTranslation();
    const [tools, setTools] = useState<AiTool[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTool, setSelectedTool] = useState<AiTool | null>(null);
    const [openingFolder, setOpeningFolder] = useState<string | null>(null);

    useEffect(() => {
        loadTools();
    }, []);

    const loadTools = async () => {
        try {
            setIsLoading(true);
            const result = await invoke<AiTool[]>("get_supported_tools");
            setTools(result);
        } catch (error: any) {
            appToast.error(t("tools.loadFailed", { error: error.message || error }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenFolder = async (tool: AiTool) => {
        try {
            setOpeningFolder(tool.id);
            await invoke("open_tool_folder", { toolId: tool.id });
            appToast.success(t("tools.folderOpened"));
        } catch (error: any) {
            appToast.error(t("tools.openFolderFailed", { error: error.message || error }));
        } finally {
            setOpeningFolder(null);
        }
    };

    const installedTools = tools.filter((t) => t.is_installed);
    const notFoundTools = tools.filter((t) => !t.is_installed);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">{t("tools.loading")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-headline text-foreground mb-2">{t("tools.title")}</h1>
                <p className="text-muted-foreground">{t("tools.description")}</p>
            </div>

            {/* 已安装的工具 */}
            <section>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    {t("tools.installed")} ({installedTools.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {installedTools.map((tool) => (
                        <ToolCard
                            key={tool.id}
                            tool={tool}
                            onViewSkills={() => setSelectedTool(tool)}
                            onOpenFolder={() => handleOpenFolder(tool)}
                            isOpeningFolder={openingFolder === tool.id}
                            t={t}
                        />
                    ))}
                </div>
            </section>

            {/* 未找到的工具 */}
            {notFoundTools.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-muted-foreground" />
                        {t("tools.notFound")} ({notFoundTools.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {notFoundTools.map((tool) => (
                            <div
                                key={tool.id}
                                className="apple-card p-4 opacity-60"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                                        <Wrench className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-foreground">{tool.name}</h3>
                                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                            {tool.base_path}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 技能查看器弹窗 */}
            {selectedTool && (
                <SkillViewerModal
                    tool={selectedTool}
                    onClose={() => setSelectedTool(null)}
                />
            )}
        </div>
    );
}

interface ToolCardProps {
    tool: AiTool;
    onViewSkills: () => void;
    onOpenFolder: () => void;
    isOpeningFolder: boolean;
    t: (key: string, options?: any) => string;
}

function ToolCard({ tool, onViewSkills, onOpenFolder, isOpeningFolder, t }: ToolCardProps) {
    // 工具图标映射
    const getToolIcon = (id: string) => {
        const iconMap: Record<string, string> = {
            claude: "🤖",
            cursor: "🖱️",
            codex: "🧠",
            "github-copilot": "🐙",
            windsurf: "🏄",
            gemini: "✨",
            kiro: "☁️",
            vscode: "💻",
            cline: "📝",
            roo: "🦘",
            aider: "🔧",
            augment: "➕",
            continue: "▶️",
            opencode: "📂",
            kilocode: "📊",
            zencoder: "🧘",
            zed: "⚡",
        };
        return iconMap[id] || "🛠️";
    };

    return (
        <div className="apple-card p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xl">
                        {getToolIcon(tool.id)}
                    </div>
                    <div>
                        <h3 className="font-medium text-foreground">{tool.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                                {t("tools.installed")}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <p className="text-xs text-muted-foreground mb-4 truncate" title={tool.base_path}>
                {tool.base_path}
            </p>

            <div className="flex gap-2">
                <button
                    onClick={onViewSkills}
                    className="apple-button-secondary flex-1 h-8 text-xs flex items-center justify-center gap-1.5"
                >
                    <Eye className="w-3.5 h-3.5" />
                    {t("tools.viewSkills")}
                </button>
                <button
                    onClick={onOpenFolder}
                    disabled={isOpeningFolder}
                    className="apple-button-secondary flex-1 h-8 text-xs flex items-center justify-center gap-1.5"
                >
                    {isOpeningFolder ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <FolderOpen className="w-3.5 h-3.5" />
                    )}
                    {t("tools.openFolder")}
                </button>
            </div>
        </div>
    );
}
