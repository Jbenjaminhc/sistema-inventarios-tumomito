"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api";

export default function Login() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login/json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          data?.detail ||
          data?.message ||
          "Credenciales incorrectas o error desconocido.";
        setError(errorMessage);
        return;
      }

      if (!data?.access_token) {
        setError(
          "Respuesta de la API inesperada: token de acceso no encontrado.",
        );
        return;
      }

      localStorage.setItem("token", data.access_token);
      window.location.href = "/dashboard";
    } catch {
      setError(
        "No se pudo conectar al servidor. Por favor, intente de nuevo más tarde.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      <Card className="w-96 bg-card text-card-foreground shadow-lg p-6 rounded-lg border border-border">
        <CardHeader className="flex flex-col items-center">
          <Image src="/logo_tumomito.png" alt="Logo" width={150} height={150} />
          <h2 className="text-xl font-semibold mt-4 text-center">
            Bienvenido a TUMOMITO
          </h2>
          <p className="text-muted-foreground text-center">
            Por favor, inicia sesión para continuar
          </p>
        </CardHeader>

        <CardContent>
          <Input
            type="text"
            placeholder="Usuario"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="mb-4"
          />
          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4"
          />

          <Button onClick={handleLogin} className="w-full" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </Button>

          {error && (
            <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
