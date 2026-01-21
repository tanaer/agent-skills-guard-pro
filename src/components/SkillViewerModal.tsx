import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import {
    X,
    Loader2,
    Folder,
    FolderOpen,
    FileText,
    ChevronRight,
    ChevronDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AiTool {
    id: string;
    name: string;
    base_path: string;
    skills_subdir: string;
    is_installed: boolean;
    icon: string | null;
}

interface FileNode {
    name: string;
    path: string;
    is_dir: boolean;
    children: FileNode[] | null;
}

interface SkillViewerModalProps {
    tool: AiTool;
    onClose: () => void;
}

export function SkillViewerModal({ tool, onClose }: SkillViewerModalProps) {
    const { t } = useTranslation();
    const [tree, setTree] = useState<FileNode[]>([]);
    const [isLoadingTree, setIsLoadingTree] = useState(true);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>("");
    const [isLoadingFile, setIsLoadingFile] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadSkillsTree();
    }, [tool.id]);

    const loadSkillsTree = async () => {
        try {
            setIsLoadingTree(true);
            const result = await invoke<FileNode[]>("get_tool_skills_tree", { toolId: tool.id });
            setTree(result);
            // 默认展开所有一级目录
            const firstLevelDirs = result.filter(n => n.is_dir).map(n => n.path);
            setExpandedFolders(new Set(firstLevelDirs));
        } catch (error: any) {
            console.error("Failed to load skills tree:", error);
        } finally {
            setIsLoadingTree(false);
        }
    };

    const loadFileContent = async (filePath: string) => {
        try {
            setIsLoadingFile(true);
            setSelectedFile(filePath);
            const content = await invoke<string>("read_skill_file", { filePath });
            setFileContent(content);
        } catch (error: any) {
            setFileContent(`Error: ${error.message || error}`);
        } finally {
            setIsLoadingFile(false);
        }
    };

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(path)) {
                newSet.delete(path);
            } else {
                newSet.add(path);
            }
            return newSet;
        });
    };

    const renderTreeNode = (node: FileNode, depth: number = 0) => {
        const isExpanded = expandedFolders.has(node.path);
        const isSelected = selectedFile === node.path;
        const isMarkdown = node.name.toLowerCase().endsWith('.md');

        return (
            <div key={node.path}>
                <div
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${isSelected
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary/80 text-foreground"
                        }`}
                    style={{ paddingLeft: `${depth * 16 + 8}px` }}
                    onClick={() => {
                        if (node.is_dir) {
                            toggleFolder(node.path);
                        } else {
                            loadFileContent(node.path);
                        }
                    }}
                >
                    {node.is_dir ? (
                        <>
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            )}
                            {isExpanded ? (
                                <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            ) : (
                                <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            )}
                        </>
                    ) : (
                        <>
                            <span className="w-4" />
                            <FileText className={`w-4 h-4 flex-shrink-0 ${isMarkdown ? "text-blue-500" : "text-muted-foreground"}`} />
                        </>
                    )}
                    <span className="text-sm truncate">{node.name}</span>
                </div>
                {node.is_dir && isExpanded && node.children && (
                    <div>
                        {node.children.map(child => renderTreeNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card rounded-2xl shadow-2xl w-[90vw] max-w-5xl h-[80vh] flex flex-col overflow-hidden border border-border/50">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            {t("tools.skillViewer.title")} - {tool.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">{tool.base_path}/{tool.skills_subdir}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel - Tree */}
                    <div className="w-72 flex-shrink-0 border-r border-border/50 overflow-y-auto p-3 bg-secondary/30">
                        {isLoadingTree ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : tree.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <Folder className="w-10 h-10 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">{t("tools.noSkills")}</p>
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {tree.map(node => renderTreeNode(node))}
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-background">
                        {isLoadingFile ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : selectedFile ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                {selectedFile.toLowerCase().endsWith('.md') ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {fileContent}
                                    </ReactMarkdown>
                                ) : (
                                    <pre className="text-sm bg-secondary/50 p-4 rounded-lg overflow-x-auto">
                                        <code>{fileContent}</code>
                                    </pre>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <FileText className="w-12 h-12 text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">{t("tools.skillViewer.selectFile")}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
