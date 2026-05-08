"use client";

import { useState, useEffect } from "react";
import { PackageOpen } from "lucide-react";

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [filter, setFilter] = useState("all"); // "all", "expired", "expiring_soon"

  useEffect(() => {
    const fetchBatches = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://127.0.0.1:8000/api/batches", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setBatches(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchBatches();
  }, []);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const isBatchExpired = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return false;
    const expiryStr = expiryDateStr.includes("T")
      ? expiryDateStr
      : `${expiryDateStr}T12:00:00`;
    const expiry = new Date(expiryStr);
    expiry.setHours(0, 0, 0, 0);
    return expiry <= now;
  };

  const filteredBatches = batches.filter((b) => {
    if (filter === "all") return true;
    if (!b.expiry_date) return false;

    const expiryStr = b.expiry_date.includes("T")
      ? b.expiry_date
      : `${b.expiry_date}T12:00:00`;
    const expiry = new Date(expiryStr);
    expiry.setHours(0, 0, 0, 0);

    if (filter === "expired") return expiry <= now;
    if (filter === "expiring_soon")
      return expiry > now && expiry <= thirtyDaysFromNow;

    return true;
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageOpen className="w-6 h-6" /> Lotes de Inventario (Batches)
          </h1>
          <p className="text-muted-foreground mt-1">
            Control detallado de existencias por lote ingresado
          </p>
        </div>

        <div className="flex bg-muted p-1 rounded-md">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${filter === "all" ? "bg-card shadow-sm font-medium text-foreground" : "text-muted-foreground hover:bg-background/80"}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter("expired")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${filter === "expired" ? "bg-card shadow-sm font-medium text-red-600" : "text-muted-foreground hover:bg-background/80"}`}
          >
            Vencidos
          </button>
          <button
            onClick={() => setFilter("expiring_soon")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${filter === "expiring_soon" ? "bg-card shadow-sm font-medium text-yellow-600" : "text-muted-foreground hover:bg-background/80"}`}
          >
            Vencen en &lt; 30 días
          </button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow overflow-x-auto border border-border">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                ID Lote
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Producto
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Fecha Ingreso
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Fecha Vencimiento
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground text-right">
                Cant. Inicial
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground text-right">
                Cant. Restante
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground text-right">
                Costo Unit.
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground text-center">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredBatches.map((b: any) => (
              <tr
                key={b.id}
                className="border-b border-border hover:bg-muted/40"
              >
                <td className="p-4 font-mono text-sm">
                  LOTE-{b.id.toString().padStart(4, "0")}
                </td>
                <td className="p-4 font-medium">{b.product_name}</td>
                <td className="p-4">
                  {new Date(b.received_at).toLocaleDateString()}
                </td>
                <td className="p-4">
                  {b.expiry_date ? (
                    <span
                      className={
                        isBatchExpired(b.expiry_date)
                          ? "text-red-600 font-medium"
                          : ""
                      }
                    >
                      {new Date(
                        b.expiry_date.includes("T")
                          ? b.expiry_date
                          : `${b.expiry_date}T12:00:00`,
                      ).toLocaleDateString()}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-4 text-right">{b.quantity}</td>
                <td className="p-4 text-right font-bold text-primary">
                  {b.remaining_quantity}
                </td>
                <td className="p-4 text-right">
                  Bs. {b.unit_cost.toLocaleString("es-BO")}
                </td>
                <td className="p-4 text-center">
                  {isBatchExpired(b.expiry_date) ? (
                    <span
                      title="Lote vencido — no se puede despachar"
                      className="cursor-not-allowed inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10"
                    >
                      BLOQUEADO
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      ACTIVO
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBatches.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No hay lotes que coincidan con el filtro.
          </div>
        )}
      </div>
    </div>
  );
}
