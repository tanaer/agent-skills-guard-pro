import React from "react";
import { toast, type ExternalToast } from "sonner";

type ToastPosition = NonNullable<ExternalToast["position"]>;

export type AppToastOptions = Omit<ExternalToast, "position"> & {
  position?: ToastPosition;
};

type BannerTone = "info" | "success" | "error";

type AppToastBannerOptions = {
  duration?: number;
  tone?: BannerTone;
  position?: Extract<ToastPosition, "bottom-center" | "top-center">;
};

const DEFAULT_DURATION_MS = 3000;

const defaultCornerOptions: Pick<ExternalToast, "duration" | "position"> = {
  duration: DEFAULT_DURATION_MS,
  position: "bottom-right",
};

const toneClasses: Record<BannerTone, { container: string; arrow: string; boxShadow: string }> =
  {
    info: {
      container:
        "bg-primary/10 border-primary text-primary shadow-lg",
      arrow: "text-primary",
      boxShadow:
        "0 4px 20px rgba(0, 122, 255, 0.15)",
    },
    success: {
      container:
        "bg-success/10 border-success text-success shadow-lg",
      arrow: "text-success",
      boxShadow:
        "0 4px 20px rgba(52, 199, 89, 0.15)",
    },
    error: {
      container:
        "bg-destructive/10 border-destructive text-destructive shadow-lg",
      arrow: "text-destructive",
      boxShadow:
        "0 4px 20px rgba(255, 59, 48, 0.15)",
    },
  };

export const appToast = {
  message(message: React.ReactNode, options?: AppToastOptions) {
    return toast.message(message, { ...defaultCornerOptions, ...options });
  },
  success(message: React.ReactNode, options?: AppToastOptions) {
    return toast.success(message, { ...defaultCornerOptions, ...options });
  },
  info(message: React.ReactNode, options?: AppToastOptions) {
    return toast.info(message, { ...defaultCornerOptions, ...options });
  },
  warning(message: React.ReactNode, options?: AppToastOptions) {
    return toast.warning(message, { ...defaultCornerOptions, ...options });
  },
  error(message: React.ReactNode, options?: AppToastOptions) {
    return toast.error(message, { ...defaultCornerOptions, ...options });
  },
  loading(message: React.ReactNode, options?: AppToastOptions) {
    return toast.loading(message, { ...defaultCornerOptions, ...options });
  },
  banner(message: React.ReactNode, options?: AppToastBannerOptions) {
    const duration = options?.duration ?? DEFAULT_DURATION_MS;
    const position = options?.position ?? "bottom-center";
    const tone: BannerTone = options?.tone ?? "info";

    return toast.custom(
      (id) =>
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => toast.dismiss(id),
            className: [
              "w-[min(100vw-2rem,80rem)] px-8 py-5 border-t-2 backdrop-blur-md text-base text-left",
              "rounded-lg",
              toneClasses[tone].container,
            ].join(" "),
            style: { boxShadow: toneClasses[tone].boxShadow },
          },
          React.createElement(
            "div",
            { className: "flex items-center" },
            React.createElement(
              "span",
              { className: `${toneClasses[tone].arrow} mr-3 text-lg` },
              "›"
            ),
            React.createElement("span", { className: "tracking-wide" }, message)
          )
        ),
      { duration, position }
    );
  },
};
