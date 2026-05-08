// src/app/categories/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { API_BASE, authHeaders } from "@/lib/api";
import { toast } from "sonner";

type Category = {
  id: number;
  name: string;
  description: string | null;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q)
    );
  }, [categories, search]);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories/`, {
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCategories(await res.json());
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar las categorías");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description || "");
    setOpen(true);
  };

  const save = async () => {
    const payload = { name: name.trim(), description: description.trim() || null };
    if (!payload.name) {
      toast.error("El nombre es obligatorio");
      return;
    }
    try {
      const url = editing ? `${API_BASE}/categories/${editing.id}` : `${API_BASE}/categories/`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      toast.success(editing ? "Categoría actualizada" : "Categoría creada");
      setOpen(false);
      await load();
    } catch (e: any) {
      console.error(e);
      if (String(e?.message || "").includes("403")) toast.error("No tienes permisos (se requiere admin)");
      else toast.error("No se pudo guardar la categoría");
    }
  };

  const remove = async (c: Category) => {
    if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/categories/${c.id}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      toast.success("Categoría eliminada");
      await load();
    } catch (e: any) {
      console.error(e);
      if (String(e?.message || "").includes("403")) toast.error("No tienes permisos (se requiere admin)");
      else toast.error("No se pudo eliminar la categoría");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-semibold">Categorías</h1>
        <div className="flex gap-2">
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button onClick={openCreate}>Nueva</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Descripción</th>
              <th className="text-right p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-muted/40 transition-colors">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-muted-foreground">{c.description || "—"}</td>
                <td className="p-3 text-right space-x-2">
                  <Button variant="outline" onClick={() => openEdit(c)}>
                    Editar
                  </Button>
                  <Button variant="destructive" onClick={() => remove(c)}>
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={3}>
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{editing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          <div className="space-y-3 mt-3">
            <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={save}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
