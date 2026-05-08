"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ExpiryAlertItem {
  lote_id: number;
  product_name: string;
  expiry_date: string;
  days_left: number;
  remaining_quantity: number;
  total_value: number;
  alert_type:
    | "expired"
    | "expires_today"
    | "expires_7"
    | "expires_15"
    | "expires_30";
}

const AlertsPage = () => {
  const [alerts, setAlerts] = useState<ExpiryAlertItem[]>([]);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/alerts/expiry`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      setAlerts(await response.json());
    }
  };

  const getAlertBadge = (type: string, daysLeft: number) => {
    switch (type) {
      case "expired":
        return (
          <span className="bg-red-200 text-red-900 text-xs font-bold px-2.5 py-1 rounded border border-red-500 shadow-sm animate-pulse">
            ¡VENCIDO!
          </span>
        );
      case "expires_today":
        return (
          <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded shadow-sm animate-pulse">
            ¡Vence HOY!
          </span>
        );
      case "expires_7":
        return (
          <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded border border-orange-400 shadow-sm">
            En {daysLeft} días
          </span>
        );
      case "expires_15":
        return (
          <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-1 rounded border border-yellow-400">
            En {daysLeft} días
          </span>
        );
      case "expires_30":
        return (
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-1 rounded border border-green-400">
            En {daysLeft} días
          </span>
        );
      default:
        return <span>{daysLeft} días</span>;
    }
  };

  const formatCurrency = (val: number) => `Bs. ${val.toLocaleString("es-BO")}`;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-red-600 flex items-center gap-2">
          <span>🔔</span> Panel de Alertas de Vencimiento
        </h2>
      </div>

      <div className="rounded-md border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground font-medium border-b border-border">
            <tr>
              <th className="p-4">Alerta</th>
              <th className="p-4">Producto</th>
              <th className="p-4">Lote ID</th>
              <th className="p-4">Fecha Vencimiento</th>
              <th className="p-4">Stock en Riesgo</th>
              <th className="p-4">Valor Económico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {alerts.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-muted-foreground text-lg"
                >
                  🎉 ¡Excelente! No tienes productos próximos a vencer en los
                  siguientes 30 días.
                </td>
              </tr>
            ) : (
              alerts.map((alert, idx) => (
                <tr key={idx} className="hover:bg-muted/50 transition-colors">
                  <td className="p-4">
                    {getAlertBadge(alert.alert_type, alert.days_left)}
                  </td>
                  <td className="p-4 font-semibold text-foreground">
                    {alert.product_name}
                  </td>
                  <td className="p-4 font-mono text-xs text-muted-foreground">
                    {alert.lote_id}
                  </td>
                  <td className="p-4">
                    {format(
                      new Date(
                        alert.expiry_date.includes("T")
                          ? alert.expiry_date
                          : alert.expiry_date + "T12:00:00",
                      ),
                      "dd/MMM/yyyy",
                      { locale: es },
                    )}
                  </td>
                  <td className="p-4 font-medium">
                    {alert.remaining_quantity} uds
                  </td>
                  <td className="p-4 font-bold text-red-600">
                    {formatCurrency(alert.total_value)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlertsPage;
