"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { useSesion, signOut } from "@/lib/auth-client";
import { RolUsuario } from "@/generated/prisma/enums";

/**
 * Panel deslizable reconstruido 1:1 desde el mockup de Figma, incluyendo el
 * modal emergente de aviso para visitantes no autenticados.
 *
 * Variantes:
 * - `Side Menu Visitante`:
 *   - Fondo con gradiente vertical oscuro -> rojo (`#2C2828` -> `#592625` -> `#B3211E`)
 *   - Tarjeta superior roja con botones en cursiva "Iniciar sesión" y "Registrarse"
 *   - Tarjeta inferior roja con "Mis Compras / Pedidos", "Mis Favoritos",
 *     "Mis Direcciones" y "Mi Perfil". Al hacer clic en cualquiera de estas 4
 *     opciones sin haber iniciado sesion, se abre el popup de aviso invitando
 *     a ingresar.
 * - `Side Menu Usuario` / `Side Menu Admin`:
 *   - Tarjeta superior con datos del usuario (y badge `ADMIN` si corresponde)
 *   - Navegacion directa a cada ruta + boton "Cerrar sesión".
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
    label: "Gestion de Productos",
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
    href: "/admin/stock",
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
    label: "Pedidos y Envios",
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
    href: "/admin/proveedores",
    label: "Proveedores",
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
  const [modalAuthDestino, setModalAuthDestino] = useState<string | null>(null);
  const { data: sesion } = useSesion();

  const autenticado = Boolean(sesion?.user && !sesion.error);
  const esAdmin = sesion?.user?.rol === RolUsuario.ADMIN;
  const items = esAdmin ? ITEMS_ADMIN : ITEMS_CUENTA;

  const cerrarMenuCompleto = () => {
    setModalAuthDestino(null);
    setAbierto(false);
  };

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modalAuthDestino) {
          setModalAuthDestino(null);
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
  }, [abierto, modalAuthDestino]);

  return (
    <>
      {/* Hamburguesa 42 x 42 (3 lineas finas blancas como en el Header de Figma) */}
      <button
        type="button"
        aria-label="Abrir menú"
        aria-expanded={abierto}
        onClick={() => setAbierto(true)}
        className="flex h-[42px] w-[42px] flex-col items-center justify-center gap-[6.5px] rounded-md text-white transition-opacity hover:opacity-80"
      >
        <span aria-hidden className="block h-[2px] w-[28px] rounded-full bg-white" />
        <span aria-hidden className="block h-[2px] w-[28px] rounded-full bg-white" />
        <span aria-hidden className="block h-[2px] w-[28px] rounded-full bg-white" />
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50">
          {/* Fondo oscuro */}
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={cerrarMenuCompleto}
            className="absolute inset-0 bg-black/50 transition-opacity"
          />

          {/* Panel lateral con el gradiente oscuro -> rojo del mockup de Figma */}
          <aside
            role="dialog"
            aria-label="Menú lateral"
            className="absolute right-0 top-0 flex h-full w-full max-w-[475px] flex-col overflow-y-auto bg-[linear-gradient(180deg,#2C2828_0%,#592625_48%,#B3211E_100%)] px-[28px] pt-[27px] pb-10 shadow-2xl"
          >
            {/* Boton X superior izquierdo */}
            <div className="flex items-center">
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={cerrarMenuCompleto}
                className="flex h-9 w-9 items-center justify-center rounded-md text-white transition-opacity hover:opacity-80"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  className="h-7 w-7"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-[40px] flex w-full flex-col gap-[38px]">
              {/* Bloque superior rojo */}
              {!autenticado ? (
                <div className="grid w-full grid-cols-2 gap-3.5 rounded-[20px] bg-[#EC3834] px-4 py-[18px] shadow-[0_6px_8px_rgba(0,0,0,0.35)]">
                  <Link
                    href="/login"
                    onClick={cerrarMenuCompleto}
                    className="flex h-[46px] items-center justify-center rounded-[12px] bg-[#2C2C2C] px-3 text-[19px] font-medium italic text-white shadow-[0_3px_4px_rgba(0,0,0,0.3)] transition-opacity hover:opacity-90 sm:text-[21px]"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/registro"
                    onClick={cerrarMenuCompleto}
                    className="flex h-[46px] items-center justify-center rounded-[12px] bg-[#2C2C2C] px-3 text-[19px] font-medium italic text-white shadow-[0_3px_4px_rgba(0,0,0,0.3)] transition-opacity hover:opacity-90 sm:text-[21px]"
                  >
                    Registrarse
                  </Link>
                </div>
              ) : (
                <div className="relative flex min-h-[90px] w-full items-center gap-[17px] rounded-[20px] bg-[#EC3834] px-4 py-3 shadow-[0_6px_8px_rgba(0,0,0,0.35)]">
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.8"
                    className="h-[56px] w-[56px] shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="9" r="3" />
                    <path
                      strokeLinecap="round"
                      d="M6.5 18.5a6.5 6.5 0 0 1 11 0"
                    />
                  </svg>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-2xl font-medium leading-[29px] text-white">
                      {sesion?.user?.name ?? sesion?.user?.usuario ?? "Usuario"}
                    </span>
                    <span className="truncate text-lg font-medium leading-[24px] text-white/95 sm:text-xl">
                      {sesion?.user?.email}
                    </span>
                  </div>

                  {esAdmin && (
                    <span className="absolute right-3 top-2.5 flex h-[31px] w-[68px] items-center justify-center rounded-[16px] bg-[#DBEAFE] text-[15px] font-bold leading-[20px] text-[#1E40AF]">
                      ADMIN
                    </span>
                  )}
                </div>
              )}

              {/* Bloque inferior rojo con opciones */}
              <nav
                aria-label="Opciones del menú"
                className="flex w-full flex-col items-center rounded-[28px] bg-[#EC3834] px-7 py-7 shadow-[0_6px_8px_rgba(0,0,0,0.35)]"
              >
                <div className="flex w-full max-w-[362px] flex-col gap-[20px]">
                  {items.map((item, idx) => (
                    <div key={item.href} className="flex flex-col gap-[20px]">
                      {idx > 0 && (
                        <div className="h-[2.5px] w-full rounded-full bg-white" />
                      )}
                      {autenticado ? (
                        <Link
                          href={item.href}
                          onClick={cerrarMenuCompleto}
                          className="flex items-center gap-4 text-[20px] font-normal italic leading-[28px] text-white transition-opacity hover:opacity-85 sm:text-[22px]"
                        >
                          {item.icono}
                          <span>{item.label}</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setModalAuthDestino(item.href)}
                          className="flex w-full cursor-pointer items-center gap-4 text-left text-[20px] font-normal italic leading-[28px] text-white transition-opacity hover:opacity-85 sm:text-[22px]"
                        >
                          {item.icono}
                          <span>{item.label}</span>
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Cerrar sesion cuando el usuario esta autenticado */}
                  {autenticado && (
                    <div className="flex flex-col gap-[20px]">
                      <div className="h-[2.5px] w-full rounded-full bg-white" />
                      <button
                        type="button"
                        onClick={() => {
                          cerrarMenuCompleto();
                          void signOut({ callbackUrl: "/" });
                        }}
                        className="flex items-center gap-4 text-left text-[20px] font-normal italic leading-[28px] text-white transition-opacity hover:opacity-85 sm:text-[22px]"
                      >
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
                            d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                          />
                          <polyline
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points="16 17 21 12 16 7"
                          />
                          <line
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            x1="21"
                            y1="12"
                            x2="9"
                            y2="12"
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

          {/* Ventana emergente de aviso para visitantes no autenticados (Imagen 3 de Figma) */}
          {modalAuthDestino && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
              {/* Backdrop del modal */}
              <button
                type="button"
                aria-label="Cerrar aviso"
                onClick={() => setModalAuthDestino(null)}
                className="absolute inset-0 bg-black/45"
              />

              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="modal-auth-titulo"
                aria-describedby="modal-auth-desc"
                className="relative z-10 w-full max-w-[495px]"
              >
                {/* Boton circular blanco con X oscura arriba a la derecha de la tarjeta */}
                <button
                  type="button"
                  aria-label="Cerrar ventana"
                  onClick={() => setModalAuthDestino(null)}
                  className="absolute -top-9 right-0 flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full bg-white text-[#1E1E1E] shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-transform hover:scale-105 sm:-right-2"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 6 6 18M6 6l12 12"
                    />
                  </svg>
                </button>

                {/* Tarjeta blanca del modal */}
                <div className="rounded-[14px] bg-white px-7 py-9 text-center shadow-[0_14px_36px_rgba(0,0,0,0.4)] sm:px-10 sm:py-10">
                  <h2
                    id="modal-auth-titulo"
                    className="mx-auto max-w-[410px] text-[22px] font-bold leading-[1.28] text-[#EA332F] sm:text-[25px]"
                  >
                    Para continuar, necesitás iniciar sesión o crear una cuenta.
                  </h2>

                  <p
                    id="modal-auth-desc"
                    className="mx-auto mt-5 max-w-[410px] text-[15px] font-normal leading-[1.42] text-[#2C2C2C] sm:text-[17px]"
                  >
                    ¡Con tu usuario vas a poder comprar, guardar favoritos y
                    armar tu carrito sin límites!
                  </p>

                  <Link
                    href={`/login?callbackUrl=${encodeURIComponent(modalAuthDestino)}`}
                    onClick={cerrarMenuCompleto}
                    className="mx-auto mt-7 inline-flex h-[52px] w-[206px] items-center justify-center rounded-[10px] bg-[#2C2C2C] text-[21px] font-normal text-white transition-opacity hover:opacity-90"
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
