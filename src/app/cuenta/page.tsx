import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireCliente } from "@/lib/permissions";
import { MAXIMO_DIRECCIONES_POR_CLIENTE } from "@/modules/clients/schemas";
import {
  ErrorNegocioCliente,
  obtenerDatosCuentaCliente,
} from "@/modules/clients/services/perfil";

export const metadata: Metadata = {
  title: "Mi Perfil",
};

/**
 * Hub "Mi Perfil" reconstruido 1:1 desde el mockup de Figma
 * (`Vista 7: Perfil y Datos Personales`, nodo `226:3503`).
 *
 * Sprint 2 - CU3, RF-15, RF-16, RF-17, RN-02, RN-03:
 * - Contenedor `#FAFAFA` (`1170 x 396`, `rounded-[7px]`)
 * - Avatar circular `#ECECEC` + nombre completo y correo electronico
 * - 3 tarjetas blancas (`343 x 123`, `rounded-[7px]`, sombra suave):
 *   1. "Información de perfil" -> `/cuenta/perfil`
 *   2. "Seguridad" -> `/cuenta/seguridad`
 *   3. "Direcciones" -> `/cuenta/direcciones`
 */
export default async function PaginaCuenta() {
  const sesion = await requireCliente();
  const cuenta = await obtenerDatosCuentaCliente(
    sesion.user.id,
    sesion.user.email,
  ).catch((error: unknown) => {
    if (error instanceof ErrorNegocioCliente) {
      redirect("/login");
    }
    throw error;
  });

  const nombreMostrar = cuenta.cliente
    ? [
        cuenta.cliente.nombre,
        cuenta.cliente.apellido !== cuenta.cliente.nombre
          ? cuenta.cliente.apellido
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    : cuenta.usuario.usuario;

  const tarjetas = [
    {
      href: "/cuenta/perfil",
      titulo: "Información de perfil",
      descripcion: "Datos personales y de tu cuenta.",
      insignia: null,
    },
    {
      href: "/cuenta/seguridad",
      titulo: "Seguridad",
      descripcion: "Contraseñas y autentificaciones.",
      insignia: null,
    },
    {
      href: "/cuenta/direcciones",
      titulo: "Direcciones",
      descripcion: "Direcciones guardadas.",
      insignia: cuenta.cliente
        ? `${cuenta.cliente.conteos.direcciones}/${MAXIMO_DIRECCIONES_POR_CLIENTE}`
        : null,
    },
    {
      href: "/cuenta/pedidos",
      titulo: "Mis Pedidos",
      descripcion: "Historial de compras y seguimiento de envíos.",
      insignia: cuenta.cliente
        ? `${cuenta.cliente.conteos.pedidos}`
        : null,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1170px] flex-col gap-5">
      {/* Titulo "Mi Perfil" (Figma 226:3608 - Montserrat 18px 600 #000000) */}
      <h1 className="text-[18px] font-semibold leading-[22px] text-black">
        Mi Perfil
      </h1>

      {/* Contenedor #FAFAFA (Figma 226:3514 - 1170 x 396, radio 7px) */}
      <section
        aria-label="Panel Mi Perfil"
        className="flex min-h-[396px] flex-col justify-between gap-10 rounded-[7px] bg-[#FAFAFA] px-5 py-8 sm:px-12 sm:py-10"
      >
        {/* Cabecera con avatar circular #ECECEC + Nombre + Correo (Figma Group 35 - 226:3527) */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex h-[86px] w-[86px] shrink-0 items-center justify-center rounded-full bg-[#ECECEC] text-[#4E4E4E] sm:h-[96px] sm:w-[96px]">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-14 w-14"
              >
                <circle cx="12" cy="9" r="3.6" />
                <path
                  strokeLinecap="round"
                  d="M5.5 19.2a7 7 0 0 1 13 0"
                />
              </svg>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <p className="truncate text-[16px] font-medium leading-[20px] text-black sm:text-[18px]">
                {nombreMostrar}
              </p>
              <p className="truncate text-[14px] font-medium leading-[18px] text-black">
                {cuenta.usuario.correo}
              </p>
            </div>
          </div>

          {cuenta.cliente && (
            <Link
              href="/cuenta/perfil?editar=1"
              className="inline-flex items-center gap-2 rounded-[7px] bg-[#2C2C2C] px-4 py-2 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Editar datos personales
            </Link>
          )}
        </div>

        {/* 3 Tarjetas de navegacion (Figma Group 36, 37, 38 - 343 x 123, radio 7, sombra) */}
        <div className="grid gap-5 md:grid-cols-3 md:gap-7">
          {tarjetas.map((tarjeta) => (
            <Link
              key={tarjeta.href}
              href={tarjeta.href}
              className="group flex min-h-[123px] flex-col justify-center rounded-[7px] bg-white px-[22px] py-6 shadow-[0_2px_6px_rgba(0,0,0,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(0,0,0,0.2)]"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[18px] font-semibold leading-[22px] text-black group-hover:text-[#CF1A1F]">
                  {tarjeta.titulo}
                </h2>
                {tarjeta.insignia && (
                  <span className="rounded-full bg-[#F5F5F5] px-2.5 py-0.5 text-[12px] font-semibold text-[#2C2C2C]">
                    {tarjeta.insignia}
                  </span>
                )}
              </div>
              <p className="mt-2 text-[14px] font-normal leading-[18px] text-black">
                {tarjeta.descripcion}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
