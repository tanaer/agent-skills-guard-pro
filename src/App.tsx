import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { SkillsPage } from "./components/SkillsPage";
import { RepositoriesPage } from "./components/RepositoriesPage";
import { api } from "./lib/api";

const queryClient = new QueryClient();

function AppContent() {
  const [currentTab, setCurrentTab] = useState<"skills" | "repositories">("skills");
  const [localScanLoading, setLocalScanLoading] = useState(false);
  const [localScanMessage, setLocalScanMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Scan local skills on app startup
  useEffect(() => {
    const initLocalSkills = async () => {
      setLocalScanLoading(true);
      setLocalScanMessage("🔍 正在扫描本地技能目录...");
      try {
        const skills = await api.scanLocalSkills();
        queryClient.invalidateQueries({ queryKey: ["skills"] });
        if (skills.length > 0) {
          setLocalScanMessage(`✅ 导入了 ${skills.length} 个本地技能`);
        } else {
          setLocalScanMessage(null); // Hide if no skills imported
        }
      } catch (error) {
        console.error("Failed to scan local skills:", error);
        setLocalScanMessage(null); // Hide on error
      } finally {
        setLocalScanLoading(false);
        // Auto-dismiss success message after 3 seconds
        setTimeout(() => setLocalScanMessage(null), 3000);
      }
    };
    initLocalSkills();
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background">
      {/* Local Skills Scan Notification Banner */}
      {localScanMessage && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-800">
          {localScanMessage}
        </div>
      )}

      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">🛡️ Agent Skills Guard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            安全管理您的 Claude Code Skills
          </p>
        </div>
      </header>

        <nav className="border-b">
          <div className="container mx-auto px-4">
            <div className="flex gap-4">
              <button
                onClick={() => setCurrentTab("skills")}
                className={`px-4 py-2 border-b-2 transition-colors ${
                  currentTab === "skills"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Skills 管理
              </button>
              <button
                onClick={() => setCurrentTab("repositories")}
                className={`px-4 py-2 border-b-2 transition-colors ${
                  currentTab === "repositories"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                仓库配置
              </button>
            </div>
          </div>
        </nav>

      <main className="container mx-auto px-4 py-6">
        {currentTab === "skills" && <SkillsPage />}
        {currentTab === "repositories" && <RepositoriesPage />}
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
