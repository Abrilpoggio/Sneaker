import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Fondo con patron diagonal del wordmark SNEAKER reconstruido 1:1 desde Figma.
 *
 * Fuente: `Vista 5: Autenticacion (Login / Registro / Recuperacion)`,
 * nodo `Frame 99` dentro de `Frame 86` (`/figma/auth-bg.svg`, solo patron sin tarjeta embebida).
 */
export function AuthShell({
  children,
  bottomContent,
}: {
  children: ReactNode;
  bottomContent?: ReactNode;
}) {
  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] -my-8 flex min-h-[calc(100dvh-136px)] w-screen flex-col items-center justify-center overflow-hidden bg-[#4C4C4C] px-4 py-6 sm:min-h-[calc(100dvh-156px)] sm:py-8 xl:min-h-[calc(100dvh-183px)]">
      {/* Patron diagonal SNEAKER limpio (sin formulario estatico incrustado) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/figma/auth-bg.svg?v=2"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
      />

      {/* Contenedor central (Tarjeta + enlaces inferiores) */}
      <div className="relative z-10 flex w-full flex-col items-center">
        {children}
        {bottomContent && (
          <div className="mt-5 flex flex-col items-center gap-1.5 text-center [text-shadow:0_14px_14px_rgba(0,0,0,0.55)]">
            {bottomContent}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Checkbox de 13x13px (#D9D9D9, radio 2px, sombra interna de Figma) con tilde visible al marcarse.
 */
export function AuthCheckbox({
  name,
  label,
  defaultChecked,
  required,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  required?: boolean;
}) {
  return (
    <label className="flex w-full max-w-[328px] cursor-pointer items-center gap-[6px] select-none">
      <span className="relative inline-flex h-[13px] w-[13px] shrink-0 items-center justify-center">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          required={required}
          className="peer h-[13px] w-[13px] cursor-pointer appearance-none rounded-[2px] bg-[#D9D9D9] shadow-[inset_1px_1px_0.9px_rgba(0,0,0,0.25)] outline-none focus-visible:ring-2 focus-visible:ring-white"
        />
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          fill="none"
          className="pointer-events-none absolute h-[10px] w-[10px] text-[#2C2C2C] opacity-0 transition-opacity peer-checked:opacity-100"
        >
          <path
            d="M2 6.2L4.7 8.9L10 3.1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[13px] font-normal leading-[16px] text-white">
        {label}
      </span>
    </label>
  );
}

/**
 * Icono de Google del boton "Ingresar con gmail" (`226:1081`, exportado de Figma).
 */
export function GoogleIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/figma/google-icon.png"
      alt=""
      aria-hidden
      className="h-[28px] w-[28px] shrink-0 object-contain"
    />
  );
}

/**
 * Enlace inferior de las pantallas de autenticacion (`226:1544`, `226:1547`, `226:1082`).
 * La accion aparece siempre subrayada y en semibold tal como en el mockup.
 */
export function EnlaceAuthInferior({
  pregunta,
  accion,
  href,
}: {
  pregunta: string;
  accion: string;
  href: string;
}) {
  return (
    <p className="text-xl leading-[29px] text-white sm:text-[24px]">
      <span className="font-normal">{pregunta} </span>
      <Link
        href={href}
        className="font-semibold text-white underline decoration-2 underline-offset-4 transition-opacity hover:opacity-85"
      >
        {accion}
      </Link>
    </p>
  );
}
