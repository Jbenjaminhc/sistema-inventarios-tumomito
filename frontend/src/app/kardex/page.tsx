"use client";

import { useState, useEffect } from "react";
import { Activity } from "lucide-react";

export default function KardexPage() {
  const [movements, setMovements] = useState<any[]>([]);

  useEffect(() => {
    const fetchMovements = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://127.0.0.1:8000/api/kardex", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setMovements(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchMovements();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6" /> Kardex (Movimientos)
        </h1>
        <p className="text-muted-foreground mt-1">
          Historial de entradas y salidas del inventario
        </p>
      </div>

      <div className="bg-card rounded-lg shadow overflow-x-auto border border-border">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Fecha
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Tipo
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Producto
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Referencia
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground text-right">
                Cantidad
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground text-right">
                Costo Total
              </th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m: any) => (
              <tr
                key={m.id}
                className="border-b border-border hover:bg-muted/40"
              >
                <td className="p-4 text-sm">
                  {new Date(m.created_at).toLocaleString()}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      m.movement_type === "IN"
                        ? "bg-green-100 text-green-800"
                        : m.movement_type === "RETURN"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {m.movement_type === "IN"
                      ? "ENTRADA"
                      : m.movement_type === "RETURN"
                        ? "DEVOLUCIÓN"
                        : "SALIDA"}
                  </span>
                </td>
                <td className="p-4 font-medium">
                  {m.product_name || `Producto ${m.product_id}`}
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {m.reference_type.toUpperCase()} #{m.reference_id}
                </td>
                <td className="p-4 text-right font-medium">{m.quantity}</td>
                <td className="p-4 text-right">
                  Bs. {m.total_cost.toLocaleString("es-BO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {movements.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No hay movimientos registrados.
          </div>
        )}
      </div>
    </div>
  );
}
