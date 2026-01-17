import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { useAddRepository, useScanRepository } from "../hooks/useRepositories";
import type { Skill } from "../types";
import { api } from "../lib/api";
import { FeaturedRepositories } from "./FeaturedRepositories";
import { appToast } from "../lib/toast";

export function FeaturedRepositoriesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addMutation = useAddRepository();
  const scanMutation = useScanRepository();
  const [scanningRepoId, setScanningRepoId] = useState<string | null>(null);

  const refreshMutation = useMutation({
    mutationFn: api.refreshFeaturedRepositories,
    onSuccess: (data) => {
      queryClient.setQueryData(["featured-repositories"], data);
      appToast.success(t("repositories.featured.refreshed"));
    },
    onError: (error: any) => {
      appToast.error(
        t("repositories.featured.refreshFailed", {
          error: error?.message || String(error),
        })
      );
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline text-foreground">{t("nav.featuredRepositories")}</h1>
        </div>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="flex items-center gap-2 apple-button-primary disabled:opacity-50"
        >
          {refreshMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("repositories.featured.refreshing")}
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              {t("repositories.featured.refresh")}
            </>
          )}
        </button>
      </div>

      <FeaturedRepositories
        variant="page"
        layout="expanded"
        showHeader={false}
        categoryIds={["official", "community"]}
        onAdd={(url, name) => {
          addMutation.mutate(
            { url, name },
            {
              onSuccess: (repoId: string) => {
                appToast.success(t("repositories.toast.added"));

                setScanningRepoId(repoId);
                scanMutation.mutate(repoId, {
                  onSuccess: (skills: Skill[]) => {
                    setScanningRepoId(null);
                    appToast.success(t("repositories.toast.foundSkills", { count: skills.length }));
                  },
                  onError: (error: any) => {
                    setScanningRepoId(null);
                    appToast.error(`${t("repositories.toast.scanError")}${error.message || error}`);
                  },
                });
              },
              onError: (error: any) => {
                appToast.error(`${t("repositories.toast.error")}${error.message || error}`);
              },
            }
          );
        }}
        isAdding={addMutation.isPending || scanMutation.isPending || scanningRepoId !== null}
      />
    </div>
  );
}
