"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, X, Trash2, CheckCircle } from "lucide-react";

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({ supplier_id: "", po_number: "" });
  const [items, setItems] = useState([
    { product_id: "", quantity: 1, unit_cost: 0 },
  ]);

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [receiveItems, setReceiveItems] = useState<any[]>([]);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [ordersRes, suppliersRes, productsRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/purchase-orders", { headers }),
        fetch("http://127.0.0.1:8000/api/suppliers", { headers }),
        fetch("http://127.0.0.1:8000/api/products", { headers }),
      ]);

      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { product_id: "", quantity: 1, unit_cost: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items] as any[];
    newItems[index][field] = value;

    // Autocompletar costo unitario si selecciona un producto
    if (field === "product_id" && value) {
      const selectedProduct = products.find((p) => p.id.toString() === value);
      if (selectedProduct && newItems[index].unit_cost === 0) {
        newItems[index].unit_cost = selectedProduct.price;
      }
    }
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplier_id || !formData.po_number || items.length === 0) {
      alert("Por favor completa los datos generales.");
      return;
    }

    if (
      items.some((i) => !i.product_id || i.quantity <= 0 || i.unit_cost < 0)
    ) {
      alert("Por favor verifica las cantidades y costos de los productos.");
      return;
    }

    const payload = {
      supplier_id: parseInt(formData.supplier_id),
      po_number: formData.po_number,
      items: items.map((i) => ({
        product_id: parseInt(i.product_id),
        quantity: parseInt(i.quantity.toString()),
        unit_cost: parseFloat(i.unit_cost.toString()),
      })),
    };

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/purchase-orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        setIsModalOpen(false);
        setFormData({ supplier_id: "", po_number: "" });
        setItems([{ product_id: "", quantity: 1, unit_cost: 0 }]);
        fetchData();
      } else {
        const errorData = await response.json();
        alert(
          `Error al crear la orden: ${errorData.detail || "Verifica los datos"}`,
        );
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión");
    }
  };

  const handleCompleteOrder = (po: any) => {
    setSelectedPO(po);
    setReceiveItems(
      po.items.map((item: any) => ({
        purchase_item_id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        expiry_date: "",
      })),
    );
    setIsReceiveModalOpen(true);
  };

  const submitReceiveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    const payload = {
      items: receiveItems.map((ri) => ({
        purchase_item_id: ri.purchase_item_id,
        expiry_date: ri.expiry_date || null,
      })),
    };

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/purchase-orders/${selectedPO.id}/receive`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        setIsReceiveModalOpen(false);
        fetchData();
        alert("¡Mercadería recibida! Lotes generados exitosamente.");
      } else {
        const errorData = await response.json();
        alert(`Error al recibir la orden: ${errorData.detail}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Calcular total dinámico para el modal
  const modalTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_cost,
    0,
  );

  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" /> Órdenes de Compra
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva Orden
        </button>
      </div>

      <div className="bg-card rounded-lg shadow overflow-x-auto border border-border">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Nº Orden
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Fecha
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Total
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Estado
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground text-center">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o: any) => (
              <tr
                key={o.id}
                className="border-b border-border hover:bg-muted/40"
              >
                <td className="p-4 font-medium">{o.po_number}</td>
                <td className="p-4">
                  {new Date(
                    o.date.includes("T") ? o.date : `${o.date}T12:00:00`,
                  ).toLocaleDateString()}
                </td>
                <td className="p-4">Bs. {o.total.toLocaleString("es-BO")}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      o.status === "received" || o.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : o.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {o.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-center">
                  {o.status === "pending" && (
                    <button
                      onClick={() => handleCompleteOrder(o)}
                      className="text-indigo-600 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-md text-sm transition-colors flex items-center gap-1 mx-auto"
                      title="Recibir Mercadería"
                    >
                      <CheckCircle className="w-4 h-4" /> Recibir
                    </button>
                  )}
                  {(o.status === "received" || o.status === "completed") && (
                    <span className="text-muted-foreground text-sm">
                      Recibida
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No hay órdenes de compra registradas.
          </div>
        )}
      </div>

      {/* Modal Nueva Orden */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card text-card-foreground rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] border border-border">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-bold">Crear Orden de Compra</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="po-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Cabecera */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Proveedor *
                    </label>
                    <select
                      required
                      className="w-full border border-input bg-background rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.supplier_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplier_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Seleccione un proveedor...</option>
                      {suppliers
                        .filter((s) => s.status)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (NIT: {s.tax_id})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Número de Orden (Factura) *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ej. PO-2023-001"
                      className="w-full border border-input bg-background rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.po_number}
                      onChange={(e) =>
                        setFormData({ ...formData, po_number: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Detalle de Productos */}
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      Productos
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-sm bg-muted text-muted-foreground px-3 py-1 rounded-md hover:bg-muted/80 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Agregar Fila
                    </button>
                  </div>

                  <div className="border border-border rounded-md overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-3 text-sm font-medium text-muted-foreground">
                            Producto
                          </th>
                          <th className="p-3 text-sm font-medium text-muted-foreground w-24">
                            Cantidad
                          </th>
                          <th className="p-3 text-sm font-medium text-muted-foreground w-32">
                            Costo Unit.
                          </th>
                          <th className="p-3 text-sm font-medium text-muted-foreground w-32">
                            Subtotal
                          </th>
                          <th className="p-3 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index} className="border-t border-border">
                            <td className="p-2">
                              <select
                                required
                                className="w-full border border-input bg-background rounded px-2 py-1 text-sm outline-none"
                                value={item.product_id}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "product_id",
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="">Seleccionar...</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.code} - {p.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                required
                                type="number"
                                min="1"
                                className="w-full border border-input bg-background rounded px-2 py-1 text-sm outline-none text-center"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                              />
                            </td>
                            <td className="p-2">
                              <input
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full border border-input bg-background rounded px-2 py-1 text-sm outline-none text-right"
                                value={item.unit_cost}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "unit_cost",
                                    e.target.value,
                                  )
                                }
                              />
                            </td>
                            <td className="p-2 text-right font-medium text-foreground bg-muted/50">
                              Bs.{" "}
                              {(item.quantity * item.unit_cost).toLocaleString(
                                "es-BO",
                              )}
                            </td>
                            <td className="p-2 text-center">
                              {items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 px-4 py-3 rounded-md w-64 flex justify-between items-center">
                      <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                        Total Orden:
                      </span>
                      <span className="text-xl font-bold text-indigo-600">
                        Bs. {modalTotal.toLocaleString("es-BO")}
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-border bg-muted/60 flex justify-end gap-3 rounded-b-lg">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted transition-colors bg-background"
              >
                Cancelar
              </button>
              <button
                form="po-form"
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Crear Orden Pendiente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recepción con expiry_date */}
      {isReceiveModalOpen && selectedPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card text-card-foreground rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-border">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-bold">
                Recibir Mercadería - Orden {selectedPO.po_number}
              </h2>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                Ingresa la fecha de vencimiento para los lotes que lo requieran.
                Si no aplica, déjalo en blanco.
              </p>
              <form
                id="receive-form"
                onSubmit={submitReceiveOrder}
                className="space-y-4"
              >
                <table className="w-full text-left border border-border rounded-md">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-sm font-medium text-muted-foreground">
                        Producto
                      </th>
                      <th className="p-3 text-sm font-medium text-muted-foreground text-right">
                        Cantidad
                      </th>
                      <th className="p-3 text-sm font-medium text-muted-foreground">
                        Vencimiento
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiveItems.map((ri, index) => {
                      const prodName =
                        products.find((p) => p.id === ri.product_id)?.name ||
                        "Producto " + ri.product_id;
                      return (
                        <tr key={index} className="border-t border-border">
                          <td className="p-3 font-medium text-foreground">
                            {prodName}
                          </td>
                          <td className="p-3 text-right">{ri.quantity}</td>
                          <td className="p-3">
                            <input
                              type="date"
                              className="border border-input bg-background rounded-md px-3 py-1 focus:ring-indigo-500 outline-none"
                              value={ri.expiry_date}
                              onChange={(e) => {
                                const newRi = [...receiveItems];
                                newRi[index].expiry_date = e.target.value;
                                setReceiveItems(newRi);
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </form>
            </div>

            <div className="p-6 border-t border-border bg-muted/60 flex justify-end gap-3 rounded-b-lg">
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted transition-colors bg-background"
              >
                Cancelar
              </button>
              <button
                form="receive-form"
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Confirmar Recepción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
