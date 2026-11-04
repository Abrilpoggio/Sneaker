import bcrypt from "bcryptjs";

import { RolUsuario } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  actualizarPerfilClienteSchema,
  cambiarPasswordClienteSchema,
  intentaModificarUsuarioOCorreo,
  MENSAJE_CAMPOS_INMUTABLES,
} from "../schemas";

/**
 * Servicios de dominio del Modulo 2: Perfil & Clientes
 * (Sprint 2 - CU3, RF-14, RF-15, RF-16, RN-03).
 */

export type CodigoErrorCliente =
  | "NO_ENCONTRADO"
  | "CAMPO_INMUTABLE"
  | "DNI_DUPLICADO"
  | "LIMITE_DIRECCIONES"
  | "CREDENCIALES_INVALIDAS"
  | "VALIDACION";

export class ErrorNegocioCliente extends Error {
  readonly codigo: CodigoErrorCliente;
  readonly statusHttp: number;
  readonly erroresCampos?: Record<string, string[]>;

  constructor(
    codigo: CodigoErrorCliente,
    mensaje: string,
    statusHttp = 400,
    erroresCampos?: Record<string, string[]>,
  ) {
    super(mensaje);
    this.name = "ErrorNegocioCliente";
    this.codigo = codigo;
    this.statusHttp = statusHttp;
    this.erroresCampos = erroresCampos;
  }
}

export interface DatosCuentaCliente {
  usuario: {
    id: string;
    usuario: string;
    correo: string;
    rol: RolUsuario;
    creadoEn: Date;
    tienePassword: boolean;
    tieneGoogle: boolean;
  };
  cliente: {
    usuarioId: string;
    nombre: string;
    apellido: string;
    telefono: string | null;
    dni: number | null;
    conteos: {
      direcciones: number;
      pedidos: number;
      favoritos: number;
    };
  } | null;
}

const COSTO_BCRYPT = 12;

/**
 * Resuelve el ID real de un usuario activo en PostgreSQL a partir de la sesion
 * JWT (`id` primario o `correo` de respaldo si la BD fue reiniciada en dev).
 */
export async function resolverUsuarioActivoId(
  usuarioId: string,
  correoRespaldo?: string | null,
): Promise<string> {
  if (usuarioId) {
    const porId = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, activo: true },
    });
    if (porId && porId.activo) {
      return porId.id;
    }
  }

  if (correoRespaldo && correoRespaldo.trim().length > 0) {
    const porCorreo = await prisma.usuario.findUnique({
      where: { correo: correoRespaldo.trim().toLowerCase() },
      select: { id: true, activo: true },
    });
    if (porCorreo && porCorreo.activo) {
      return porCorreo.id;
    }
  }

  throw new ErrorNegocioCliente(
    "NO_ENCONTRADO",
    "La cuenta no existe o se encuentra inactiva.",
    404,
  );
}

/**
 * Obtiene el estado completo de la cuenta y el perfil de cliente asociado.
 * Si un usuario con rol `CLIENTE` no tuviera fila en `clientes` por algun
 * caso borde, la inicializa automaticamente para preservar la relacion 1:1.
 */
export async function obtenerDatosCuentaCliente(
  usuarioId: string,
  correoRespaldo?: string | null,
): Promise<DatosCuentaCliente> {
  const idResuelto = await resolverUsuarioActivoId(usuarioId, correoRespaldo);

  const fila = await prisma.usuario.findUnique({
    where: { id: idResuelto },
    include: {
      cliente: {
        include: {
          _count: {
            select: { direcciones: true, pedidos: true, favoritos: true },
          },
        },
      },
    },
  });

  if (!fila || !fila.activo) {
    throw new ErrorNegocioCliente(
      "NO_ENCONTRADO",
      "La cuenta no existe o se encuentra inactiva.",
      404,
    );
  }

  let clienteFila = fila.cliente;

  if (!clienteFila && fila.rol === RolUsuario.CLIENTE) {
    const creado = await prisma.cliente.create({
      data: {
        usuarioId: fila.id,
        nombre: fila.usuario,
        apellido: "",
      },
      include: {
        _count: {
          select: { direcciones: true, pedidos: true, favoritos: true },
        },
      },
    });
    clienteFila = creado;
  }

  return {
    usuario: {
      id: fila.id,
      usuario: fila.usuario,
      correo: fila.correo,
      rol: fila.rol,
      creadoEn: fila.creadoEn,
      tienePassword: Boolean(fila.passwordHash),
      tieneGoogle: Boolean(fila.googleSub),
    },
    cliente: clienteFila
      ? {
          usuarioId: clienteFila.usuarioId,
          nombre: clienteFila.nombre,
          apellido: clienteFila.apellido,
          telefono: clienteFila.telefono,
          dni: clienteFila.dni,
          conteos: {
            direcciones: clienteFila._count.direcciones,
            pedidos: clienteFila._count.pedidos,
            favoritos: clienteFila._count.favoritos,
          },
        }
      : null,
  };
}

/**
 * Actualiza los datos personales editables (`nombre`, `apellido`, `telefono`)
 * bloqueando estrictamente cualquier mutacion sobre `usuario`, `correo` o un
 * `dni` ya registrado (CU3 / RF-15 / RF-16 / RN-03).
 */
