"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  accionAlternarProveedor,
  accionEliminarCategoria,
  accionEliminarMarca,
  accionGuardarCategoria,
  accionGuardarMarca,
  accionGuardarProveedor,
  type EstadoAccionCatalogo,
} from "@/modules/catalogo/catalogos-actions";

export interface MarcaAdminItem {
  id: string;
  nombre: string;
  slug: string;
  productosCount: number;
}

export interface CategoriaAdminItem {
  id: string;
  nombre: string;
  slug: string;
  productosCount: number;
}

export interface ProveedorAdminItem {
  id: string;
  razonSocial: string;
  cuit: string;
  nombreContacto: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  estado: "ACTIVO" | "INACTIVO";
  productosCount: number;
}

const ESTADO_INICIAL: EstadoAccionCatalogo = { ok: false };
const inputClass =
  "w-full rounded border border-[#D9D9D9] bg-white px-3 py-2 text-sm text-[#2C2C2C] outline-none focus:border-[#CF1A1F] focus:ring-1 focus:ring-[#CF1A1F]";

export function CatalogosAdminUI({
  marcas,
  categorias,
  proveedores,
}: {
  marcas: MarcaAdminItem[];
  categorias: CategoriaAdminItem[];
  proveedores: ProveedorAdminItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"marcas" | "proveedores" | "categorias">("marcas");
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pendiente, startTransition] = useTransition();

  const [editMarcaId, setEditMarcaId] = useState<string | null>(null);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editProvId, setEditProvId] = useState<string | null>(null);

  const [, formMarca, cargandoMarca] = useActionState(
    async (prev: EstadoAccionCatalogo, fd: FormData) => {
      const res = await accionGuardarMarca(prev, fd);
      if (res.ok) {
        setEditMarcaId(null);
        setAviso({ tipo: "ok", texto: res.mensaje ?? "Guardado." });
        router.refresh();
      } else if (res.error) {
        setAviso({ tipo: "error", texto: res.error });
      }
      return res;
    },
    ESTADO_INICIAL,
  );

  const [, formCat, cargandoCat] = useActionState(
    async (prev: EstadoAccionCatalogo, fd: FormData) => {
      const res = await accionGuardarCategoria(prev, fd);
      if (res.ok) {
        setEditCatId(null);
        setAviso({ tipo: "ok", texto: res.mensaje ?? "Guardado." });
        router.refresh();
      } else if (res.error) {
        setAviso({ tipo: "error", texto: res.error });
      }
      return res;
    },
    ESTADO_INICIAL,
  );

  const [, formProv, cargandoProv] = useActionState(
    async (prev: EstadoAccionCatalogo, fd: FormData) => {
      const res = await accionGuardarProveedor(prev, fd);
      if (res.ok) {
        setEditProvId(null);
        setAviso({ tipo: "ok", texto: res.mensaje ?? "Guardado." });
        router.refresh();
      } else if (res.error) {
        setAviso({ tipo: "error", texto: res.error });
      }
      return res;
    },
    ESTADO_INICIAL,
  );

  function ejecutar(fn: () => Promise<EstadoAccionCatalogo>) {
    setAviso(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setAviso({ tipo: "ok", texto: res.mensaje ?? "Actualizado." });
        router.refresh();
      } else if (res.error) {
        setAviso({ tipo: "error", texto: res.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2 border-b border-[#D9D9D9] pb-3">
        {(
          [
            { id: "marcas", label: `Marcas (${marcas.length})` },
            { id: "proveedores", label: `Proveedores (${proveedores.length})` },
            { id: "categorias", label: `Categorías (${categorias.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setAviso(null);
            }}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? "bg-[#CF1A1F] text-white"
                : "bg-[#F5F5F5] text-[#2C2C2C] hover:bg-[#E5E5E5]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {aviso && (
        <div
          role={aviso.tipo === "error" ? "alert" : "status"}
          className={`rounded-md border px-4 py-3 text-sm font-medium ${
            aviso.tipo === "error"
              ? "border-red-300 bg-red-50 text-[#CF1A1F]"
              : "border-green-300 bg-green-50 text-green-800"
          }`}
        >
          {aviso.texto}
        </div>
      )}

      {tab === "marcas" && (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <form
            action={formMarca}
            className="flex h-fit flex-col gap-3 rounded-lg border border-[#D9D9D9] bg-white p-5"
          >
            <h2 className="text-lg font-bold text-[#2C2C2C]">Nueva marca</h2>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">
                Nombre *
              </label>
              <input
                name="nombre"
                required
                placeholder="Ej: Puma, Vans, Topper..."
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={cargandoMarca}
              className="rounded-md bg-[#CF1A1F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7C0300] disabled:opacity-60"
            >
              {cargandoMarca ? "Guardando..." : "Agregar marca"}
            </button>
          </form>

          <div className="flex flex-col gap-2">
            {marcas.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D9D9D9] bg-white p-4"
              >
                <div>
                  <p className="font-bold text-[#2C2C2C]">{m.nombre}</p>
                  <p className="text-xs text-[#6B6B6B]">
                    /{m.slug} · {m.productosCount} producto(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditMarcaId(editMarcaId === m.id ? null : m.id)}
                    className="rounded border border-[#D9D9D9] px-3 py-1 text-xs font-semibold text-[#2C2C2C] hover:bg-[#F5F5F5]"
                  >
                    {editMarcaId === m.id ? "Cerrar" : "Editar"}
                  </button>
                  {m.productosCount === 0 && (
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() => ejecutar(() => accionEliminarMarca(m.id))}
                      className="rounded border border-[#CF1A1F] px-3 py-1 text-xs font-semibold text-[#CF1A1F] hover:bg-[#FFF5F5]"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
                {editMarcaId === m.id && (
                  <form
                    action={formMarca}
                    className="mt-2 flex w-full items-center gap-2 border-t border-[#EEEEEE] pt-3"
                  >
                    <input type="hidden" name="id" value={m.id} />
                    <input
                      name="nombre"
                      required
                      defaultValue={m.nombre}
                      className={inputClass}
                    />
                    <button
                      type="submit"
                      disabled={cargandoMarca}
                      className="shrink-0 rounded bg-[#CF1A1F] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Guardar
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "categorias" && (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <form
            action={formCat}
            className="flex h-fit flex-col gap-3 rounded-lg border border-[#D9D9D9] bg-white p-5"
          >
            <h2 className="text-lg font-bold text-[#2C2C2C]">Nueva categoría</h2>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">
                Nombre *
              </label>
              <input
                name="nombre"
                required
                placeholder="Ej: Running, Outdoor..."
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={cargandoCat}
              className="rounded-md bg-[#CF1A1F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7C0300] disabled:opacity-60"
            >
              {cargandoCat ? "Guardando..." : "Agregar categoría"}
            </button>
          </form>

          <div className="flex flex-col gap-2">
            {categorias.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D9D9D9] bg-white p-4"
              >
                <div>
                  <p className="font-bold text-[#2C2C2C]">{c.nombre}</p>
                  <p className="text-xs text-[#6B6B6B]">
                    /{c.slug} · {c.productosCount} producto(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCatId(editCatId === c.id ? null : c.id)}
                    className="rounded border border-[#D9D9D9] px-3 py-1 text-xs font-semibold text-[#2C2C2C] hover:bg-[#F5F5F5]"
                  >
                    {editCatId === c.id ? "Cerrar" : "Editar"}
                  </button>
                  {c.productosCount === 0 && (
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() => ejecutar(() => accionEliminarCategoria(c.id))}
                      className="rounded border border-[#CF1A1F] px-3 py-1 text-xs font-semibold text-[#CF1A1F] hover:bg-[#FFF5F5]"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
                {editCatId === c.id && (
                  <form
                    action={formCat}
                    className="mt-2 flex w-full items-center gap-2 border-t border-[#EEEEEE] pt-3"
                  >
                    <input type="hidden" name="id" value={c.id} />
                    <input
                      name="nombre"
                      required
                      defaultValue={c.nombre}
                      className={inputClass}
                    />
                    <button
                      type="submit"
                      disabled={cargandoCat}
                      className="shrink-0 rounded bg-[#CF1A1F] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Guardar
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "proveedores" && (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <form
            action={formProv}
            className="flex h-fit flex-col gap-3 rounded-lg border border-[#D9D9D9] bg-white p-5"
          >
            <h2 className="text-lg font-bold text-[#2C2C2C]">Nuevo proveedor</h2>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">
                Razón social *
              </label>
              <input name="razonSocial" required placeholder="Ej: Distribuidora Calzados S.A." className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">
                CUIT *
              </label>
              <input name="cuit" required placeholder="30-71234567-9" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">
                Nombre de contacto *
              </label>
              <input name="nombreContacto" required placeholder="Ej: Juan Pérez" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">Teléfono</label>
                <input name="telefono" placeholder="011-4444-5555" className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">Email</label>
                <input name="email" type="email" placeholder="ventas@prov.com" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">Dirección</label>
              <input name="direccion" placeholder="Dirección comercial (opcional)" className={inputClass} />
            </div>
            <button
              type="submit"
              disabled={cargandoProv}
              className="rounded-md bg-[#CF1A1F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7C0300] disabled:opacity-60"
            >
              {cargandoProv ? "Guardando..." : "Agregar proveedor"}
            </button>
          </form>

          <div className="flex flex-col gap-3">
            {proveedores.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D9D9D9] bg-white p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[#2C2C2C]">{p.razonSocial}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        p.estado === "ACTIVO"
                          ? "bg-[#E8F5E9] text-[#2E7D32]"
                          : "bg-[#EEEEEE] text-[#6B6B6B]"
                      }`}
                    >
                      {p.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6B6B]">
                    CUIT {p.cuit} · Contacto: {p.nombreContacto}
                    {p.telefono ? ` · ${p.telefono}` : ""}
                    {p.email ? ` · ${p.email}` : ""}
                  </p>
                  <p className="text-[11px] text-[#9E9E9E]">
                    {p.productosCount} producto(s) asociado(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditProvId(editProvId === p.id ? null : p.id)}
                    className="rounded border border-[#D9D9D9] px-3 py-1 text-xs font-semibold text-[#2C2C2C] hover:bg-[#F5F5F5]"
                  >
                    {editProvId === p.id ? "Cerrar" : "Editar"}
                  </button>
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() =>
                      ejecutar(() => accionAlternarProveedor(p.id, p.estado !== "ACTIVO"))
                    }
                    className="rounded border border-[#2C2C2C] px-3 py-1 text-xs font-semibold text-[#2C2C2C] hover:bg-[#F5F5F5]"
                  >
                    {p.estado === "ACTIVO" ? "Desactivar" : "Activar"}
                  </button>
                </div>
                {editProvId === p.id && (
                  <form
                    action={formProv}
                    className="mt-2 grid w-full gap-2 border-t border-[#EEEEEE] pt-3 sm:grid-cols-2"
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <input name="razonSocial" required defaultValue={p.razonSocial} placeholder="Razón social" className={inputClass} />
                    <input name="cuit" required defaultValue={p.cuit} placeholder="CUIT" className={inputClass} />
                    <input name="nombreContacto" required defaultValue={p.nombreContacto} placeholder="Contacto" className={inputClass} />
                    <input name="telefono" defaultValue={p.telefono ?? ""} placeholder="Teléfono" className={inputClass} />
                    <input name="email" type="email" defaultValue={p.email ?? ""} placeholder="Email" className={inputClass} />
                    <input name="direccion" defaultValue={p.direccion ?? ""} placeholder="Dirección" className={inputClass} />
                    <div className="flex gap-2 sm:col-span-2">
                      <button
                        type="submit"
                        disabled={cargandoProv}
                        className="rounded bg-[#CF1A1F] px-4 py-1.5 text-xs font-semibold text-white"
                      >
                        Guardar cambios
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
