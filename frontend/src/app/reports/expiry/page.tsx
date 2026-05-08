"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ExpiryReportItem {
  id: number;
  product_id: number;
  product_name: string;
  supplier_name: string | null;
  received_at: string;
  expiry_date: string;
  remaining_quantity: number;
  unit_cost: number;
  total_value: number;
  days_left: number;
  status: "expired" | "expiring_soon" | "healthy";
}

const ExpiryReportPage = () => {
  const [data, setData] = useState<ExpiryReportItem[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/reports/expiry`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.ok) {
      setData(await response.json());
    }
  };

  const getFilteredData = () => {
    switch (filter) {
      case "expired":
        return data.filter(item => item.days_left < 0);
      case "7days":
        return data.filter(item => item.days_left >= 0 && item.days_left <= 7);
      case "15days":
        return data.filter(item => item.days_left >= 0 && item.days_left <= 15);
      case "30days":
        return data.filter(item => item.days_left >= 0 && item.days_left <= 30);
      case "all":
      default:
        return data;
    }
  };

  const filteredData = getFilteredData();

  const getStatusBadge = (status: string, daysLeft: number) => {
    if (status === "expired") {
      return <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-red-400">Vencido</span>;
    }
    if (status === "expiring_soon") {
      return <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-orange-400">Próximo ({daysLeft} días)</span>;
    }
    return <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-green-400">Saludable ({daysLeft} días)</span>;
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Reporte de Lotes y Vencimientos</h2>
      </div>

      <div className="flex gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Todos</Button>
        <Button variant={filter === "expired" ? "destructive" : "outline"} onClick={() => setFilter("expired")}>Vencidos</Button>
        <Button variant={filter === "7days" ? "default" : "outline"} onClick={() => setFilter("7days")}>&lt; 7 días</Button>
        <Button variant={filter === "15days" ? "default" : "outline"} onClick={() => setFilter("15days")}>&lt; 15 días</Button>
        <Button variant={filter === "30days" ? "default" : "outline"} onClick={() => setFilter("30days")}>&lt; 30 días</Button>
      </div>

      <div className="rounded-md border border-border bg-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground font-medium">
            <tr>
              <th className="p-3">Lote ID</th>
              <th className="p-3">Producto</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3">F. Ingreso</th>
              <th className="p-3">F. Vencimiento</th>
              <th className="p-3">Stock Restante</th>
              <th className="p-3">Valor Restante</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredData.map(item => (
              <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                <td className="p-3 font-mono text-xs">{item.id}</td>
                <td className="p-3 font-medium">{item.product_name}</td>
                <td className="p-3 text-muted-foreground">{item.supplier_name || "-"}</td>
                <td className="p-3">{format(new Date(item.received_at), "dd/MMM/yyyy", { locale: es })}</td>
                <td className="p-3 font-semibold">{format(new Date(item.expiry_date.includes('T') ? item.expiry_date : item.expiry_date + "T12:00:00"), "dd/MMM/yyyy", { locale: es })}</td>
                <td className="p-3">{item.remaining_quantity}</td>
                <td className="p-3 font-medium">{formatCurrency(item.total_value)}</td>
                <td className="p-3">{getStatusBadge(item.status, item.days_left)}</td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">No hay lotes que coincidan con el filtro actual.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpiryReportPage;
