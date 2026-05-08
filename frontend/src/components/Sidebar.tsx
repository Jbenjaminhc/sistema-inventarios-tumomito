// src/components/Sidebar.tsx
"use client";

import { useRouter } from "next/navigation";
import {
  Home,
  Users,
  QrCode,
  ClipboardList,
  Container,
  RotateCcw,
  Tags,
  ScanLine,
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingCart,
  FileText,
  PackageOpen,
  Activity,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  isCollapsed,
  setIsCollapsed,
}) => {
  const router = useRouter();

  const handleNavigationClick = (path: string) => {
    router.push(path);
    if (window.innerWidth < 768) setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-card text-card-foreground border-r border-border p-5 flex flex-col justify-between
          transform transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 md:h-screen md:flex
          ${isCollapsed ? "md:w-20" : "md:w-64"}`}
      >
        <div
          className={`flex flex-col items-center ${isCollapsed ? "mb-4" : "mb-8"}`}
        >
          <Image
            src="/logo_tumomito.png"
            alt="TUMOMITO"
            width={isCollapsed ? 40 : 100}
            height={isCollapsed ? 40 : 100}
            priority
          />
          {!isCollapsed && (
            <h1 className="text-xl font-bold mt-2 whitespace-nowrap">
              TUMOMITO
            </h1>
          )}
        </div>

        <nav className="flex-grow mt-5">
          <ul className="space-y-2">
            {[
              { path: "/dashboard", icon: Home, label: "Inicio" },
              { path: "/tienda", icon: ShoppingCart, label: "Tienda Virtual" },
              { path: "/suppliers", icon: Users, label: "Proveedores" },
              {
                path: "/purchase-orders",
                icon: FileText,
                label: "Órdenes de Compra",
              },
              { path: "/batches", icon: PackageOpen, label: "Lotes" },
              { path: "/kardex", icon: Activity, label: "Kardex" },
              { path: "/products", icon: Container, label: "Productos" },
              { path: "/categories", icon: Tags, label: "Categorías" },
              { path: "/print-qr", icon: QrCode, label: "Imprimir Códigos QR" },
              { path: "/scan", icon: ScanLine, label: "Escanear QR" },
              { path: "/dispatches", icon: Package, label: "Despachos" },
              {
                path: "/dispatches-history",
                icon: ClipboardList,
                label: "Historial de Despachos",
              },
              { path: "/returns", icon: RotateCcw, label: "Devoluciones" },
              { path: "/users", icon: Users, label: "Usuarios" },
            ].map((item, index) => (
              <li key={index}>
                <Link
                  href={item.path}
                  onClick={() => handleNavigationClick(item.path)}
                  className="flex items-center p-2 rounded-md cursor-pointer group hover:bg-muted transition-colors"
                >
                  <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  {!isCollapsed && (
                    <span className="ml-3 whitespace-nowrap text-foreground/90 group-hover:text-foreground">
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="w-full flex justify-end mt-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors hidden md:block"
            aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
