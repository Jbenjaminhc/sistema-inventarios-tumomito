"use client";

import { useState, useEffect } from "react";
import { Users, Plus, X } from "lucide-react";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tax_id: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
  });

  const fetchSuppliers = () => {
    fetch("http://127.0.0.1:8000/api/suppliers", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setSuppliers(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://127.0.0.1:8000/api/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsModalOpen(false);
        setFormData({
          name: "",
          tax_id: "",
          contact_name: "",
          email: "",
          phone: "",
          address: "",
        });
        fetchSuppliers(); // Recargar la tabla
      } else {
        alert(
          "Error al crear proveedor. Verifica que el NIT no esté duplicado.",
        );
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión");
    }
  };

  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" /> Proveedores
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo Proveedor
        </button>
      </div>

      <div className="bg-card rounded-lg shadow overflow-x-auto border border-border">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Nombre
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                NIT/RUT
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Contacto
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Email
              </th>
              <th className="p-4 font-semibold text-sm text-muted-foreground">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s: any) => (
              <tr
                key={s.id}
                className="border-b border-border hover:bg-muted/40"
              >
                <td className="p-4">{s.name}</td>
                <td className="p-4">{s.tax_id}</td>
                <td className="p-4">{s.contact_name || "-"}</td>
                <td className="p-4">{s.email || "-"}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${s.status ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                  >
                    {s.status ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No hay proveedores registrados.
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card text-card-foreground rounded-lg shadow-xl w-full max-w-md p-6 border border-border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Agregar Proveedor</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nombre de la Empresa *
                </label>
                <input
                  required
                  type="text"
                  className="w-full border border-input bg-background rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  NIT / RUT *
                </label>
                <input
                  required
                  type="text"
                  className="w-full border border-input bg-background rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.tax_id}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_id: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nombre del Contacto
                </label>
                <input
                  type="text"
                  className="w-full border border-input bg-background rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.contact_name}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full border border-input bg-background rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
