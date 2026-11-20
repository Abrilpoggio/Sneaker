"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { useRutasAuth, useSesion, signOut } from "@/lib/auth-client";
import { RolUsuario } from "@/generated/prisma/enums";

/**
 * Panel deslizable reconstruido 1:1 desde el mockup de Figma:
 *
 * - `Side Menu Visitante`:
 *   - Tarjeta superior roja con botones en cursiva "Iniciar sesión" y "Registrarse"
 *   - Tarjeta inferior roja con las 4 opciones de usuario (al hacer clic sin
 *     sesion se abre el modal emergente de aviso).
 *
 * - `Side Menu Usuario` (y `Side Menu Admin`):
 *   - Tarjeta superior roja con icono circular de usuario a la izquierda +
 *     nombre completo y correo electronico en cursiva blanca a la derecha
 *   - Tarjeta inferior roja con las opciones en cursiva separadas por lineas
 *     blancas + opcion final "Cerrar sesión".
 */

interface ItemMenu {
  href: string;
  label: string;
  icono: ReactNode;
}

const ITEMS_CUENTA: ItemMenu[] = [
  {
    href: "/cuenta/pedidos",
    label: "Mis Compras / Pedidos",
    icono: (
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-7 w-7 shrink-0"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 7h14l1.2 12.2A1.8 1.8 0 0 1 18.4 21H5.6a1.8 1.8 0 0 1-1.8-1.8L5 7Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 7V5.5a3 3 0 0 1 6 0V7"
        />
      </svg>
    ),
  },
  {
    href: "/cuenta/favoritos",
    label: "Mis Favoritos",
    icono: (
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-7 w-7 shrink-0"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
        />
      </svg>
    ),
  },
  {
    href: "/cuenta/direcciones",
    label: "Mis Direcciones",
    icono: (
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-7 w-7 shrink-0"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 10c0 5.5-7 11-7 11s-7-5.5-7-11a7 7 0 0 1 14 0Z"
        />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    href: "/cuenta",
    label: "Mi Perfil",
    icono: (
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-7 w-7 shrink-0"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M3 17v2a2 2 0 0 0 2 2h2"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 9.5v1.5M15 9.5v1.5M12 9.5v3.2"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.5 16a3.8 3.8 0 0 0 5 0"
        />
      </svg>
    ),
  },
];

const ITEMS_ADMIN: ItemMenu[] = [
  {
    href: "/admin",
    label: "Panel de Control",
    icono: (
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-7 w-7 shrink-0"
      >
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: "/admin/productos",
    label: "Gestión de Productos",
    icono: (
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-7 w-7 shrink-0"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="m3.3 7 8.7 5 8.7-5M12 22V12" />
      </svg>
    ),
  },
  {
    href: "/admin/variantes",
    label: "Variantes y Stock",
    icono: (
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-7 w-7 shrink-0"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m12 2 10 6.5v7L12 22 2 15.5v-7L12 2Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m2 8.5 10 7 10-7" />
      </svg>
    ),
  },
  {
    href: "/admin/promociones",
    label: "Cupones y Promociones",
    icono: (
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-7 w-7 shrink-0"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 5v2m0 10v2m0-8v2" />
      </svg>
    ),
  },
  {
    href: "/admin/pedidos",
    label: "Pedidos y Envíos",
    icono: (
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-7 w-7 shrink-0"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 17h4V5H2v12h3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
        <circle cx="7.5" cy="17.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </svg>
    ),
  },
  {
    href: "/admin/catalogos",
    label: "Marcas y Proveedores",
    icono: (
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-7 w-7 shrink-0"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export function SideMenu() {
  const [abierto, setAbierto] = useState(false);
  const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
  const { data: sesion, status } = useSesion();
  const { loginHref, registroHref } = useRutasAuth();

  const autenticado =
    status === "authenticated" && Boolean(sesion?.user && !sesion.error);
  const esAdmin = sesion?.user?.rol === RolUsuario.ADMIN;
  const items = esAdmin ? ITEMS_ADMIN : ITEMS_CUENTA;

  const cerrarMenuCompleto = () => {
    setModalAuthAbierto(false);
    setAbierto(false);
  };

  const manejarCerrarSesion = async () => {
    cerrarMenuCompleto();
    await signOut({ callbackUrl: "/" });
  };

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modalAuthAbierto) {
          setModalAuthAbierto(false);
        } else {
          setAbierto(false);
        }
      }
    };
    document.addEventListener("keydown", alPulsar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = "";
    };
  }, [abierto, modalAuthAbierto]);

  return (
    <>
      {/* Hamburguesa compacta */}
      <button
        type="button"
        aria-label="Abrir menú"
        aria-expanded={abierto}
        onClick={() => setAbierto(true)}
        className="flex h-[38px] w-[38px] flex-col items-center justify-center gap-[5.5px] rounded-md text-white transition-opacity hover:opacity-80"
      >
        <span aria-hidden className="block h-[2px] w-[24px] rounded-full bg-white" />
        <span aria-hidden className="block h-[2px] w-[24px] rounded-full bg-white" />
        <span aria-hidden className="block h-[2px] w-[24px] rounded-full bg-white" />
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50">
          {/* Fondo semi-transparente con desenfoque sutil */}
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={cerrarMenuCompleto}
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
          />

          {/* Ventana emergente compacta con fondo degradado de dos tonos */}
          <aside
            role="dialog"
            aria-label="Menú de usuario"
            className="absolute right-3 top-3 flex max-h-[calc(100vh-24px)] w-[calc(100vw-24px)] max-w-[330px] flex-col overflow-y-auto rounded-2xl border border-white/15 bg-[linear-gradient(180deg,#2C2828_0%,#6E1E1C_46%,#C92824_100%)] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.55)] sm:right-6 sm:top-4"
          >
            {/* Cabecera compacta con título y botón cerrar */}
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold tracking-widest uppercase text-white/75">
                {esAdmin ? "Panel Admin" : "Mi Cuenta"}
              </span>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={cerrarMenuCompleto}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  className="h-4 w-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex w-full flex-col gap-4">
              {/* Bloque superior: Botones negros compactos (Visitante) o Resumen de perfil (Logueado) */}
              {!autenticado ? (
                <div className="grid w-full grid-cols-2 gap-2.5 rounded-xl bg-black/20 p-2.5 ring-1 ring-white/15">
                  <Link
                    href={loginHref}
                    onClick={cerrarMenuCompleto}
                    className="flex h-[38px] items-center justify-center rounded-lg bg-[#1F1F1F] px-3 text-sm font-semibold italic text-white shadow-sm transition-colors hover:bg-black"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href={registroHref}
                    onClick={cerrarMenuCompleto}
                    className="flex h-[38px] items-center justify-center rounded-lg bg-[#1F1F1F] px-3 text-sm font-semibold italic text-white shadow-sm transition-colors hover:bg-black"
                  >
                    Registrarse
                  </Link>
                </div>
              ) : (
                <div className="relative flex w-full items-center gap-3 rounded-xl bg-black/25 px-3.5 py-3 ring-1 ring-white/15">
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.6"
                    className="h-10 w-10 shrink-0"
                  >
                    <circle cx="12" cy="12" r="9.5" />
                    <circle cx="12" cy="9.5" r="3" />
                    <path
                      strokeLinecap="round"
                      d="M6.5 18.8a6.5 6.5 0 0 1 11 0"
                    />
                  </svg>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold italic text-white">
                      {sesion?.user?.name ?? sesion?.user?.usuario ?? "Usuario"}
                    </span>
                    <span className="truncate text-xs italic text-white/80">
                      {sesion?.user?.email}
                    </span>
                  </div>

                  {esAdmin && (
                    <span className="rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[10px] font-bold text-[#1E40AF]">
                      ADMIN
                    </span>
                  )}
                </div>
              )}

              {/* Opciones directamente sobre el fondo degradado de dos colores */}
              <nav aria-label="Opciones del menú" className="flex w-full flex-col">
                <div className="flex w-full flex-col divide-y divide-white/20">
                  {items.map((item) => (
                    <div key={item.href} className="py-1">
                      {autenticado ? (
                        <Link
                          href={item.href}
                          onClick={cerrarMenuCompleto}
                          className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-[15px] font-medium italic text-white transition-colors hover:bg-white/15 [&_svg]:h-5 [&_svg]:w-5"
                        >
                          {item.icono}
                          <span>{item.label}</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setModalAuthAbierto(true)}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-[15px] font-medium italic text-white transition-colors hover:bg-white/15 [&_svg]:h-5 [&_svg]:w-5"
                        >
                          {item.icono}
                          <span>{item.label}</span>
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Cerrar sesión cuando el usuario está autenticado */}
                  {autenticado && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => void manejarCerrarSesion()}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-[15px] font-medium italic text-white transition-colors hover:bg-black/25"
                      >
                        <svg
                          aria-hidden
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-5 w-5 shrink-0"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 12h8"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m15 9 3 3-3 3"
                          />
                        </svg>
                        <span>Cerrar sesión</span>
                      </button>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </aside>

          {/* Ventana emergente compacta de aviso para visitantes no autenticados */}
          {modalAuthAbierto && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
              <button
                type="button"
                aria-label="Cerrar aviso"
                onClick={() => setModalAuthAbierto(false)}
                className="absolute inset-0 bg-black/50"
              />

              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="modal-auth-titulo"
                aria-describedby="modal-auth-desc"
                className="relative z-10 w-full max-w-[390px]"
              >
                <button
                  type="button"
                  aria-label="Cerrar ventana"
                  onClick={() => setModalAuthAbierto(false)}
                  className="absolute -top-8 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-[#1E1E1E] shadow-md transition-transform hover:scale-105"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 6 6 18M6 6l12 12"
                    />
                  </svg>
                </button>

                <div className="rounded-2xl bg-white px-6 py-7 text-center shadow-2xl">
                  <h2
                    id="modal-auth-titulo"
                    className="mx-auto max-w-[330px] text-lg font-bold leading-snug text-[#EA332F] sm:text-xl"
                  >
                    Para continuar, necesitás iniciar sesión o crear una cuenta.
                  </h2>

                  <p
                    id="modal-auth-desc"
                    className="mx-auto mt-3 max-w-[330px] text-sm font-normal leading-relaxed text-[#2C2C2C]"
                  >
                    ¡Con tu usuario vas a poder comprar, guardar favoritos y
                    armar tu carrito sin límites!
                  </p>

                  <Link
                    href={loginHref}
                    onClick={cerrarMenuCompleto}
                    className="mx-auto mt-5 inline-flex h-[42px] w-[170px] items-center justify-center rounded-lg bg-[#2C2C2C] text-base font-medium text-white transition-opacity hover:opacity-90"
                  >
                    Ingresar
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
