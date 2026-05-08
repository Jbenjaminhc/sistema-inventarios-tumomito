// src/app/scan/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { API_BASE, authHeaders } from "@/lib/api";
import { toast } from "sonner";

type Product = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  price: number;
  stock: number;
  category?: { id: number; name: string } | null;
};

export default function ScanPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("code") || "";
  const [code, setCode] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const fetchByCode = async (c: string) => {
    const clean = c.trim();
    if (!clean) return;
    setLoading(true);
    setProduct(null);

    try {
      const res = await fetch(
        `${API_BASE}/products/by-code/${encodeURIComponent(clean)}`,
        {
          headers: { "Content-Type": "application/json", ...authHeaders() },
        },
      );

      if (!res.ok) {
        if (res.status === 404)
          toast.error("No existe un producto con ese código");
        else toast.error("No se pudo consultar el producto");
        return;
      }
      setProduct(await res.json());
    } catch (e) {
      console.error(e);
      toast.error("Error consultando el producto");
    } finally {
      setLoading(false);
    }
  };

  const onSearch = async () => fetchByCode(code);

  const goDispatch = () => {
    if (!product) return;
    router.push(`/dispatches?code=${encodeURIComponent(product.code)}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Escanear QR / Código</h1>
        <p className="text-sm text-muted-foreground">
          Puedes usar un lector QR tipo pistola (actúa como teclado) o escribir
          el código manualmente.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <Input
          ref={inputRef}
          placeholder="Escanea o escribe el código (ej: KAR-0001)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
        <Button onClick={onSearch} disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </div>

      {product && (
        <div className="bg-card text-card-foreground rounded-md border border-border p-4 space-y-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold">{product.name}</h2>
              <div className="text-sm text-muted-foreground">
                Código: {product.code}
              </div>
            </div>
            <Button onClick={goDispatch}>Ir a Despachos</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Categoría</div>
              <div className="font-medium">{product.category?.name || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Stock</div>
              <div className="font-medium">{product.stock}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Precio</div>
              <div className="font-medium">
                Bs. {product.price.toLocaleString("es-BO")}
              </div>
            </div>
          </div>

          {product.description && (
            <p className="text-sm text-muted-foreground">
              {product.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
