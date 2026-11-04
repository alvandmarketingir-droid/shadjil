"use client";

import { Toast, Toaster } from "@ark-ui/react/toast";
import { Portal } from "@ark-ui/react/portal";
import {
  CheckCircle,
  AlertCircle,
  X,
  Info,
  AlertTriangle,
} from "lucide-react";
import { toaster } from "@/lib/toaster";

const toastTypes = [
  {
    type: "success" as const,
    icon: CheckCircle,
    colors:
      "bg-green-50 border-l-4 border-green-500 text-green-800 dark:bg-green-50 dark:text-green-800 dark:border-green-500",
    iconColor: "text-green-500",
  },
  {
    type: "error" as const,
    icon: AlertCircle,
    colors:
      "bg-red-50 border-l-4 border-red-500 text-red-800 dark:bg-red-50 dark:text-red-800 dark:border-red-500",
    iconColor: "text-red-500",
  },
  {
    type: "warning" as const,
    icon: AlertTriangle,
    colors:
      "bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 dark:bg-yellow-50 dark:text-yellow-800 dark:border-yellow-500",
    iconColor: "text-yellow-500",
  },
  {
    type: "info" as const,
    icon: Info,
    colors:
      "bg-blue-50 border-l-4 border-blue-500 text-blue-800 dark:bg-blue-50 dark:text-blue-800 dark:border-blue-500",
    iconColor: "text-blue-500",
  },
];

export function AppToaster() {
  return (
    <Portal>
      <Toaster {...({ theme: "light", toaster } as any)}>
        {(toastItem) => {
          const cfg = toastTypes.find((t) => t.type === toastItem.type);
          const Icon = cfg?.icon || Info;
          return (
            <Toast.Root
              className={`relative min-w-80 rounded-lg p-4 shadow-lg transition-all duration-300 will-change-transform h-(--height) opacity-(--opacity) translate-x-(--x) translate-y-(--y) scale-(--scale) z-(--z-index) ${
                cfg?.colors || "border border-gray-100 bg-white dark:bg-white dark:border-gray-100 dark:text-green-800"
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${cfg?.iconColor || "text-gray-500"}`}
                />
                <div className="flex-1 pe-6">
                  <Toast.Title className="text-sm font-semibold">
                    {toastItem.title}
                  </Toast.Title>
                  {toastItem.description ? (
                    <Toast.Description className="mt-0.5 text-sm opacity-80">
                      {toastItem.description}
                    </Toast.Description>
                  ) : null}
                </div>
              </div>
              <Toast.CloseTrigger className="absolute top-3 end-3 rounded p-1 hover:bg-black/10">
                <X className="h-3 w-3" />
              </Toast.CloseTrigger>
            </Toast.Root>
          );
        }}
      </Toaster>
    </Portal>
  );
}
