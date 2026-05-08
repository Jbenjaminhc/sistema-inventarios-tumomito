// src/app/dispatches/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { v4 as uuidv4 } from "uuid";

interface DispatchProduct {
  product_id: number;
  code: string;
  name: string;
  quantity: number;
}

const transportadoras = [
  "Servientrega",
  "Interrapidísimo",
  "Domina",
  "Coordinadora",
  "Envía",
  "Mensajeria TUMOMITO",
];

const DispatchModule = () => {
  const params = useSearchParams();
  const generateOrderId = () => uuidv4().slice(0, 8).toUpperCase();

  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [productCode, setProductCode] = useState("");
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [dispatchProducts, setDispatchProducts] = useState<DispatchProduct[]>(
    [],
  );
  const [orderId, setOrderId] = useState(generateOrderId());
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [productsDB, setProductsDB] = useState<any[]>([]);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [validationAlert, setValidationAlert] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const c = params.get("code");
    if (c) setProductCode(c);
  }, [params]);

  useEffect(() => {
    const fetchProducts = async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/products/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setProductsDB(data);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (productCode.length >= 3) {
        const found = productsDB.find((p) => p.code === productCode);
        if (found) {
          setProductName(found.name);
          setProductId(found.id);
          setConfirmModalOpen(true);
        } else {
          setProductName("");
          setProductId(null);
        }
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [productCode, productsDB]);

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const found = productsDB.find((p) => p.code === productCode);
      if (found) {
        setProductName(found.name);
        setProductId(found.id);
        setConfirmModalOpen(true);
      }
    }
  };

  const handleConfirmAddProduct = () => {
    if (!productId || !productCode || !productName || quantity <= 0) return;

    const newProduct = {
      product_id: productId,
      code: productCode,
      name: productName,
      quantity,
    };

    if (editIndex !== null) {
      const updated = [...dispatchProducts];
      updated[editIndex] = newProduct;
      setDispatchProducts(updated);
      setEditIndex(null);
    } else {
      setDispatchProducts([...dispatchProducts, newProduct]);
    }

    setProductCode("");
    setProductName("");
    setProductId(null);
    setQuantity(1);
    setConfirmModalOpen(false);
    inputRef.current?.focus();
  };

  const handleEdit = (index: number) => {
    const product = dispatchProducts[index];
    setProductCode(product.code);
    setProductName(product.name);
    setProductId(product.product_id);
    setQuantity(product.quantity);
    setEditIndex(index);
    setConfirmModalOpen(true);
  };

  const handleDelete = (index: number) => {
    if (window.confirm("¿Eliminar este producto de la orden?")) {
      setDispatchProducts(dispatchProducts.filter((_, i) => i !== index));
    }
  };

  const handleCancelDispatch = () => {
    const confirmCancel = window.confirm(
      "¿Estás seguro de cancelar esta orden? Se perderán los productos agregados.",
    );
    if (!confirmCancel) return;

    setTrackingNumber("");
    setCarrier("");
    setProductCode("");
    setProductName("");
    setProductId(null);
    setQuantity(1);
    setDispatchProducts([]);
    setOrderId(generateOrderId());
    setValidationAlert("");
  };

  const handleFinishDispatch = async () => {
    if (!carrier) return setValidationAlert("Selecciona una transportadora.");
    if (!trackingNumber)
      return setValidationAlert("Ingresa un número de guía válido.");
    if (dispatchProducts.length === 0)
      return setValidationAlert("Agrega al menos un producto a la orden.");
    setValidationAlert("");

    const confirm = window.confirm("¿Deseas finalizar esta orden de despacho?");
    if (!confirm) return;

    const created_by = localStorage.getItem("userName") || "Operador";
    const token = localStorage.getItem("token");

    const checkResponse = await fetch(
      `${API_BASE}/dispatches?tracking_number=${encodeURIComponent(trackingNumber)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const existing = await checkResponse.json();

    if (Array.isArray(existing) && existing.length > 0) {
      alert(
        "Este número de guía ya ha sido gestionado. Por favor, ingresa uno diferente.",
      );
      return;
    }

    const payload = {
      order_number: orderId,
      tracking_number: trackingNumber,
      carrier,
      created_by,
      products: dispatchProducts.map((p) => ({
        product_id: p.product_id,
        quantity: p.quantity,
      })),
    };

    const response = await fetch(`${API_BASE}/dispatches/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      try {
        const totalCost = data.products.reduce(
          (sum: number, item: any) => sum + (item.fifo_cost || 0),
          0,
        );
        setOrderId(
          (prev) =>
            `${prev} | Costo Consumo: Bs. ${totalCost.toLocaleString("es-BO")}`,
        );
      } catch (e) {
        console.error("Error calculating cost", e);
      }
      setSuccessDialogOpen(true);
    } else {
      const error = await response.json();
      console.error("Error al guardar:", error);
      if (error.detail && error.detail.toLowerCase().includes("vencido")) {
        setValidationAlert(
          "🚨 Este producto no puede despacharse porque uno de sus lotes está vencido.",
        );
      } else {
        alert("Error al guardar: " + JSON.stringify(error.detail));
      }
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Nueva Orden de Despacho</h2>
        <span className="text-sm text-muted-foreground">
          ID Orden: {orderId}
        </span>
      </div>

      {validationAlert && (
        <p className="text-red-600 text-sm mb-2">{validationAlert}</p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Transportadora
          </label>
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="w-full border border-input bg-background text-foreground px-3 py-2 rounded-md"
          >
            <option value="">Seleccione</option>
            {transportadoras.map((t, i) => (
              <option key={i} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Número de Guía
          </label>
          <Input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Escanea o escribe la guía"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Código del Producto
          </label>
          <Input
            ref={inputRef}
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            onKeyDown={handleScan}
            placeholder="Escanear o escribir código"
            disabled={!trackingNumber || !carrier}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Nombre del Producto
          </label>
          <Input value={productName} disabled />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cantidad</label>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
            disabled={!productName}
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-2">Productos en la Orden</h3>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Código</th>
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-left">Cantidad</th>
              <th className="p-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {dispatchProducts.map((product, index) => (
              <tr
                key={index}
                className="border-t border-border hover:bg-muted/40 transition-colors"
              >
                <td className="p-2">{product.code}</td>
                <td className="p-2">{product.name}</td>
                <td className="p-2">{product.quantity}</td>
                <td className="p-2 space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(index)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(index)}
                  >
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
            {dispatchProducts.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-4 text-center text-muted-foreground"
                >
                  Agrega productos escaneando o digitando el código.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 mt-6">
        <Button onClick={handleFinishDispatch} variant="destructive">
          Finalizar Orden
        </Button>
        <Button onClick={handleCancelDispatch} variant="outline">
          Cancelar
        </Button>
      </div>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent>
          <DialogTitle>
            {editIndex !== null ? "Editar" : "Agregar"} Producto
          </DialogTitle>
          <p className="text-sm mb-4">
            {productName ? (
              <>
                Confirma la cantidad para el producto{" "}
                <strong>{productName}</strong> ({productCode})
              </>
            ) : (
              "Producto no encontrado"
            )}
          </p>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
          />
          <div className="flex justify-end gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmAddProduct}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={successDialogOpen}
        onOpenChange={(val) => {
          setSuccessDialogOpen(val);
          if (!val) handleCancelDispatch();
        }}
      >
        <DialogContent>
          <DialogTitle>Orden Finalizada</DialogTitle>
          <p className="text-sm">
            La orden <strong>{orderId}</strong> fue registrada exitosamente.
          </p>
          <div className="flex justify-end mt-6">
            <Button onClick={() => setSuccessDialogOpen(false)}>Aceptar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DispatchModule;
