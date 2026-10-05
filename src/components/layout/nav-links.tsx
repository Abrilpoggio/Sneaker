import Link from "next/link";

/**
 * Enlaces de navegacion principal (RF-01).
 *
 * Las categorias salen de RF-05. La version estatica es intencional en el
 * Sprint 1: cuando exista el catalogo van a salir de la base de datos
 * (Sprint 2) y este archivo pasa a ser un simple consumidor del servicio.
 */
export const enlacesNav = [
  { href: "/catalogo", etiqueta: "Catalogo" },
  { href: "/catalogo?categoria=deportivas", etiqueta: "Deportivas" },
  { href: "/catalogo?categoria=urbanas", etiqueta: "Urbanas" },
  { href: "/catalogo?categoria=accesorios", etiqueta: "Accesorios" },
  { href: "/catalogo?categoria=kits", etiqueta: "Kits" },
] as const;

export function Logo() {
  return (
    <Link
      href="/"
      className="text-xl font-bold tracking-tight text-marca"
      aria-label="Sneaker, inicio"
    >
      SNEAKER
    </Link>
  );
}

export function EnlacesNav({ className }: { className?: string }) {
  return (
    <ul className={className}>
      {enlacesNav.map((enlace) => (
        <li key={enlace.href}>
          <Link
            href={enlace.href}
            className="text-sm text-texto hover:text-acento transition-colors"
          >
            {enlace.etiqueta}
          </Link>
        </li>
      ))}
    </ul>
  );
}
