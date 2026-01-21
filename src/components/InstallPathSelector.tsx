import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChevronDown, Check, FolderPlus, CheckSquare, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ToolInstallPath {
  tool_id: string;
  tool_name: string;
  skills_path: string;
  is_default: boolean;
}

interface InstallPathSelectorProps {
  onSelect: (paths: string[]) => void;
}

export function InstallPathSelector({ onSelect }: InstallPathSelectorProps) {
  const { t } = useTranslation();
  const [toolPaths, setToolPaths] = useState<ToolInstallPath[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customPath, setCustomPath] = useState<string>('');
  const [isCustomSelected, setIsCustomSelected] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 工具图标映射
  const getToolIcon = (id: string): string => {
    const iconMap: Record<string, string> = {
      claude: "🤖", cursor: "🖱️", codex: "🧠", "github-copilot": "🐙",
      windsurf: "🏄", gemini: "✨", kiro: "☁️", vscode: "💻",
      cline: "📝", roo: "🦘", aider: "🔧", augment: "➕",
      continue: "▶️", opencode: "📂", kilocode: "📊", zencoder: "🧘", zed: "⚡",
    };
    return iconMap[id] || "🛠️";
  };

  // 计算选中的路径
  const getSelectedPaths = (selectedIds: Set<string>, includeCustom: boolean): string[] => {
    const paths = toolPaths
      .filter(t => selectedIds.has(t.tool_id))
      .map(t => t.skills_path);
    if (includeCustom && customPath) {
      paths.push(customPath);
    }
    return paths;
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const paths = await invoke<ToolInstallPath[]>('get_installed_tool_paths');
        setToolPaths(paths);

        // 默认全选所有工具
        const allIds = new Set(paths.map(p => p.tool_id));
        setSelectedToolIds(allIds);
        onSelect(paths.map(p => p.skills_path));
      } catch (error) {
        console.error('Failed to load tool paths:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const toggleTool = (toolId: string) => {
    const newSelected = new Set(selectedToolIds);
    if (newSelected.has(toolId)) {
      newSelected.delete(toolId);
    } else {
      newSelected.add(toolId);
    }
    setSelectedToolIds(newSelected);
    onSelect(getSelectedPaths(newSelected, isCustomSelected));
  };

  const selectAll = () => {
    const allIds = new Set(toolPaths.map(t => t.tool_id));
    setSelectedToolIds(allIds);
    onSelect(getSelectedPaths(allIds, isCustomSelected));
  };

  const deselectAll = () => {
    setSelectedToolIds(new Set());
    onSelect(getSelectedPaths(new Set(), isCustomSelected));
  };

  const toggleCustom = () => {
    const newIsCustomSelected = !isCustomSelected;
    setIsCustomSelected(newIsCustomSelected);
    onSelect(getSelectedPaths(selectedToolIds, newIsCustomSelected));
  };

  const handleCustomPath = async () => {
    setIsSelecting(true);
    try {
      const selectedCustomPath = await invoke<string | null>('select_custom_install_path');
      if (selectedCustomPath) {
        setCustomPath(selectedCustomPath);
        setIsCustomSelected(true);
        onSelect(getSelectedPaths(selectedToolIds, true));
      }
    } catch (error: any) {
      console.error('Failed to select custom path:', error);
    } finally {
      setIsSelecting(false);
    }
  };

  const selectedCount = selectedToolIds.size + (isCustomSelected && customPath ? 1 : 0);
  const totalCount = toolPaths.length + (customPath ? 1 : 0);

  // 显示文本
  const getDisplayText = () => {
    if (selectedCount === 0) {
      return t('skills.pathSelection.noToolsSelected');
    }
    if (selectedCount === totalCount && totalCount > 0) {
      return t('skills.pathSelection.allToolsSelected', { count: selectedCount });
    }
    return t('skills.pathSelection.toolsSelected', { count: selectedCount });
  };

  if (isLoading) {
    return (
      <div className="py-2 text-center text-muted-foreground text-sm">
        {t('tools.loading')}
      </div>
    );
  }

  if (toolPaths.length === 0 && !customPath) {
    return (
      <div className="space-y-3">
        <div className="py-3 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          {t('skills.pathSelection.noTools')}
        </div>
        <button
          type="button"
          onClick={handleCustomPath}
          disabled={isSelecting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-primary/50 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50 text-sm text-primary"
        >
          <FolderPlus className="w-4 h-4" />
          {isSelecting ? t('skills.pathSelection.selecting') : t('skills.pathSelection.addCustomPath')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm text-primary font-medium">
        {t('skills.pathSelection.selectPath')}:
      </label>

      {/* 多选下拉框 */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 border border-border rounded-lg bg-background hover:border-primary/50 transition-colors"
        >
          <span className="text-sm">{getDisplayText()}</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 border border-border rounded-lg bg-card shadow-lg max-h-60 overflow-y-auto">
            {/* 全选/反选按钮 */}
            <div className="flex gap-2 p-2 border-b border-border sticky top-0 bg-card z-10">
              <button
                type="button"
                onClick={selectAll}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                {t('skills.pathSelection.selectAll')}
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                {t('skills.pathSelection.deselectAll')}
              </button>
            </div>

            {/* 工具列表 */}
            <div className="p-1">
              {toolPaths.map((tool) => {
                const isSelected = selectedToolIds.has(tool.tool_id);
                return (
                  <button
                    key={tool.tool_id}
                    type="button"
                    onClick={() => toggleTool(tool.tool_id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-secondary/50'
                      }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                      }`}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-base">{getToolIcon(tool.tool_id)}</span>
                    <span className="flex-1 text-sm text-left">{tool.tool_name}</span>
                  </button>
                );
              })}

              {/* 自定义路径选项 */}
              {customPath && (
                <button
                  type="button"
                  onClick={toggleCustom}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${isCustomSelected ? 'bg-primary/10' : 'hover:bg-secondary/50'
                    }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${isCustomSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                    }`}>
                    {isCustomSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <FolderPlus className="w-4 h-4 text-primary" />
                  <span className="flex-1 text-sm text-left truncate" title={customPath}>
                    {t('skills.pathSelection.custom')}
                  </span>
                </button>
              )}
            </div>

            {/* 添加自定义路径 */}
            <div className="p-2 border-t border-border">
              <button
                type="button"
                onClick={handleCustomPath}
                disabled={isSelecting}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-primary hover:bg-primary/5 transition-colors text-sm"
              >
                <FolderPlus className="w-4 h-4" />
                {isSelecting ? t('skills.pathSelection.selecting') : t('skills.pathSelection.addCustomPath')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
