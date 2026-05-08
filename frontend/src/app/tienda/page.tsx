"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Package } from "lucide-react";

interface Product {
  id: number;
  code: string;
  name: string;
  description: string;
  price: number;
  stock: number;
}

export default function TiendaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/products/public")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Navbar */}
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Package className="h-8 w-8 text-indigo-600" />
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Karamelo Store
            </h1>
          </div>
          <div>
            <button className="flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 px-4 py-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
              <ShoppingCart className="h-5 w-5" />
              <span className="font-semibold">0 Items</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-indigo-600 dark:bg-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
            Descubre Nuestros Productos
          </h2>
          <p className="text-lg md:text-xl text-indigo-100 max-w-2xl mx-auto">
            El catálogo completo de nuestro sistema de inventarios, ahora
            disponible en una experiencia de compra diseñada para ti.
          </p>
        </div>
      </div>

      {/* Product Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-xl font-medium text-muted-foreground">
              No hay productos disponibles por el momento
            </h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-card rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden group border border-border"
              >
                {/* Image Placeholder */}
                <div className="h-48 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex justify-center items-center group-hover:scale-105 transition-transform duration-500">
                  <Package className="h-20 w-20 text-indigo-200" />
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3
                      className="text-lg font-bold text-foreground truncate"
                      title={product.name}
                    >
                      {product.name}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Stock: {product.stock}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                    {product.description || "Sin descripción detallada."}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-2xl font-extrabold text-foreground">
                      Bs. {product.price.toLocaleString("es-BO")}
                    </span>
                    <button
                      className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={product.stock <= 0}
                    >
                      <ShoppingCart className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
