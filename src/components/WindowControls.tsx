import { useState, useEffect } from "react";
import { Minus, Plus, Square, X } from "lucide-react";
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
    <div className="flex items-center gap-2 group">
      <button
        onClick={handleClose}
        className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-110 transition-all flex items-center justify-center"
        aria-label="Close window"
      >
        <X className="w-2 h-2 text-black/60 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      <button
        onClick={handleMinimize}
        className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:brightness-110 transition-all flex items-center justify-center"
        aria-label="Minimize window"
      >
        <Minus className="w-2 h-2 text-black/60 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      <button
        onClick={handleMaximize}
        className="w-3 h-3 rounded-full bg-[#28C840] hover:brightness-110 transition-all flex items-center justify-center"
        aria-label="Maximize window"
      >
        <Plus className="w-2 h-2 text-black/60 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    </div>
  );

  const renderWindowsButtons = () => (
    <div className="flex items-center">
      <button
        onClick={handleMinimize}
        className="group p-2 hover:bg-black/5 transition-colors rounded"
        aria-label="Minimize window"
      >
        <Minus className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>
      <button
        onClick={handleMaximize}
        className="group p-2 hover:bg-black/5 transition-colors rounded"
        aria-label="Maximize window"
      >
        <Square className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>
      <button
        onClick={handleClose}
        className="group p-2 hover:bg-destructive/10 transition-colors rounded"
        aria-label="Close window"
      >
        <X className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors" />
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
