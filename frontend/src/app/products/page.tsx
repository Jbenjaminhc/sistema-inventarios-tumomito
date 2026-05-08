"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";

interface Product {
  id: number;
  code: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category_id?: number | null;
  category?: { id: number; name: string } | null;
  consumption_method?: string;
}

interface Category {
  id: number;
  name: string;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [consumptionMethod, setConsumptionMethod] = useState("PEPS");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);

  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [currentDescription, setCurrentDescription] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    })();
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
      (p) =>
        (p.name?.toLowerCase() || "").includes(q) ||
        (p.code?.toLowerCase() || "").includes(q) ||
        (p.description?.toLowerCase() || "").includes(q),
    );
    setFilteredProducts(result);
    setCurrentPage(1);
  };

  const handleAddProduct = async () => {
    const token = localStorage.getItem("token");
    await fetch(`${API_BASE}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code,
        name,
        description,
        price,
        stock,
        consumption_method: consumptionMethod,
        category_id: categoryId === "" ? null : categoryId,
      }),
    });
    fetchProducts();
    clearForm();
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;
    const token = localStorage.getItem("token");
    await fetch(`${API_BASE}/products/${selectedProduct.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code,
        name,
        description,
        price,
        stock,
        consumption_method: consumptionMethod,
        category_id: categoryId === "" ? null : categoryId,
      }),
    });
    fetchProducts();
    clearForm();
    setEditDialogOpen(false);
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${API_BASE}/products/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        alert("Error al eliminar el producto.");
        return;
      }
      fetchProducts();
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      alert("Error inesperado al eliminar el producto.");
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setCode(product.code);
    setName(product.name);
    setDescription(product.description);
    setPrice(product.price);
    setStock(product.stock);
    setConsumptionMethod(product.consumption_method || "PEPS");
    setCategoryId(product.category?.id ?? product.category_id ?? "");
    setEditDialogOpen(true);
  };

  const handlePrintQR = (code: string, name: string) => {
    const qrWindow = window.open("", "_blank");
    if (qrWindow) {
      qrWindow.document.write(`
        <html>
          <head><title>Imprimir QR</title></head>
          <body style="text-align:center; padding: 20px;">
            <h1 style="font-family: sans-serif;">${name}</h1>
            <canvas id="qrcode"></canvas>
            <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
            <script>
              window.onload = () => {
                QRCode.toCanvas(document.getElementById("qrcode"), "${code}", { width: 200 }, function (error) {
                  if (error) console.error(error);
                  window.print();
                });
              }
            </script>
          </body>
        </html>
      `);
      qrWindow.document.close();
    }
  };

  const handleExportToExcel = async () => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/products/export/xls/`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      alert("Error al exportar. Verifica permisos.");
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "productos.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearForm = () => {
    setSelectedProduct(null);
    setCode("");
    setName("");
    setDescription("");
    setPrice(0);
    setStock(0);
    setConsumptionMethod("PEPS");
    setCategoryId("");
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("es-BO", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct,
  );
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Productos</h2>
        <div className="flex gap-4">
          <Button onClick={handleExportToExcel}>Exportar a XLS</Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Añadir Producto</Button>
            </DialogTrigger>
            <DialogContent className="p-6">
              <DialogTitle className="text-lg font-semibold mb-4">
                Registrar Producto
              </DialogTitle>

              <label className="text-sm font-medium">Código</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mb-2"
              />

              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mb-2"
              />

              <label className="text-sm font-medium">Descripción</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mb-2"
              />

              <label className="text-sm font-medium">Categoría</label>
              <select
                className="mb-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={categoryId}
                onChange={(e) => {
                  const v = e.target.value;
                  setCategoryId(v === "" ? "" : parseInt(v));
                }}
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <label className="text-sm font-medium">Método de Consumo</label>
              <select
                className="mb-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={consumptionMethod}
                onChange={(e) => setConsumptionMethod(e.target.value)}
              >
                <option value="PEPS">
                  PEPS (Primero en Entrar, Primero en Salir)
                </option>
                <option value="FEFO">
                  FEFO (Primero en Vencer, Primero en Salir)
                </option>
              </select>

              <label className="text-sm font-medium">Precio</label>
              <Input
                type="number"
                value={price}
                onChange={(e) => {
                  const v = e.target.value;
                  setPrice(v === "" ? 0 : parseFloat(v));
                }}
                className="mb-2"
              />

              <label className="text-sm font-medium">Stock</label>
              <Input
                type="number"
                value={stock}
                onChange={(e) => {
                  const v = e.target.value;
                  setStock(v === "" ? 0 : parseInt(v, 10));
                }}
                className="mb-4"
              />

              <Button onClick={handleAddProduct}>Guardar</Button>
            </DialogContent>
          </Dialog>

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="p-6">
              <DialogTitle className="text-lg font-semibold mb-4">
                Editar Producto
              </DialogTitle>

              <label className="text-sm font-medium">Código</label>
              <Input
                value={code}
                disabled
                className="mb-2 bg-muted cursor-not-allowed"
              />

              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mb-2"
              />

              <label className="text-sm font-medium">Descripción</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mb-2"
              />

              <label className="text-sm font-medium">Categoría</label>
              <select
                className="mb-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={categoryId}
                onChange={(e) => {
                  const v = e.target.value;
                  setCategoryId(v === "" ? "" : parseInt(v));
                }}
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <label className="text-sm font-medium">Método de Consumo</label>
              <select
                className="mb-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={consumptionMethod}
                onChange={(e) => setConsumptionMethod(e.target.value)}
              >
                <option value="PEPS">
                  PEPS (Primero en Entrar, Primero en Salir)
                </option>
                <option value="FEFO">
                  FEFO (Primero en Vencer, Primero en Salir)
                </option>
              </select>

              <label className="text-sm font-medium">Precio</label>
              <Input
                type="number"
                value={price}
                onChange={(e) => {
                  const v = e.target.value;
                  setPrice(v === "" ? 0 : parseFloat(v));
                }}
                className="mb-2"
              />

              <label className="text-sm font-medium">Stock</label>
              <Input
                type="number"
                value={stock}
                onChange={(e) => {
                  const v = e.target.value;
                  setStock(v === "" ? 0 : parseInt(v, 10));
                }}
                className="mb-4"
              />

              <Button onClick={handleUpdateProduct}>Actualizar</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar por código, nombre o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left text-muted-foreground font-semibold">
                Código
              </th>
              <th className="p-2 text-left text-muted-foreground font-semibold">
                Nombre
              </th>
              <th className="p-2 text-left text-muted-foreground font-semibold">
                Categoría
              </th>
              <th className="p-2 text-left text-muted-foreground font-semibold">
                Descripción
              </th>
              <th className="p-2 text-left text-muted-foreground font-semibold">
                Motor
              </th>
              <th className="p-2 text-left text-muted-foreground font-semibold">
                Precio
              </th>
              <th className="p-2 text-left text-muted-foreground font-semibold">
                Stock
              </th>
              <th className="p-2 text-left text-muted-foreground font-semibold">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.map((product) => (
              <tr
                key={product.id}
                className="border-t border-border hover:bg-muted/40 transition-colors"
              >
                <td className="p-2">{product.code}</td>
                <td className="p-2">{product.name}</td>
                <td className="p-2">{product.category?.name ?? "-"}</td>
                <td className="p-2">
                  <Dialog
                    open={
                      descriptionModalOpen &&
                      currentDescription === product.description
                    }
                    onOpenChange={(isOpen) => {
                      setDescriptionModalOpen(isOpen);
                      if (!isOpen) setCurrentDescription("");
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentDescription(product.description);
                          setDescriptionModalOpen(true);
                        }}
                      >
                        Ver descripción
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogTitle>Descripción del Producto</DialogTitle>
                      <p>{product.description}</p>
                    </DialogContent>
                  </Dialog>
                </td>
                <td className="p-2 text-xs font-mono font-medium text-indigo-600">
                  {product.consumption_method || "PEPS"}
                </td>
                <td className="p-2">Bs. {formatPrice(product.price)}</td>
                <td className="p-2">
                  <span
                    className={
                      product.stock <= 0 ? "text-destructive font-bold" : ""
                    }
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="p-2 space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Ver QR</Button>
                    </DialogTrigger>
                    <DialogContent className="flex flex-col items-center text-center gap-4">
                      <DialogTitle className="text-xl font-semibold">
                        {product.name}
                      </DialogTitle>
                      <QRCodeCanvas value={product.code} size={150} />
                    </DialogContent>
                  </Dialog>

                  <Button
                    onClick={() => handlePrintQR(product.code, product.name)}
                  >
                    Imprimir QR
                  </Button>
                  <Button variant="outline" onClick={() => handleEdit(product)}>
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(product.id)}
                  >
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}

            {currentProducts.length === 0 && (
              <tr>
                <td
                  className="p-4 text-center text-muted-foreground"
                  colSpan={7}
                >
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
    </div>
  );
};

export default Products;
