import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Shield, AlertTriangle, Info } from "lucide-react";
import { useState } from "react";

interface SecurityIssue {
  severity: string;
  category: string;
  description: string;
  line_number?: number;
  code_snippet?: string;
}

interface SecurityReport {
  skill_id: string;
  score: number;
  level: string;
  issues: SecurityIssue[];
  recommendations: string[];
  blocked: boolean;
  hard_trigger_issues: string[];
}

interface SkillScanResult {
  skill_id: string;
  skill_name: string;
  score: number;
  level: string;
  scanned_at: string;
  report: SecurityReport;
}

interface SecurityDetailDialogProps {
  result: SkillScanResult | null;
  open: boolean;
  onClose: () => void;
}

export function SecurityDetailDialog({ result, open, onClose }: SecurityDetailDialogProps) {
  if (!result) return null;

  const { report } = result;

  // 按严重程度分组
  const criticalIssues = report.issues.filter(i => i.severity === "Critical");
  const highIssues = report.issues.filter(i => i.severity === "Error");
  const mediumIssues = report.issues.filter(i => i.severity === "Warning");
  const lowIssues = report.issues.filter(i => i.severity === "Info");

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-terminal-cyan" />
            <div>
              <div className="text-xl">{result.skill_name}</div>
              <div className="text-sm text-muted-foreground font-normal mt-1">
                扫描时间：{new Date(result.scanned_at).toLocaleString()}
              </div>
            </div>
          </AlertDialogTitle>
        </AlertDialogHeader>

        {/* 总体评分 */}
        <div className="flex items-center justify-between p-6 bg-card/50 rounded-lg border border-border">
          <div>
            <div className="text-sm text-muted-foreground mb-1">安全评分</div>
            <div className={`text-5xl font-bold font-mono ${
              result.score >= 90 ? 'text-green-500' :
              result.score >= 70 ? 'text-yellow-500' :
              result.score >= 50 ? 'text-orange-500' : 'text-red-500'
            }`}>
              {result.score}
            </div>
          </div>
          <div>
            <span className={`px-4 py-2 rounded-lg text-lg font-mono border ${
              result.level === 'Safe' ? 'bg-green-500/20 text-green-500 border-green-500/50' :
              result.level === 'Low' ? 'bg-blue-500/20 text-blue-500 border-blue-500/50' :
              result.level === 'Medium' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50' :
              result.level === 'High' ? 'bg-orange-500/20 text-orange-500 border-orange-500/50' :
              'bg-red-500/20 text-red-500 border-red-500/50'
            }`}>
              {result.level}
            </span>
          </div>
        </div>

        {/* 问题列表 */}
        <div className="space-y-4">
          {criticalIssues.length > 0 && (
            <IssueSection
              title="严重问题"
              icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
              issues={criticalIssues}
              color="red"
            />
          )}

          {highIssues.length > 0 && (
            <IssueSection
              title="高风险问题"
              icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
              issues={highIssues}
              color="orange"
              defaultCollapsed
            />
          )}

          {mediumIssues.length > 0 && (
            <IssueSection
              title="中风险问题"
              icon={<Info className="w-5 h-5 text-yellow-500" />}
              issues={mediumIssues}
              color="yellow"
              defaultCollapsed
            />
          )}

          {lowIssues.length > 0 && (
            <IssueSection
              title="低风险问题"
              icon={<Info className="w-5 h-5 text-blue-500" />}
              issues={lowIssues}
              color="blue"
              defaultCollapsed
            />
          )}
        </div>

        {/* 建议区域 */}
        {report.recommendations.length > 0 && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
            <div className="font-mono text-sm font-bold mb-2">建议：</div>
            <ul className="space-y-1 text-sm">
              {report.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-yellow-500">▸</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>关闭</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// 问题区块组件
function IssueSection({
  title,
  icon,
  issues,
  color,
  defaultCollapsed = false
}: {
  title: string;
  icon: React.ReactNode;
  issues: SecurityIssue[];
  color: string;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const borderColorClass = `border-${color}-500/50`;
  const bgColorClass = `bg-${color}-500/10`;
  const hoverBgColorClass = `hover:bg-${color}-500/20`;

  return (
    <div className={`border rounded-lg overflow-hidden ${borderColorClass}`}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full flex items-center justify-between p-4 ${bgColorClass} ${hoverBgColorClass} transition-colors`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-mono font-bold">{title}</span>
          <span className="text-sm text-muted-foreground">({issues.length})</span>
        </div>
        <span className="text-sm">{collapsed ? '▼' : '▲'}</span>
      </button>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {issues.map((issue, idx) => (
            <div key={idx} className="p-3 bg-background/50 rounded border border-border">
              <div className="font-mono text-sm font-bold mb-2">{issue.description}</div>
              {issue.code_snippet && (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-1">
                    行号：{issue.line_number}
                  </div>
                  <pre className="p-2 bg-background rounded text-xs font-mono overflow-x-auto">
                    <code>{issue.code_snippet}</code>
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
