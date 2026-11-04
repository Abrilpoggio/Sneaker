import type { Direccion } from "@/generated/prisma/client";
import { RolUsuario } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  direccionClienteSchema,
  MAXIMO_DIRECCIONES_POR_CLIENTE,
  MENSAJE_LIMITE_DIRECCIONES,
} from "../schemas";
import { ErrorNegocioCliente } from "./perfil";

/**
 * Servicio transaccional de Direcciones de Envio (Modulo 2: Perfil & Clientes).
 *
 * Referenciado directamente en `prisma/schema.prisma` (linea 262):
 * Implementa el CRUD completo respetando RN-02 / RF-17 (maximo 3 direcciones
 * por cliente), RF-18 (seleccion / predeterminada) y RF-19 (destinatario
 * distinto al titular de la cuenta).
 */

function normalizarOpcional(valor: string | undefined): string | null {
  if (!valor) return null;
  const limpio = valor.trim();
  return limpio.length > 0 ? limpio : null;
}

/**
 * Lista todas las direcciones del cliente ordenadas poniendo la direccion
 * predeterminada ("Actual") en primer lugar.
 */
export async function listarDireccionesCliente(
  clienteId: string,
): Promise<Direccion[]> {
  return await prisma.direccion.findMany({
    where: { clienteId },
    orderBy: [{ predeterminada: "desc" }, { creadoEn: "asc" }],
  });
}

/**
 * Da de alta una nueva direccion verificando atomicamente en PostgreSQL que
 * el cliente no supere el limite de 3 direcciones (RN-02).
 */
export async function crearDireccionCliente(
  clienteId: string,
  payloadCrudo: Record<string, unknown>,
): Promise<Direccion> {
  const parsed = direccionClienteSchema.safeParse(payloadCrudo);

  if (!parsed.success) {
    throw new ErrorNegocioCliente(
      "VALIDACION",
      "Revisá los datos de la dirección ingresada.",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const datos = parsed.data;

  return await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.findUnique({
      where: { id: clienteId },
      include: { cliente: { select: { usuarioId: true } } },
    });

    if (!usuario || !usuario.activo) {
      throw new ErrorNegocioCliente(
        "NO_ENCONTRADO",
        "La sesión no corresponde a un usuario activo.",
        404,
      );
    }

    if (!usuario.cliente) {
      if (usuario.rol === RolUsuario.CLIENTE) {
        await tx.cliente.create({
          data: {
            usuarioId: usuario.id,
            nombre: usuario.usuario,
            apellido: "",
          },
        });
      } else {
        throw new ErrorNegocioCliente(
          "NO_ENCONTRADO",
          "Solo las cuentas con perfil de cliente pueden registrar direcciones de envío.",
          400,
        );
      }
    }

    const totalActual = await tx.direccion.count({
      where: { clienteId },
    });

    if (totalActual >= MAXIMO_DIRECCIONES_POR_CLIENTE) {
      throw new ErrorNegocioCliente(
        "LIMITE_DIRECCIONES",
        MENSAJE_LIMITE_DIRECCIONES,
        409,
      );
    }

    const seraPredeterminada = totalActual === 0 || datos.predeterminada;

    if (seraPredeterminada && totalActual > 0) {
      await tx.direccion.updateMany({
        where: { clienteId, predeterminada: true },
        data: { predeterminada: false },
      });
    }

    return await tx.direccion.create({
      data: {
        clienteId,
        destinatario: datos.destinatario,
        calle: datos.calle,
        numero: datos.numero,
        piso: normalizarOpcional(datos.piso),
        departamento: normalizarOpcional(datos.departamento),
        ciudad: datos.ciudad,
        provincia: datos.provincia,
        codigoPostal: normalizarOpcional(datos.codigoPostal),
        predeterminada: seraPredeterminada,
      },
    });
  });
}

