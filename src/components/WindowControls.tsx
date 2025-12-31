import { useState, useEffect } from "react";
import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getPlatform, type Platform } from "../lib/platform";

export function WindowControls() {
  const [platform, setPlatform] = useState<Platform>('unknown');

  useEffect(() => {
    getPlatform().then(setPlatform);
  }, []);

  const handleMinimize = () => {
    getCurrentWindow().minimize();
  };

  const handleMaximize = () => {
    getCurrentWindow().toggleMaximize();
  };

  const handleClose = () => {
    getCurrentWindow().close();
  };

  const renderMacButtons = () => (
    <div className="flex items-center gap-2">
      {/* Mac 风格：关闭 (红) */}
      <button
        onClick={handleClose}
        className="group w-3 h-3 rounded-full bg-terminal-red hover:bg-red-500 transition-colors duration-200 flex items-center justify-center"
        aria-label="Close window"
      >
        <X className="w-2 h-2 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Mac 风格：最小化 (黄) */}
      <button
        onClick={handleMinimize}
        className="group w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors duration-200 flex items-center justify-center"
        aria-label="Minimize window"
      >
        <Minus className="w-2 h-2 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Mac 风格：最大化 (绿) */}
      <button
        onClick={handleMaximize}
        className="group w-3 h-3 rounded-full bg-terminal-green hover:bg-green-400 transition-colors duration-200 flex items-center justify-center"
        aria-label="Maximize window"
      >
        <Square className="w-1.5 h-1.5 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    </div>
  );

  const renderWindowsButtons = () => (
    <div className="flex items-center gap-1">
      {/* Windows 风格：最小化 */}
      <button
        onClick={handleMinimize}
        className="group p-2 hover:bg-terminal-cyan/10 transition-colors duration-200 rounded"
        aria-label="Minimize window"
      >
        <Minus className="w-4 h-4 text-muted-foreground group-hover:text-terminal-cyan transition-colors" />
      </button>

      {/* Windows 风格：最大化 */}
      <button
        onClick={handleMaximize}
        className="group p-2 hover:bg-terminal-cyan/10 transition-colors duration-200 rounded"
        aria-label="Maximize window"
      >
        <Square className="w-3.5 h-3.5 text-muted-foreground group-hover:text-terminal-cyan transition-colors" />
      </button>

      {/* Windows 风格：关闭 */}
      <button
        onClick={handleClose}
        className="group p-2 hover:bg-terminal-red/20 transition-colors duration-200 rounded"
        aria-label="Close window"
      >
        <X className="w-4 h-4 text-muted-foreground group-hover:text-terminal-red transition-colors" />
      </button>
    </div>
  );

  return (
    <>
      {platform === 'macos' && renderMacButtons()}
      {platform === 'windows' && renderWindowsButtons()}
      {platform === 'linux' && renderWindowsButtons()}
      {platform === 'unknown' && renderWindowsButtons()}
    </>
  );
}
