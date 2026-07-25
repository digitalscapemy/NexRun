"use client";

import React, { useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

interface PromptDialogProps {
  open: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  minLength?: number;
  maxLength?: number;
  isPending?: boolean;
}

export function PromptDialog({
  open,
  title,
  description,
  placeholder,
  value,
  onChange,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  minLength = 5,
  maxLength = 1000,
  isPending = false,
}: PromptDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = value.trim().length >= minLength && !isPending;

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-4">
          <Dialog.Popup
            initialFocus={textareaRef}
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl outline-none transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 dark:bg-neutral-900"
          >
            <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
              <Dialog.Title className="overflow-wrap-anywhere text-base font-bold text-neutral-900 dark:text-neutral-50">
                {title}
              </Dialog.Title>
              {description && <Dialog.Description className="mt-1 overflow-wrap-anywhere text-sm text-neutral-500">{description}</Dialog.Description>}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={4}
                maxLength={maxLength}
                placeholder={placeholder}
                className="mt-4 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-[11px] text-neutral-400">
                  {value.trim().length < minLength && value.length > 0 ? `At least ${minLength} characters required` : ""}
                </span>
                <span className="shrink-0 text-[11px] text-neutral-400">{value.length}/{maxLength}</span>
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-neutral-200 p-4 dark:border-neutral-800">
              <Dialog.Close render={<Button variant="ghost" disabled={isPending} />}>Cancel</Dialog.Close>
              <Button
                disabled={!canSubmit}
                onClick={onConfirm}
                className={confirmVariant === "danger" ? "bg-rose-600 font-bold text-white hover:bg-rose-700" : "bg-primary-500 font-bold text-white hover:bg-primary-600"}
              >
                {isPending ? "Saving..." : confirmLabel}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
