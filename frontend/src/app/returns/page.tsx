"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { API_BASE } from "@/lib/api";

interface ReturnDispatchItem {
  product_id: number;
  product_name: string;
  code: string;
  batch_id: number;
  batch_expiry: string | null;
  unit_cost: number;
  quantity_despached: number;
}

interface ReturnHistoryItem extends ReturnDispatchItem {
  quantity_returned: number;
  total_cost: number;
  movement_reference?: string | null;
}

interface DispatchSearchResponse {
  dispatch_id: number;
  order_number: string;
  tracking_number: string;
  carrier: string | null;
  products: ReturnDispatchItem[];
}

interface ReturnRecord {
  id: number;
  dispatch_id?: number | null;
  tracking_number: string;
  carrier: string | null;
  created_by: string;
  created_at: string;
  observation: string | null;
  products: ReturnHistoryItem[];
}

interface EditableReturnItem extends ReturnDispatchItem {
  quantity_returned: number;
}

const ITEMS_PER_PAGE = 10;

const isExpiringSoon = (expiryDate: string | null) => {
  if (!expiryDate) return false;
  const expiry = new Date(
    expiryDate.includes("T") ? expiryDate : `${expiryDate}T12:00:00`,
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(today.getDate() + 30);
  expiry.setHours(0, 0, 0, 0);
  return expiry > today && expiry <= limit;
};

const ReturnsPage = () => {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [observation, setObservation] = useState("");
  const [dispatchDetail, setDispatchDetail] =
    useState<DispatchSearchResponse | null>(null);
  const [returnItems, setReturnItems] = useState<EditableReturnItem[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(
    null,
  );
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchReturns();
  }, []);

  const filteredReturns = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

    return returns.filter((ret) => {
      const matchesQuery =
        (ret.tracking_number?.toLowerCase() || "").includes(q) ||
        (ret.carrier?.toLowerCase() || "").includes(q) ||
        (ret.created_by?.toLowerCase() || "").includes(q) ||
        (ret.observation?.toLowerCase() || "").includes(q) ||
        ret.products.some((item) =>
          [item.product_name, item.code, String(item.batch_id)]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q),
        );

      const returnDate = new Date(ret.created_at).getTime();
      const inDateRange =
        (!start || returnDate >= start) && (!end || returnDate <= end);

      return matchesQuery && inDateRange;
    });
  }, [searchQuery, startDate, endDate, returns]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate]);

  const fetchReturns = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/returns/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setReturns(data);
    } catch (e: any) {
      setError("Error al cargar el historial de devoluciones: " + e.message);
      console.error("Error fetching returns:", e);
    }
  };

  const handleSearchGuide = async () => {
    if (!trackingNumber) return;
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `${API_BASE}/returns/${encodeURIComponent(trackingNumber)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.status === 404) {
        setDispatchDetail(null);
        setReturnItems([]);
        alert("No se encontró un despacho asociado a esa guía u orden.");
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
      }

      const data: DispatchSearchResponse = await res.json();
      setDispatchDetail(data);
      setReturnItems(
        data.products.map((item) => ({
          ...item,
          quantity_returned: 0,
        })),
      );
      setError("");
    } catch (e: any) {
      setError("Error al buscar la guía: " + e.message);
      console.error("Error searching guide:", e);
      setDispatchDetail(null);
      setReturnItems([]);
    }
  };

  const handleFinishReturn = async () => {
    if (!dispatchDetail || returnItems.length === 0) return;

    const validItems = returnItems
      .filter((item) => item.quantity_returned > 0)
      .map((item) => ({
        product_id: item.product_id,
        batch_id: item.batch_id,
        quantity: item.quantity_returned,
      }));

    if (validItems.length === 0) {
      alert("Ingresa al menos una cantidad devuelta mayor que cero.");
      return;
    }

    if (
      returnItems.some(
        (item) => item.quantity_returned > item.quantity_despached,
      )
    ) {
      alert("No se puede devolver más de lo despachado por lote.");
      return;
    }

    const token = localStorage.getItem("token");

    const payload = {
      dispatch_id: dispatchDetail.dispatch_id,
      tracking_number: dispatchDetail.tracking_number,
      observation,
      products: validItems,
    };

    try {
      const res = await fetch(`${API_BASE}/returns/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Devolución registrada exitosamente.");
        setTrackingNumber("");
        setObservation("");
        setDispatchDetail(null);
        setReturnItems([]);
        fetchReturns();
      } else {
        const errorData = await res.json();
        alert("Error: " + errorData.detail);
        console.error("Error al registrar devolución:", errorData);
        setError("Error al registrar la devolución: " + errorData.detail);
      }
    } catch (e: any) {
      setError("Error de conexión al registrar la devolución: " + e.message);
      console.error("Error al registrar devolución:", e);
    }
  };

  const exportToExcel = () => {
    const rows = filteredReturns.flatMap((ret) =>
      ret.products.map((item) => ({
        guia: ret.tracking_number,
        transportadora: ret.carrier,
        fecha: format(new Date(ret.created_at), "yyyy-MM-dd HH:mm"),
        operador: ret.created_by,
        producto: item.product_name,
        codigo: item.code,
        lote_devuelto: item.batch_id,
        vencimiento: item.batch_expiry
          ? format(new Date(item.batch_expiry), "yyyy-MM-dd")
          : "",
        costo_unitario: item.unit_cost,
        cantidad: item.quantity_returned,
        valor_total_devuelto: item.total_cost,
        referencia_kardex: item.movement_reference,
      })),
    );

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Devoluciones");
    XLSX.writeFile(workbook, "historial_devoluciones_lote.xlsx");
  };

  const indexOfLastReturn = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstReturn = indexOfLastReturn - ITEMS_PER_PAGE;
  const currentReturnsForTable = filteredReturns.slice(
    indexOfFirstReturn,
    indexOfLastReturn,
  );
  const totalPages = Math.ceil(filteredReturns.length / ITEMS_PER_PAGE);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const getPaginationNumbers = () => {
    const maxPagesToShow = 5;
    const pages: number[] = [];
    let startPage: number;
    let endPage: number;

    if (totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const maxPagesBeforeCurrentPage = Math.floor(maxPagesToShow / 2);
      const maxPagesAfterCurrentPage = Math.ceil(maxPagesToShow / 2) - 1;

      if (currentPage <= maxPagesBeforeCurrentPage) {
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
        startPage = totalPages - maxPagesToShow + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - maxPagesBeforeCurrentPage;
        endPage = currentPage + maxPagesAfterCurrentPage;
      }
    }

    for (let i = startPage; i <= endPage; i += 1) pages.push(i);

    const displayedPages: (number | "...")[] = [];
    if (startPage > 1) {
      displayedPages.push(1);
      if (startPage > 2) displayedPages.push("...");
    }
    displayedPages.push(...pages);
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) displayedPages.push("...");
      displayedPages.push(totalPages);
    }
    return displayedPages;
  };

  const totalReturnValue = returnItems.reduce(
    (sum, item) => sum + item.quantity_returned * item.unit_cost,
    0,
  );

  return (
    <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-7xl mx-auto">
      {error && (
        <div className="text-destructive mb-4 xl:col-span-2">{error}</div>
      )}

      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <h2 className="text-xl font-bold mb-4">
          Registrar Devolución por Lote
        </h2>
        <div className="space-y-3">
          <Input
            placeholder="Escanea o escribe número de guía"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchGuide()}
          />
          <Button onClick={handleSearchGuide}>Buscar despacho</Button>
        </div>

        {dispatchDetail && (
          <div className="mt-5 space-y-4">
            <div className="rounded-md border border-border bg-muted/40 p-4 text-sm space-y-1">
              <p>
                <span className="font-semibold">Orden:</span>{" "}
                {dispatchDetail.order_number}
              </p>
              <p>
                <span className="font-semibold">Guía:</span>{" "}
                {dispatchDetail.tracking_number}
              </p>
              <p>
                <span className="font-semibold">Transportadora:</span>{" "}
                {dispatchDetail.carrier || "-"}
              </p>
            </div>

            <div>
              <h3 className="text-md font-semibold mb-2">
                Productos y lotes despachados
              </h3>
              <div className="overflow-x-auto rounded-md border border-border bg-card">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left text-muted-foreground font-semibold">
                        Producto
                      </th>
                      <th className="p-2 text-left text-muted-foreground font-semibold">
                        Lote
                      </th>
                      <th className="p-2 text-left text-muted-foreground font-semibold">
                        Vencimiento
                      </th>
                      <th className="p-2 text-left text-muted-foreground font-semibold">
                        Costo Unit.
                      </th>
                      <th className="p-2 text-left text-muted-foreground font-semibold">
                        Cant. despachada
                      </th>
                      <th className="p-2 text-left text-muted-foreground font-semibold">
                        Cant. devuelta
                      </th>
                      <th className="p-2 text-left text-muted-foreground font-semibold">
                        Aviso
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnItems.map((item, index) => (
                      <tr
                        key={`${item.product_id}-${item.batch_id}`}
                        className="border-t border-border hover:bg-muted/40 transition-colors"
                      >
                        <td className="p-2">
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.code}
                          </div>
                        </td>
                        <td className="p-2 font-mono text-xs">
                          LOTE-{String(item.batch_id).padStart(4, "0")}
                        </td>
                        <td className="p-2">
                          {item.batch_expiry
                            ? format(new Date(item.batch_expiry), "yyyy-MM-dd")
                            : "-"}
                        </td>
                        <td className="p-2">
                          Bs. {item.unit_cost.toLocaleString("es-BO")}
                        </td>
                        <td className="p-2">{item.quantity_despached}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="0"
                            max={item.quantity_despached}
                            value={item.quantity_returned}
                            onChange={(e) => {
                              const next = [...returnItems];
                              const value =
                                e.target.value === ""
                                  ? 0
                                  : parseInt(e.target.value, 10);
                              next[index].quantity_returned = Number.isNaN(
                                value,
                              )
                                ? 0
                                : value;
                              setReturnItems(next);
                            }}
                            className="w-28"
                          />
                        </td>
                        <td className="p-2">
                          {isExpiringSoon(item.batch_expiry) && (
                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                              Vence pronto
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block mb-1 text-sm">Observación</label>
                <Input
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                />
              </div>

              <div className="rounded-md border border-border bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">
                  Valor total devuelto
                </p>
                <p className="text-2xl font-bold text-foreground">
                  Bs. {totalReturnValue.toLocaleString("es-BO")}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleFinishReturn} variant="default">
                Finalizar devolución
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTrackingNumber("");
                  setDispatchDetail(null);
                  setReturnItems([]);
                  setObservation("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold">Historial de Devoluciones</h2>
          <Button variant="outline" onClick={exportToExcel}>
            Exportar Excel
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Input
            placeholder="Buscar por guía, operador, producto o lote"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="overflow-auto rounded-md border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left text-muted-foreground font-semibold">
                  Guía
                </th>
                <th className="p-2 text-left text-muted-foreground font-semibold">
                  Producto
                </th>
                <th className="p-2 text-left text-muted-foreground font-semibold">
                  Lote devuelto
                </th>
                <th className="p-2 text-left text-muted-foreground font-semibold">
                  Costo unitario
                </th>
                <th className="p-2 text-left text-muted-foreground font-semibold">
                  Cantidad
                </th>
                <th className="p-2 text-left text-muted-foreground font-semibold">
                  Valor total devuelto
                </th>
                <th className="p-2 text-left text-muted-foreground font-semibold">
                  Fecha
                </th>
                <th className="p-2 text-left text-muted-foreground font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {currentReturnsForTable.length > 0 ? (
                currentReturnsForTable.flatMap((ret) =>
                  ret.products.map((item, itemIndex) => (
                    <tr
                      key={`${ret.id}-${item.batch_id}-${itemIndex}`}
                      className="border-t border-border hover:bg-muted/40 transition-colors"
                    >
                      <td className="p-2">{ret.tracking_number}</td>
                      <td className="p-2">
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.code}
                        </div>
                      </td>
                      <td className="p-2 font-mono text-xs">
                        LOTE-{String(item.batch_id).padStart(4, "0")}
                      </td>
                      <td className="p-2">
                        Bs. {item.unit_cost.toLocaleString("es-BO")}
                      </td>
                      <td className="p-2">{item.quantity_returned}</td>
                      <td className="p-2">
                        Bs. {item.total_cost.toLocaleString("es-BO")}
                      </td>
                      <td className="p-2">
                        {format(new Date(ret.created_at), "yyyy-MM-dd HH:mm")}
                      </td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedReturn(ret)}
                        >
                          Ver detalle
                        </Button>
                      </td>
                    </tr>
                  )),
                )
              ) : (
                <tr>
                  <td
                    className="p-4 text-center text-muted-foreground"
                    colSpan={8}
                  >
                    No se encontraron resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            <Button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
            >
              Anterior
            </Button>

            {getPaginationNumbers().map((pageNumber, index) =>
              pageNumber === "..." ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-1 text-muted-foreground"
                >
                  ...
                </span>
              ) : (
                <Button
                  key={pageNumber}
                  onClick={() => paginate(pageNumber as number)}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                >
                  {pageNumber}
                </Button>
              ),
            )}

            <Button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="outline"
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>

      <Dialog
        open={selectedReturn !== null}
        onOpenChange={() => setSelectedReturn(null)}
      >
        <DialogContent>
          <DialogTitle>Detalle de devolución</DialogTitle>
          {selectedReturn && (
            <div className="space-y-4">
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>
                  Guía:{" "}
                  <span className="text-foreground">
                    {selectedReturn.tracking_number}
                  </span>
                </p>
                <p>
                  Transportadora:{" "}
                  <span className="text-foreground">
                    {selectedReturn.carrier || "-"}
                  </span>
                </p>
                <p>
                  Observación:{" "}
                  <span className="text-foreground">
                    {selectedReturn.observation || "-"}
                  </span>
                </p>
                <p>
                  Operador:{" "}
                  <span className="text-foreground">
                    {selectedReturn.created_by}
                  </span>
                </p>
                <p>
                  Fecha:{" "}
                  <span className="text-foreground">
                    {format(
                      new Date(selectedReturn.created_at),
                      "yyyy-MM-dd HH:mm",
                    )}
                  </span>
                </p>
              </div>

              <div className="overflow-auto rounded-md border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left text-muted-foreground font-semibold">
                        Producto
                      </th>
                      <th className="p-2 text-left text-muted-foreground font-semibold">
                        Lote original
                      </th>
                      <th className="p-2 text-left text-muted-foreground font-semibold">
                        Vencimiento
                      </th>
                      <th className="p-2 text-left text-muted-foreground font-semibold">
                        Cantidad devuelta
                      </th>
                      <th className="p-2 text-left text-muted-foreground font-semibold">
                        Costo unitario
                      </th>
                      <th className="p-2 text-left text-muted-foreground font-semibold">
                        Costo total
                      </th>
                      <th className="p-2 text-left text-muted-foreground font-semibold">
                        Kardex
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReturn.products.map((item, i) => (
                      <tr
                        key={`${item.batch_id}-${i}`}
                        className="border-t border-border"
                      >
                        <td className="p-2">
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.code}
                          </div>
                        </td>
                        <td className="p-2 font-mono text-xs">
                          LOTE-{String(item.batch_id).padStart(4, "0")}
                        </td>
                        <td className="p-2">
                          {item.batch_expiry
                            ? format(new Date(item.batch_expiry), "yyyy-MM-dd")
                            : "-"}
                        </td>
                        <td className="p-2">{item.quantity_returned}</td>
                        <td className="p-2">
                          Bs. {item.unit_cost.toLocaleString("es-BO")}
                        </td>
                        <td className="p-2">
                          Bs. {item.total_cost.toLocaleString("es-BO")}
                        </td>
                        <td className="p-2 text-xs font-mono text-muted-foreground">
                          {item.movement_reference || "RETURN"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReturnsPage;
