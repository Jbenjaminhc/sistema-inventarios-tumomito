"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type User = {
  id: number;
  username: string;
  role: "user" | "admin";
};

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  const fetchUsers = async () => {
    const token = getToken();
    if (!token) {
      setErrorMessage("No autorizado. Inicia sesión.");
      return;
    }

    try {
      setErrorMessage("");
      const response = await fetch(`${API_BASE}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setErrorMessage("No tienes permiso para ver los usuarios.");
          return;
        }
        throw new Error("Error al obtener usuarios.");
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : data.users || [];
      setUsers(list);
    } catch (error) {
      console.error("Error fetching users:", error);
      setErrorMessage("Error de red.");
    }
  };

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setRole("user");
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (password.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    const token = getToken();
    if (!token) {
      setErrorMessage("No autorizado.");
      return;
    }

    try {
      setErrorMessage("");

      // NOTA: Mantengo password requerido (como lo tenías),
      // pero si quieres permitir editar sin cambiar password, lo ajusto.
      const payload = { username, password, role };

      const response = await fetch(
        editingUser
          ? `${API_BASE}/users/${editingUser.id}`
          : `${API_BASE}/users`,
        {
          method: editingUser ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || "Error al guardar el usuario.");
      }

      await fetchUsers();
      resetForm();
    } catch (error: any) {
      setErrorMessage(error?.message || "Error al guardar el usuario.");
    }
  };

  const handleEdit = (user: User) => {
    setUsername(user.username);
    setRole(user.role);
    setPassword(""); // para obligar a reingresar la contraseña, como el flujo actual
    setEditingUser(user);
    setErrorMessage("");
  };

  const handleDelete = async (id: number) => {
    const token = getToken();
    if (!token) {
      setErrorMessage("No autorizado.");
      return;
    }

    const confirmDelete = window.confirm(
      "¿Seguro que deseas eliminar este usuario?",
    );
    if (!confirmDelete) return;

    try {
      setErrorMessage("");
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || "No se pudo eliminar el usuario.");
      }

      await fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      setErrorMessage(error?.message || "Error al eliminar el usuario.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>

      <div className="rounded-lg border border-border bg-card shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingUser ? "Modificación de Usuario" : "Creación de Usuario"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="text"
            placeholder="Nombre de usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}

          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "user" | "admin")}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {editingUser ? "Modificar Usuario" : "Añadir Usuario"}
            </Button>

            {editingUser && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>

          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-xl font-bold">Lista de Usuarios</h3>

        <div className="rounded-md border border-border bg-card overflow-hidden">
          {users.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No hay usuarios.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex justify-between items-center p-3 hover:bg-muted/40 transition-colors"
                >
                  <span className="text-sm">
                    <span className="font-medium">{user.username}</span>{" "}
                    <span className="text-muted-foreground">({user.role})</span>
                  </span>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(user)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(user.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Users;
