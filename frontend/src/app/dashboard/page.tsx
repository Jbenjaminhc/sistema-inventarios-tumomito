"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { API_BASE } from "@/lib/api";
import ExpiryAlertsWidget from "./components/ExpiryAlertsWidget";

interface ProductDispatch {
  code: string;
  name: string;
  quantity: number;
}

interface StockAlert {
  code: string;
  name: string;
  stock: number;
}

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("today");
  const [topProducts, setTopProducts] = useState<ProductDispatch[] | null>(
    null,
  );
  const [dispatchCount, setDispatchCount] = useState<number | null>(null);
  const [lowStock, setLowStock] = useState<StockAlert[] | null>(null);

  // Estados para la paginación de productos con bajo stock
  const [currentLowStockPage, setCurrentLowStockPage] = useState(1);
  const [lowStockPerPage] = useState(5); // Puedes ajustar la cantidad de elementos por página

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const range = activeTab === "today" ? "today" : "month";
        const res = await fetch(
          `${API_BASE}/dashboard/summary?range=${range}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        setTopProducts(data.top_products || []);
        setDispatchCount(data.total_dispatches ?? 0);
        setLowStock(data.low_stock || []);
        setCurrentLowStockPage(1); // Resetear a la primera página al cargar nuevos datos
      } catch (err) {
        setTopProducts([]);
        setDispatchCount(0);
        setLowStock([]);
        console.error("Error al cargar los datos del dashboard:", err);
      }
    };

    fetchData();
  }, [activeTab]);

  // Lógica para la paginación de productos con bajo stock
  const indexOfLastLowStock = currentLowStockPage * lowStockPerPage;
  const indexOfFirstLowStock = indexOfLastLowStock - lowStockPerPage;
  const currentLowStockProducts = lowStock
    ? lowStock.slice(indexOfFirstLowStock, indexOfLastLowStock)
    : [];

  const totalLowStockPages = lowStock
    ? Math.ceil(lowStock.length / lowStockPerPage)
    : 0;

  const paginateLowStock = (pageNumber: number) =>
    setCurrentLowStockPage(pageNumber);

  // Lógica para mostrar los números de página de forma inteligente para el bajo stock
  const getLowStockPaginationNumbers = () => {
    const maxPagesToShow = 5; // Número máximo de páginas a mostrar
    const pages = [];
    let startPage: number, endPage: number;

    if (totalLowStockPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalLowStockPages;
    } else {
      const maxPagesBeforeCurrentPage = Math.floor(maxPagesToShow / 2);
      const maxPagesAfterCurrentPage = Math.ceil(maxPagesToShow / 2) - 1;

      if (currentLowStockPage <= maxPagesBeforeCurrentPage) {
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (
        currentLowStockPage + maxPagesAfterCurrentPage >=
        totalLowStockPages
      ) {
        startPage = totalLowStockPages - maxPagesToShow + 1;
        endPage = totalLowStockPages;
      } else {
        startPage = currentLowStockPage - maxPagesBeforeCurrentPage;
        endPage = currentLowStockPage + maxPagesAfterCurrentPage;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    const displayedPages = [];
    if (startPage > 1) {
      displayedPages.push(1);
      if (startPage > 2) {
        displayedPages.push("...");
      }
    }
    displayedPages.push(...pages);
    if (endPage < totalLowStockPages) {
      if (endPage < totalLowStockPages - 1) {
        displayedPages.push("...");
      }
      displayedPages.push(totalLowStockPages);
    }

    return displayedPages;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      <Tabs defaultValue="today" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="today">Hoy</TabsTrigger>
          <TabsTrigger value="month">Histórico mensual</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gráfica de productos despachados */}
            <Card className="md:col-span-1">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-2">
                  Productos de alta rotación (
                  {activeTab === "today" ? "hoy" : "mes"})
                </h3>
                {topProducts && topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={topProducts}
                      layout="vertical"
                      margin={{ left: 40 }}
                    >
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="quantity" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500">
                    No hay datos disponibles.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Total de despachos */}
            <Card className="md:col-span-1">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-2">
                  Total de despachos ({activeTab === "today" ? "hoy" : "mes"})
                </h3>
                <p className="text-4xl font-bold text-primary mt-6">
                  {dispatchCount !== null ? dispatchCount : "—"}
                </p>
              </CardContent>
            </Card>

            <ExpiryAlertsWidget />

            {/* Productos con bajo stock */}
            <Card className="md:col-span-3">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-2">
                  Productos con stock bajo
                </h3>
                {lowStock && lowStock.length > 0 ? (
                  <>
                    <ul className="text-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {currentLowStockProducts.map((item, i) => (
                        <li key={i} className="p-2 border rounded">
                          <strong>{item.name}</strong> ({item.code}) - Stock:{" "}
                          {item.stock}
                        </li>
                      ))}
                    </ul>
                    {/* Controles de paginación para bajo stock */}
                    {totalLowStockPages > 1 && ( // Mostrar paginación solo si hay más de una página
                      <div className="flex justify-center mt-4 space-x-2">
                        <Button
                          onClick={() =>
                            paginateLowStock(currentLowStockPage - 1)
                          }
                          disabled={currentLowStockPage === 1}
                          variant="outline"
                          size="sm"
                        >
                          Anterior
                        </Button>
                        {getLowStockPaginationNumbers().map(
                          (pageNumber, index) =>
                            pageNumber === "..." ? (
                              <span
                                key={`low-stock-ellipsis-${index}`}
                                className="px-2 py-1"
                              >
                                ...
                              </span>
                            ) : (
                              <Button
                                key={`low-stock-page-${pageNumber}`}
                                onClick={() =>
                                  paginateLowStock(pageNumber as number)
                                }
                                variant={
                                  currentLowStockPage === pageNumber
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                              >
                                {pageNumber}
                              </Button>
                            ),
                        )}
                        <Button
                          onClick={() =>
                            paginateLowStock(currentLowStockPage + 1)
                          }
                          disabled={currentLowStockPage === totalLowStockPages}
                          variant="outline"
                          size="sm"
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    Todos los productos están en niveles óptimos.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
