"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { API_BASE } from "@/lib/api";

interface Dispatch {
  id: number;
  order_number: string;
  tracking_number: string;
  carrier: string;
  created_at: string;
  operator: string;
  total_products: number;
}

interface DispatchProduct {
  product_id: number;
  code: string;
  name: string;
  quantity: number;
}

const ITEMS_PER_PAGE = 10;

const DispatchesPage = () => {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [filteredDispatches, setFilteredDispatches] = useState<Dispatch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const [productDetails, setProductDetails] = useState<DispatchProduct[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchDispatches();
  }, []);

  useEffect(() => {
    applyFiltersLocally();
  }, [searchQuery, startDate, endDate, dispatches]);

  const fetchDispatches = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE}/dispatches/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      setDispatches(data);
    } catch (err) {
      setError("Ocurrió un error al cargar los despachos.");
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersLocally = () => {
    const q = searchQuery.toLowerCase();
    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

    const result = dispatches.filter((dispatch) => {
      const matchesSearch =
        (dispatch.order_number?.toLowerCase() || "").includes(q) ||
        (dispatch.tracking_number?.toLowerCase() || "").includes(q) ||
        (dispatch.operator?.toLowerCase() || "").includes(q) ||
        (dispatch.carrier?.toLowerCase() || "").includes(q);

      const dispatchDate = new Date(dispatch.created_at).getTime();
      const matchesDate = (!start || dispatchDate >= start) && (!end || dispatchDate <= end);

      return matchesSearch && matchesDate;
    });

    setFilteredDispatches(result);
    setCurrentPage(1);
  };

  const fetchDetail = async (dispatch: Dispatch) => {
    try {
      setProductDetails(null);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/dispatches/${dispatch.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setProductDetails(data.products);
      setSelectedDispatch(dispatch);
    } catch {
      setProductDetails([]);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredDispatches);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Despachos");
    XLSX.writeFile(workbook, "historial_despachos.xlsx");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
  };

  const indexOfLastDispatch = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstDispatch = indexOfLastDispatch - ITEMS_PER_PAGE;
  const currentDispatches = filteredDispatches.slice(indexOfFirstDispatch, indexOfLastDispatch);

  const totalPages = Math.ceil(filteredDispatches.length / ITEMS_PER_PAGE);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const getPaginationNumbers = () => {
    const maxPagesToShow = 5;
    const pages = [];
    let startPage: number, endPage: number;

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

    for (let i = startPage; i <= endPage; i++) pages.push(i);

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Historial de Órdenes de Despacho</h2>

      <div className="flex flex-wrap gap-4 mb-6">
        <Input
          placeholder="Buscar por número de orden, guía u operador"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-80"
        />
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-48" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-48" />
        <Button onClick={applyFiltersLocally}>Buscar</Button>
        <Button variant="outline" onClick={clearFilters}>Limpiar</Button>
        <Button variant="default" onClick={exportToExcel}>Exportar a Excel</Button>
      </div>

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left text-muted-foreground font-semibold">Orden</th>
              <th className="p-2 text-left text-muted-foreground font-semibold">Guía</th>
              <th className="p-2 text-left text-muted-foreground font-semibold">Transportadora</th>
              <th className="p-2 text-left text-muted-foreground font-semibold">Fecha</th>
              <th className="p-2 text-left text-muted-foreground font-semibold">Operador</th>
              <th className="p-2 text-left text-muted-foreground font-semibold">Productos</th>
              <th className="p-2 text-left text-muted-foreground font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={7}>Cargando...</td>
              </tr>
            ) : currentDispatches.length > 0 ? (
              currentDispatches.map((dispatch) => (
                <tr key={dispatch.id} className="border-t border-border hover:bg-muted/40 transition-colors">
                  <td className="p-2">{dispatch.order_number}</td>
                  <td className="p-2">{dispatch.tracking_number}</td>
                  <td className="p-2">{dispatch.carrier}</td>
                  <td className="p-2">{format(new Date(dispatch.created_at), "yyyy-MM-dd HH:mm")}</td>
                  <td className="p-2">{dispatch.operator}</td>
                  <td className="p-2">{dispatch.total_products}</td>
                  <td className="p-2">
                    <Button size="sm" variant="outline" onClick={() => fetchDetail(dispatch)}>
                      Ver Detalle
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={7}>
                  No se encontraron resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          <Button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} variant="outline">
            Anterior
          </Button>

          {getPaginationNumbers().map((pageNumber, index) =>
            pageNumber === "..." ? (
              <span key={`ellipsis-${index}`} className="px-2 py-1 text-muted-foreground">...</span>
            ) : (
              <Button
                key={pageNumber}
                onClick={() => paginate(pageNumber as number)}
                variant={currentPage === pageNumber ? "default" : "outline"}
              >
                {pageNumber}
              </Button>
            )
          )}

          <Button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} variant="outline">
            Siguiente
          </Button>
        </div>
      )}

      <Dialog open={selectedDispatch !== null} onOpenChange={() => setSelectedDispatch(null)}>
        <DialogContent>
          <DialogTitle>Detalle de Orden {selectedDispatch?.order_number}</DialogTitle>

          {Array.isArray(productDetails) && productDetails.length > 0 ? (
            <div className="overflow-x-auto mt-2 rounded-md border border-border bg-card">
              <table className="min-w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left text-muted-foreground font-semibold">Código</th>
                    <th className="px-4 py-2 text-left text-muted-foreground font-semibold">Nombre</th>
                    <th className="px-4 py-2 text-left text-muted-foreground font-semibold">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {productDetails.map((item, index) => (
                    <tr key={index} className="border-t border-border hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-2">{item.code}</td>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">No hay productos registrados.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DispatchesPage;
