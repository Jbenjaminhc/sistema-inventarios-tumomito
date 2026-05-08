import "./globals.css"; // Correcto: importa tus estilos globales
import ClientLayout from "@/components/ClientLayout"; // Correcto: importa tu layout de cliente
import { Toaster } from "sonner"; // Correcto: importa el componente de toast

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <title>TUMOMITO</title>
        <link rel="icon" href="/favicon_karamelo.ico" />
      </head>
      <body>
        {/* Aquí envuelves tus páginas con ClientLayout */}
        <ClientLayout>{children}</ClientLayout>
        {/* El Toaster se renderiza fuera de ClientLayout pero dentro del body, lo cual es común */}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