/**
 * Edita una direccion existente verificando que pertenezca al `clienteId`
 * autenticado y manteniendo siempre coherente la bandera `predeterminada`.
 */
export async function actualizarDireccionCliente(
  clienteId: string,
  direccionId: string,
  payloadCrudo: Record<string, unknown>,
): Promise<Direccion> {
  const parsed = direccionClienteSchema.safeParse(payloadCrudo);

  if (!parsed.success) {
    throw new ErrorNegocioCliente(
      "VALIDACION",
      "Revisá los datos de la dirección antes de guardar.",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const datos = parsed.data;

  return await prisma.$transaction(async (tx) => {
    const existente = await tx.direccion.findFirst({
      where: { id: direccionId, clienteId },
    });

    if (!existente) {
      throw new ErrorNegocioCliente(
        "NO_ENCONTRADO",
        "La dirección seleccionada no existe o no pertenece a tu cuenta.",
        404,
      );
    }

    let seraPredeterminada = datos.predeterminada;

    if (seraPredeterminada && !existente.predeterminada) {
      await tx.direccion.updateMany({
        where: { clienteId, id: { not: direccionId }, predeterminada: true },
        data: { predeterminada: false },
      });
    } else if (!seraPredeterminada && existente.predeterminada) {
      const otraDireccion = await tx.direccion.findFirst({
        where: { clienteId, id: { not: direccionId } },
        orderBy: { creadoEn: "asc" },
      });

      if (otraDireccion) {
        await tx.direccion.update({
          where: { id: otraDireccion.id },
          data: { predeterminada: true },
        });
      } else {
        // Si es la unica direccion registrada, permanece como predeterminada
        seraPredeterminada = true;
      }
    }

    return await tx.direccion.update({
      where: { id: direccionId },
      data: {
        destinatario: datos.destinatario,
        calle: datos.calle,
        numero: datos.numero,
        piso: normalizarOpcional(datos.piso),
        departamento: normalizarOpcional(datos.departamento),
        ciudad: datos.ciudad,
        provincia: datos.provincia,
        codigoPostal: normalizarOpcional(datos.codigoPostal),
        predeterminada: seraPredeterminada,
      },
    });
  });
}

/**
 * Marca una direccion como predeterminada ("Actual") desmarcando las restantes.
 */
export async function marcarDireccionPredeterminada(
  clienteId: string,
  direccionId: string,
): Promise<Direccion> {
  return await prisma.$transaction(async (tx) => {
    const existente = await tx.direccion.findFirst({
      where: { id: direccionId, clienteId },
    });

    if (!existente) {
      throw new ErrorNegocioCliente(
        "NO_ENCONTRADO",
        "La dirección seleccionada no existe o no pertenece a tu cuenta.",
        404,
      );
    }

    await tx.direccion.updateMany({
      where: { clienteId, id: { not: direccionId }, predeterminada: true },
      data: { predeterminada: false },
    });

    return await tx.direccion.update({
      where: { id: direccionId },
      data: { predeterminada: true },
    });
  });
}

/**
 * Elimina una direccion del cliente. Si era la predeterminada y existen otras
 * direcciones guardadas, promueve automaticamente la mas antigua restante.
 */
export async function eliminarDireccionCliente(
  clienteId: string,
  direccionId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existente = await tx.direccion.findFirst({
      where: { id: direccionId, clienteId },
    });

    if (!existente) {
      throw new ErrorNegocioCliente(
        "NO_ENCONTRADO",
        "La dirección que intentás eliminar no existe o no pertenece a tu cuenta.",
        404,
      );
    }

    await tx.direccion.delete({
      where: { id: direccionId },
    });

    if (existente.predeterminada) {
      const siguiente = await tx.direccion.findFirst({
        where: { clienteId },
        orderBy: { creadoEn: "asc" },
      });

      if (siguiente) {
        await tx.direccion.update({
          where: { id: siguiente.id },
          data: { predeterminada: true },
        });
      }
    }
  });
}