export async function actualizarPerfilCliente(
  usuarioId: string,
  payloadCrudo: Record<string, unknown>,
) {
  const cuenta = await obtenerDatosCuentaCliente(usuarioId);

  // Flujo alternativo CU3 / RN-03 / RF-16: bloqueo explicito en servidor
  if (
    intentaModificarUsuarioOCorreo(payloadCrudo, {
      usuario: cuenta.usuario.usuario,
      correo: cuenta.usuario.correo,
    })
  ) {
    throw new ErrorNegocioCliente(
      "CAMPO_INMUTABLE",
      MENSAJE_CAMPOS_INMUTABLES,
      400,
    );
  }

  if (!cuenta.cliente) {
    throw new ErrorNegocioCliente(
      "NO_ENCONTRADO",
      "Esta cuenta administrativa no posee un perfil de comprador editable.",
      404,
    );
  }

  // Si el DNI ya fue registrado previamente, es inmutable (UML p. 26 / RF-12)
  const dniCrudo = payloadCrudo.dni;
  const envioDniNoVacio =
    dniCrudo !== undefined &&
    dniCrudo !== null &&
    String(dniCrudo).trim() !== "";

  if (cuenta.cliente.dni !== null && envioDniNoVacio) {
    const dniNumericoEnviado = Number(String(dniCrudo).replace(/\D/g, ""));
    if (dniNumericoEnviado !== cuenta.cliente.dni) {
      throw new ErrorNegocioCliente(
        "CAMPO_INMUTABLE",
        "El documento (DNI) ya registrado no puede modificarse (RN-03).",
        400,
        { dni: ["El documento no es editable una vez registrado."] },
      );
    }
  }

  const parsed = actualizarPerfilClienteSchema.safeParse({
    nombre: payloadCrudo.nombre,
    apellido: payloadCrudo.apellido,
    telefono: payloadCrudo.telefono ?? "",
    dni:
      cuenta.cliente.dni === null && envioDniNoVacio
        ? String(dniCrudo).replace(/\D/g, "")
        : "",
  });

  if (!parsed.success) {
    throw new ErrorNegocioCliente(
      "VALIDACION",
      "Revisá los campos marcados antes de guardar.",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const { nombre, apellido, telefono, dni } = parsed.data;
  const nuevoDni =
    cuenta.cliente.dni === null && typeof dni === "number" ? dni : undefined;

  if (nuevoDni !== undefined) {
    const dniOcupado = await prisma.cliente.findUnique({
      where: { dni: nuevoDni },
      select: { usuarioId: true },
    });

    if (dniOcupado && dniOcupado.usuarioId !== usuarioId) {
      throw new ErrorNegocioCliente(
        "DNI_DUPLICADO",
        "Ya existe una cuenta registrada con ese DNI.",
        409,
        { dni: ["Este DNI ya está asociado a otro cliente."] },
      );
    }
  }

  const actualizado = await prisma.cliente.update({
    where: { usuarioId },
    data: {
      nombre,
      apellido,
      telefono: telefono && telefono.trim().length > 0 ? telefono.trim() : null,
      ...(nuevoDni !== undefined ? { dni: nuevoDni } : {}),
    },
  });

  return actualizado;
}

/**
 * Permite actualizar la contrasena verificando la contrasena actual con bcrypt
 * (o establecer una contrasena inicial si el usuario se dio de alta solo con Google).
 */
export async function cambiarPasswordUsuario(
  usuarioId: string,
  payloadCrudo: Record<string, unknown>,
): Promise<void> {
  const parsed = cambiarPasswordClienteSchema.safeParse(payloadCrudo);

  if (!parsed.success) {
    throw new ErrorNegocioCliente(
      "VALIDACION",
      "Revisá los requisitos de la nueva contraseña.",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, activo: true, passwordHash: true },
  });

  if (!usuario || !usuario.activo) {
    throw new ErrorNegocioCliente(
      "NO_ENCONTRADO",
      "La cuenta no existe o se encuentra inactiva.",
      404,
    );
  }

  const { passwordActual, passwordNueva } = parsed.data;

  if (usuario.passwordHash) {
    if (!passwordActual || passwordActual.length === 0) {
      throw new ErrorNegocioCliente(
        "VALIDACION",
        "Ingresá tu contraseña actual para confirmar el cambio.",
        400,
        { passwordActual: ["Ingresá tu contraseña actual."] },
      );
    }

    const coincideActual = await bcrypt.compare(
      passwordActual,
      usuario.passwordHash,
    );

    if (!coincideActual) {
      throw new ErrorNegocioCliente(
        "CREDENCIALES_INVALIDAS",
        "La contraseña actual ingresada es incorrecta.",
        400,
        { passwordActual: ["La contraseña actual no es correcta."] },
      );
    }

    const igualALaAnterior = await bcrypt.compare(
      passwordNueva,
      usuario.passwordHash,
    );

    if (igualALaAnterior) {
      throw new ErrorNegocioCliente(
        "VALIDACION",
        "La nueva contraseña debe ser diferente a la actual.",
        400,
        {
          passwordNueva: [
            "Elegí una contraseña distinta a la que usás actualmente.",
          ],
        },
      );
    }
  }

  const nuevoHash = await bcrypt.hash(passwordNueva, COSTO_BCRYPT);

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { passwordHash: nuevoHash },
  });
}

