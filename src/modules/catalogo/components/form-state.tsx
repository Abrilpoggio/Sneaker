"use client";

import type { AdminFormState } from "@/modules/catalogo/admin-actions";

export function FormStateMessage({ state }: { state: AdminFormState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={
        state.status === "error"
          ? "rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          : "rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800"
      }
    >
      {state.message}
    </p>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-700">{message}</p>;
}
