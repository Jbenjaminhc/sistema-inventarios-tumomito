"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Clock3,
  DollarSign,
  Info,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";

type ExpiryAlertItem = {
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
};

type KpiConfig = {
  key: string;
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  hint: string;
};

const formatMoney = (value: number) =>
  `Bs. ${new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 }).format(value)}`;

const ExpiryAlertsWidget = () => {
  const [alerts, setAlerts] = useState<ExpiryAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/alerts/expiry`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(
            detail || "No se pudieron cargar las alertas de vencimiento.",
          );
        }

        const data = await response.json();
        setAlerts(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        setAlerts([]);
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las alertas de vencimiento.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const metrics = useMemo(() => {
    const expired = alerts.filter(
      (alert) => alert.alert_type === "expired",
    ).length;
    const expiresToday = alerts.filter(
      (alert) => alert.alert_type === "expires_today",
    ).length;
    const expires7 = alerts.filter(
      (alert) => alert.alert_type === "expires_7",
    ).length;
    const expires15 = alerts.filter(
      (alert) => alert.alert_type === "expires_15",
    ).length;
    const expires30 = alerts.filter(
      (alert) => alert.alert_type === "expires_30",
    ).length;
    const totalValueRisk = alerts.reduce(
      (sum, alert) => sum + Number(alert.total_value || 0),
      0,
    );

    return {
      expired,
      expiresToday,
      expires7,
      expires15,
      expires30,
      totalValueRisk,
    };
  }, [alerts]);

  const kpis: KpiConfig[] = [
    {
      key: "expired",
      label: "Lotes vencidos",
      value: metrics.expired,
      color:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
      icon: <ShieldAlert className="h-4 w-4" />,
      hint: "Lotes cuyo vencimiento ya pasó.",
    },
    {
      key: "today",
      label: "Vencen hoy",
      value: metrics.expiresToday,
      color:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
      icon: <CalendarClock className="h-4 w-4" />,
      hint: "Lotes que vencen en el día actual.",
    },
    {
      key: "7",
      label: "< 7 días",
      value: metrics.expires7,
      color:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200",
      icon: <Clock3 className="h-4 w-4" />,
      hint: "Lotes con vencimiento en hasta 7 días.",
    },
    {
      key: "15",
      label: "< 15 días",
      value: metrics.expires15,
      color:
        "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-100",
      icon: <CalendarDays className="h-4 w-4" />,
      hint: "Lotes con vencimiento entre 8 y 15 días.",
    },
    {
      key: "30",
      label: "< 30 días",
      value: metrics.expires30,
      color:
        "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200",
      icon: <AlertTriangle className="h-4 w-4" />,
      hint: "Lotes con vencimiento entre 16 y 30 días.",
    },
    {
      key: "value",
      label: "Valor en riesgo",
      value: 0,
      color:
        "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100",
      icon: <DollarSign className="h-4 w-4" />,
      hint: "Suma del valor económico de los lotes en riesgo.",
    },
  ];

  return (
    <Card className="h-full border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
      <CardContent className="flex h-full flex-col p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-300">
                <ShieldAlert className="h-4 w-4" />
              </span>
              Alertas ejecutivas
            </div>
            <h3 className="mt-2 text-lg font-bold text-foreground">
              🔔 Alertas de Vencimiento
            </h3>
          </div>
          <Link
            href="/alerts/expiry"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Ver panel completo
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-lg border border-border/60 bg-muted/40"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <div className="max-w-xs space-y-2">
              <p className="text-sm font-medium text-foreground">
                No se pudieron cargar las alertas.
              </p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-gradient-to-br from-emerald-500/5 to-background px-4 py-8 text-center">
            <div className="max-w-xs space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Sin alertas
              </p>
              <p className="text-xs text-muted-foreground">
                No hay lotes vencidos ni próximos a vencer en los siguientes 30
                días.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {kpis.map((kpi) => (
                <div
                  key={kpi.key}
                  title={kpi.hint}
                  className={cn(
                    "rounded-lg border p-3 shadow-sm transition-transform hover:-translate-y-0.5",
                    kpi.color,
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide">
                    <span>{kpi.label}</span>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/70 text-current">
                      {kpi.icon}
                    </span>
                  </div>
                  <div className="text-2xl font-bold leading-none">
                    {kpi.key === "value"
                      ? formatMoney(metrics.totalValueRisk)
                      : kpi.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Info className="h-3.5 w-3.5" />
                Estado del riesgo
              </span>
              <span className="ml-2">
                {alerts.length} lotes monitoreados en esta ventana de 30 días.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpiryAlertsWidget;
