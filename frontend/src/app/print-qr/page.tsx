"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api";
import { QRCodeCanvas } from "qrcode.react";

interface Product {
  id: number;
  code: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  quantity?: number;
}

const PrintQrLabels = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [labelSize, setLabelSize] = useState(100);
  const printRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    handleFilter(search);
  }, [search, products]);

  const fetchProducts = async () => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setProducts(data);
    setFilteredProducts(data);
    setCurrentPage(1);
  };

  const handleFilter = (query: string) => {
    const q = query.toLowerCase();
    const result = products.filter(
      (p) => (p.name?.toLowerCase() || "").includes(q) || (p.code?.toLowerCase() || "").includes(q)
    );
    setFilteredProducts(result);
    setCurrentPage(1);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    window.print();
  };

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProductsForTable = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
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
      <h2 className="text-2xl font-bold mb-6">Imprimir Códigos QR</h2>

      {!selectedProduct ? (
        <>
          <Input
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />

          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left text-muted-foreground font-semibold">Código</th>
                  <th className="p-2 text-left text-muted-foreground font-semibold">Nombre</th>
                  <th className="p-2 text-left text-muted-foreground font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentProductsForTable.map((product) => (
                  <tr key={product.id} className="border-t border-border hover:bg-muted/40 transition-colors">
                    <td className="p-2">{product.code}</td>
                    <td className="p-2">{product.name}</td>
                    <td className="p-2">
                      <Button variant="default" onClick={() => handleSelectProduct(product)}>
                        Seleccionar
                      </Button>
                    </td>
                  </tr>
                ))}

                {currentProductsForTable.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={3}>
                      Sin resultados
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
        </>
      ) : (
        <div className="flex gap-6">
          <div className="w-1/3 space-y-4">
            <h3 className="text-xl font-semibold">Configuración</h3>
            <p><strong>Producto:</strong> {selectedProduct.name}</p>
            <p><strong>Código:</strong> {selectedProduct.code}</p>

            <div>
              <label className="text-sm font-medium">Cantidad de etiquetas</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="w-32"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tamaño (px)</label>
              <Input
                type="number"
                min={50}
                value={labelSize}
                onChange={(e) => setLabelSize(parseInt(e.target.value))}
                className="w-32"
              />
            </div>

            <Button onClick={handlePrint}>Imprimir</Button>
            <Button variant="outline" onClick={() => setSelectedProduct(null)}>Buscar otro producto</Button>
          </div>

          {/* En pantalla: card. En impresión: blanco garantizado por CSS */}
          <div
            className="w-2/3 rounded-md border border-border bg-card p-4 shadow"
            ref={printRef}
            id="print-area"
          >
            <h3 className="text-center font-semibold mb-4">Vista Previa</h3>
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${labelSize}px, 1fr))` }}
            >
              {Array.from({ length: quantity }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center border border-border p-2 rounded bg-background"
                  style={{ width: `${labelSize}px`, height: `${labelSize + 30}px` }}
                >
                  <QRCodeCanvas value={selectedProduct.code} size={labelSize} />
                  <span className="text-xs mt-1 text-center">{selectedProduct.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10px;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintQrLabels;
