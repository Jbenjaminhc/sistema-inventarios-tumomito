"use client";

import { useRouter } from "next/navigation";
import { Sun, Moon, LogOut, Bell } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { API_BASE } from "@/lib/api";

interface HeaderProps {
  setIsSidebarOpen?: (isOpen: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setIsSidebarOpen }) => {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("Usuario");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedName = localStorage.getItem("userName") || "Usuario";
    const storedTheme = localStorage.getItem("theme");
    setUserName(storedName);
    setIsDarkMode(storedTheme === "dark");

    if (storedTheme === "dark") {
      document.documentElement.classList.add("dark");
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // Actualizar cada minuto

    // Cierre al hacer clic fuera
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch(`${API_BASE}/alerts/expiry`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setAlerts(await response.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    router.push("/login");
  };

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  return (
    <header className="w-full flex justify-between items-center px-6 py-3 border-b border-border bg-background shadow-sm transition-colors">
      <div className="text-lg font-semibold text-foreground">
        ¡Hola, {userName}! 👋🏻
      </div>

      <div className="flex items-center gap-4 relative">
        {/* Alertas */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative text-foreground hover:text-primary mt-1"
          >
            <Bell size={20} />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {alerts.length}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-md shadow-lg z-50 overflow-hidden">
              <div className="p-3 font-semibold border-b border-border">
                Alertas de Vencimiento
              </div>
              <div className="max-h-60 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    No hay alertas
                  </div>
                ) : (
                  alerts.slice(0, 5).map((alert, i) => (
                    <div
                      key={i}
                      className="p-3 border-b border-border text-sm hover:bg-muted cursor-pointer"
                      onClick={() => {
                        setShowDropdown(false);
                        router.push("/alerts/expiry");
                      }}
                    >
                      <div className="font-medium text-red-500">
                        {alert.product_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Vence:{" "}
                        {new Date(
                          alert.expiry_date + "T00:00:00",
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-border text-center">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    router.push("/alerts/expiry");
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Ver todas las alertas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Botón modo oscuro/claro */}
        <button
          onClick={toggleDarkMode}
          className="text-foreground hover:text-primary mt-1"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Botón logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-md text-sm transition"
        >
          <LogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
