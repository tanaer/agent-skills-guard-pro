import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SecurityReport } from "../types/security";
import { countIssuesBySeverity } from "@/lib/security-utils";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
} from "./ui/alert-dialog";
import {
    XCircle,
    AlertTriangle,
    CheckCircle,
} from "lucide-react";
import { InstallPathSelector } from "./InstallPathSelector";

interface InstallConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (selectedPaths: string[]) => void;
    report: SecurityReport | null;
    skillName: string;
}

export function InstallConfirmDialog({
    open,
    onClose,
    onConfirm,
    report,
    skillName,
}: InstallConfirmDialogProps) {
    const { t } = useTranslation();
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

    const isMediumRisk = report ? report.score >= 50 && report.score < 70 : false;
    const isHighRisk = report ? report.score < 50 || report.blocked : false;

    const issueCounts = useMemo(
        () => (report ? countIssuesBySeverity(report.issues) : { critical: 0, error: 0, warning: 0 }),
        [report]
    );

    if (!report) return null;

    return (
        <AlertDialog open={open} onOpenChange={onClose}>
            <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        {isHighRisk ? (
                            <XCircle className="w-5 h-5 text-destructive" />
                        ) : isMediumRisk ? (
                            <AlertTriangle className="w-5 h-5 text-warning" />
                        ) : (
                            <CheckCircle className="w-5 h-5 text-success" />
                        )}
                        {t("skills.marketplace.install.scanResult")}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-4 pb-4">
                            <div>
                                {t("skills.marketplace.install.preparingInstall")}:{" "}
                                <span className="font-semibold">{skillName}</span>
                            </div>

                            {/* Score */}
                            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                <span className="text-sm">{t("skills.marketplace.install.securityScore")}:</span>
                                <span
                                    className={`text-3xl font-bold ${report.score >= 90
                                        ? "text-success"
                                        : report.score >= 70
                                            ? "text-success"
                                            : report.score >= 50
                                                ? "text-warning"
                                                : "text-destructive"
                                        }`}
                                >
                                    {report.score}
                                </span>
                            </div>

                            {/* Issue Summary */}
                            {report.issues.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">
                                        {t("skills.marketplace.install.issuesDetected")}:
                                    </div>
                                    <div className="flex gap-4 text-sm">
                                        {issueCounts.critical > 0 && (
                                            <span className="text-destructive">
                                                {t("skills.marketplace.install.critical")}: {issueCounts.critical}
                                            </span>
                                        )}
                                        {issueCounts.error > 0 && (
                                            <span className="text-warning">
                                                {t("skills.marketplace.install.highRisk")}: {issueCounts.error}
                                            </span>
                                        )}
                                        {issueCounts.warning > 0 && (
                                            <span className="text-warning">
                                                {t("skills.marketplace.install.mediumRisk")}: {issueCounts.warning}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Issue List */}
                            {report.issues.length > 0 && (
                                <div
                                    className={`p-3 rounded-lg ${isHighRisk
                                        ? "bg-destructive/10 border border-destructive/30"
                                        : isMediumRisk
                                            ? "bg-warning/10 border border-warning/30"
                                            : "bg-success/10 border border-success/30"
                                        }`}
                                >
                                    <ul className="space-y-1 text-sm">
                                        {report.issues.slice(0, 3).map((issue, idx) => (
                                            <li key={idx} className="text-xs">
                                                {issue.file_path && (
                                                    <span className="text-primary mr-1.5">[{issue.file_path}]</span>
                                                )}
                                                {issue.description}
                                                {issue.line_number && (
                                                    <span className="text-muted-foreground ml-1">
                                                        L{issue.line_number}
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                        {report.issues.length > 3 && (
                                            <li className="text-xs text-muted-foreground pt-1">
                                                ... {t("skills.marketplace.install.moreIssues", { count: report.issues.length - 3 })}
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            <InstallPathSelector
                                onSelect={setSelectedPaths}
                            />

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={onClose}
                                    className="apple-button-secondary"
                                >
                                    {t("common.cancel")}
                                </button>
                                <button
                                    onClick={() => onConfirm(selectedPaths)}
                                    disabled={selectedPaths.length === 0}
                                    className={`apple-button-primary ${isHighRisk ? "bg-destructive hover:bg-destructive/90" : ""
                                        }`}
                                >
                                    {t("skills.install")}
                                </button>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
            </AlertDialogContent>
        </AlertDialog>
    );
}
