"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Sneaker ErrorBoundary]", error);
  }, [error]);

  const esDesfaseDeploy =
    error.message?.includes("Server Action") ||
    error.message?.includes("Failed to find Server Action");

  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-[#CF1A1F]">
        Ocurrió un inconveniente
      </p>
      <h1 className="text-3xl font-bold text-[#2C2C2C]">
        {esDesfaseDeploy
          ? "La aplicación se actualizó recién"
          : "Algo salió mal al cargar esta pantalla"}
      </h1>
      <p className="text-base text-[#6B6B6B]">
        {esDesfaseDeploy
          ? "Recargá la página para cargar la versión más reciente y continuar tu operación."
          : "Podés reintentar la operación o volver a la página principal de Sneaker."}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (esDesfaseDeploy) {
              window.location.reload();
            } else {
              reset();
            }
          }}
          className="rounded-md bg-[#CF1A1F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#7C0300]"
        >
          {esDesfaseDeploy ? "Recargar página" : "Reintentar"}
        </button>
        <Link
          href="/"
          className="rounded-md border border-[#2C2C2C] px-5 py-2.5 text-sm font-semibold text-[#2C2C2C] transition-colors hover:bg-[#F5F5F5]"
        >
          Ir al inicio
        </Link>
      </div>
      {(error.digest || error.message) && (
        <p className="mt-4 max-w-md break-all rounded bg-[#F5F5F5] px-3 py-1.5 font-mono text-[11px] text-[#6B6B6B]">
          Ref: {error.digest ?? error.message}
        </p>
      )}
    </div>
  );
}
