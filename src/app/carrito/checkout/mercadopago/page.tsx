import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireCliente } from "@/lib/permissions";
import { accionPagarRechazado, accionPagarSimulado } from "@/modules/checkout/actions";
import { MercadoPagoPasarela } from "@/modules/checkout/components/mercadopago-pasarela";
import { leerCuponGuardado, resumenCheckout } from "@/modules/checkout/services/checkout";
import { obtenerEstadoCarrito, resolverComprador } from "@/modules/carrito/services/carrito";
import { CountdownReserva } from "@/modules/carrito/components/countdown";

export const metadata: Metadata = { title: "Mercado Pago Checkout Pro · Sneaker" };

export default async function MercadoPagoCheckoutPage() {
  const sesion = await requireCliente();
  const usuarioId = await resolverComprador(sesion.user.id, sesion.user.email);
  const carrito = await obtenerEstadoCarrito(usuarioId);

  if (carrito.items.length === 0) {
    redirect("/carrito");
  }

  const direccion = await prisma.direccion.findFirst({
    where: { clienteId: usuarioId },
    orderBy: [{ predeterminada: "desc" }, { creadoEn: "asc" }],
    select: {
      destinatario: true,
      ciudad: true,
      provincia: true,
    },
  });

  const destino = direccion
    ? { ciudad: direccion.ciudad, provincia: direccion.provincia }
    : null;

  const resumen = await resumenCheckout(carrito, await leerCuponGuardado(), destino);
  const conReservaVigente = resumen.reservaActiva;
  const conBloqueos = carrito.items.some((item) => item.faltante > 0 || !item.productoActivo);

  return (
    <div data-full-bleed className="flex w-full flex-col">
      {!conReservaVigente && (
        <div className="bg-[#FFCDD2] px-4 py-3 text-center text-sm font-semibold text-[#7C0300]">
          La reserva temporal de stock expiró.{" "}
          <Link href="/carrito" className="text-[#CF1A1F] underline">
            Volvé al carrito para reactivar la reserva antes de pagar.
          </Link>
        </div>
      )}
      {conReservaVigente && carrito.reservaExpiracion && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-[#FFF8E1] px-4 py-2 text-xs font-semibold text-[#7C0300]">
          <span>Reserva temporal de stock activa para tu pago:</span>
          <CountdownReserva expiracionISO={carrito.reservaExpiracion.toISOString()} />
        </div>
      )}

      <MercadoPagoPasarela
        accionAprobar={accionPagarSimulado}
        accionRechazar={accionPagarRechazado}
        nombreComprador={
          direccion?.destinatario ?? sesion.user.name ?? sesion.user.usuario ?? "Cliente Sneaker"
        }
        correoComprador={sesion.user.email ?? "cliente@sneaker.test"}
        items={resumen.items.map((it) => ({
          itemId: it.itemId,
          nombreProducto: it.nombreProducto,
          tituloVariante: it.tituloVariante,
          cantidad: it.cantidad,
          subtotalLinea: it.subtotalLinea,
        }))}
        subtotal={resumen.subtotal}
        descuentoPromociones={resumen.descuentoPromociones}
        descuentoCupon={resumen.descuentoCupon}
        codigoCupon={resumen.cupon?.codigo ?? null}
        costoEnvio={resumen.costoEnvio}
        destinoTexto={
          resumen.destinoEnvio
            ? `${resumen.destinoEnvio.ciudad}, ${resumen.destinoEnvio.provincia}`
            : null
        }
        total={resumen.totalConEnvio}
        bloqueado={!conReservaVigente || conBloqueos || !direccion}
      />
    </div>
  );
}
