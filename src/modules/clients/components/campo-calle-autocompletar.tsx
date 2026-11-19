"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { SugerenciaDireccion } from "@/app/api/direcciones/autocompletar/route";

interface CampoCalleAutocompletarProps {
  id: string;
  name?: string;
  value: string;
  onChange: (valor: string) => void;
  onSeleccionar: (sugerencia: SugerenciaDireccion) => void;
  provinciaContexto?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

/**
 * Input de calle con autocompletado de direcciones argentinas.
 * Consulta `/api/direcciones/autocompletar` con debounce de 350ms y permite
 * seleccionar una sugerencia (con mouse o teclado) para completar calle,
 * altura, ciudad, provincia y codigo postal automaticamente.
 */
export function CampoCalleAutocompletar({
  id,
  name = "calle",
  value,
  onChange,
  onSeleccionar,
  provinciaContexto,
  placeholder = "Empezá a escribir calle y altura...",
  className,
  required = true,
}: CampoCalleAutocompletarProps) {
  const [sugerencias, setSugerencias] = useState<SugerenciaDireccion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);

  const contenedorRef = useRef<HTMLDivElement>(null);
  const ignorarSiguienteBusquedaRef = useRef(false);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const manejarClickAfuera = (evento: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(evento.target as Node)
      ) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", manejarClickAfuera);
    return () => document.removeEventListener("mousedown", manejarClickAfuera);
  }, []);

  // Busqueda con debounce
  useEffect(() => {
    if (ignorarSiguienteBusquedaRef.current) {
      ignorarSiguienteBusquedaRef.current = false;
      return;
    }

    const texto = value.trim();
    if (texto.length < 3) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCargando(true);
      try {
        const params = new URLSearchParams({ q: texto });
        if (provinciaContexto && provinciaContexto.trim().length > 0) {
          params.set("provincia", provinciaContexto.trim());
        }
        const res = await fetch(
          `/api/direcciones/autocompletar?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setSugerencias([]);
          return;
        }
        const data = (await res.json()) as {
          sugerencias?: SugerenciaDireccion[];
        };
        const lista = Array.isArray(data.sugerencias) ? data.sugerencias : [];
        setSugerencias(lista);
        setIndiceActivo(-1);
        setAbierto(lista.length > 0);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setSugerencias([]);
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, provinciaContexto]);

  const elegirSugerencia = (item: SugerenciaDireccion) => {
    ignorarSiguienteBusquedaRef.current = true;
    setAbierto(false);
    setSugerencias([]);
    setIndiceActivo(-1);
    onSeleccionar(item);
  };

  const manejarTeclado = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!abierto || sugerencias.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceActivo((prev) => (prev + 1) % sugerencias.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceActivo((prev) =>
        prev <= 0 ? sugerencias.length - 1 : prev - 1,
      );
    } else if (e.key === "Enter" && indiceActivo >= 0) {
      e.preventDefault();
      elegirSugerencia(sugerencias[indiceActivo]);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  };

  return (
    <div ref={contenedorRef} className="relative">
      <div className="relative">
        <input
          id={id}
          name={name}
          type="text"
          required={required}
          value={value}
          onChange={(e) => {
            const nuevoValor = e.target.value;
            onChange(nuevoValor);
            if (nuevoValor.trim().length >= 3) {
              setAbierto(true);
            } else {
              setAbierto(false);
              setSugerencias([]);
              setCargando(false);
            }
          }}
          onFocus={() => {
            if (sugerencias.length > 0) setAbierto(true);
          }}
          onKeyDown={manejarTeclado}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={abierto && sugerencias.length > 0}
          aria-autocomplete="list"
          aria-controls={`${id}-sugerencias`}
          className={className}
        />

        {cargando && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[#9E9E9E]"
          >
            Buscando...
          </span>
        )}
      </div>

      {abierto && sugerencias.length > 0 && (
        <ul
          id={`${id}-sugerencias`}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-[8px] border border-[#D9D9D9] bg-white py-1 shadow-lg"
        >
          {sugerencias.map((item, idx) => {
            const activo = idx === indiceActivo;
            return (
              <li
                key={item.id}
                role="option"
                aria-selected={activo}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegirSugerencia(item);
                }}
                onMouseEnter={() => setIndiceActivo(idx)}
                className={`cursor-pointer px-3 py-2 text-left transition-colors ${
                  activo ? "bg-[#FFF5F5] text-[#CF1A1F]" : "text-[#2C2C2C] hover:bg-[#F5F5F5]"
                }`}
              >
                <p className="text-[13px] font-semibold leading-tight">
                  {item.etiqueta}
                </p>
                {item.subtitulo && (
                  <p className="mt-0.5 text-[11px] text-[#6B6B6B]">
                    {item.subtitulo}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
