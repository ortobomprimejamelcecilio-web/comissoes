import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ComissãoSys — Controle de Vendas",
  description: "Sistema de controle de comissionamento de vendedores",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
