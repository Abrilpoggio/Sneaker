import Link from "next/link";

/**
 * Footer reconstruido desde el mockup de Figma.
 *
 * Fuente: `Footer`, 1280 x 366 px, en `Page 1 / Reutilizables`.
 * Fondo #2C2C2C. Estructura del archivo:
 *   logo          circulo 226 x 226 (imagen)
 *   wordmark      SNEAKERS 397 x 56, "A" en #CF1A1F
 *   Categorias    titulo 32px/600 + lista 24px/400, gap 30
 *   Contactanos   titulo 32px/600 + lista 24px/400, gap 30
 *
 * Medidas y tipografia tomadas del archivo, no aproximadas.
 */

const CATEGORIAS = ["Urbanas", "Deportivas", "Medias", "Accesorios"];
const CONTACTOS = [
  { label: "Whatsapp", href: "https://wa.me/5490000000000" },
  { label: "Instagram", href: "https://instagram.com/" },
];

export function Footer() {
  return (
    <footer className="mt-auto w-full bg-[#2C2C2C]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 py-12 md:flex-row md:items-start md:gap-16">
        {/* Logo: circulo 226 x 226 + wordmark 397 x 56 */}
        <div className="flex shrink-0 flex-col items-center gap-6 md:items-start">
          <span
            aria-hidden
            className="flex h-[226px] w-[226px] items-center justify-center rounded-full bg-white"
          >
            <span className="h-[174px] w-[131px] rounded-full bg-[#F5F5F5]" />
          </span>
          <span className="text-4xl font-extrabold tracking-tight text-[#F5F5F5]">
            SNE<span className="text-[#CF1A1F]">A</span>KERS
          </span>
        </div>

        {/* Categorias: titulo 32px/600, lista 24px/400, gap 30 */}
        <nav aria-label="Categorias del pie" className="flex flex-col gap-[30px]">
          <h2 className="text-[32px] font-semibold leading-[39px] text-white">Categorias</h2>
          <ul className="flex flex-col gap-[2px]">
            {CATEGORIAS.map((c) => (
              <li key={c}>
                <Link
                  href={`/catalogo?categoria=${c.toLowerCase()}`}
                  className="block text-2xl font-normal leading-[29px] text-white transition-opacity hover:opacity-70"
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contactanos: titulo 32px/600, lista 24px/400, gap 30 */}
        <div className="flex flex-col gap-[30px]">
          <h2 className="text-[32px] font-semibold leading-[39px] text-white">Contactanos</h2>
          <ul className="flex flex-col gap-[15px]">
            {CONTACTOS.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-2xl font-normal leading-[29px] text-white transition-opacity hover:opacity-70"
                >
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto w-full max-w-[1280px] px-4 py-4 text-sm text-white/60">
          © {new Date().getFullYear()} Sneaker · Proyecto academico, Taller de
          Integracion (UADER / FCyT)
        </p>
      </div>
    </footer>
  );
}