// ... (Imports de tipo e componentes existentes)
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";

// Imports de estilos na ordem correta de injeção e precedência
import "./globals.css";
import "@/styles/tokens.css";
import "@/styles/themes/plus54.css";
import "@/styles/primitives.css";
import "@/styles/menu-experience.css";
import "@/styles/hospitality-entry.css";

import { TableSessionListener } from '@/components/session/TableSessionListener';
import { ExperienceProvider } from '@/components/experience/ExperienceProvider';
import { plus54JardimAquariusBrand } from '@/lib/config/brand';
import { createBrandCssVariables } from '@/lib/brand/brand-css-variables';

// Configuração das novas fontes para o tema +54 Parrilla
const displayFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-loaded-display',
  display: 'swap',
});

const bodyFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-loaded-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${plus54JardimAquariusBrand.name} | ${plus54JardimAquariusBrand.unitName}`,
  description: plus54JardimAquariusBrand.description,
  applicationName: plus54JardimAquariusBrand.name,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
      style={createBrandCssVariables(plus54JardimAquariusBrand)}
    >
      <body className="min-h-full flex flex-col">
        <ExperienceProvider>
          <TableSessionListener />
          {children}
        </ExperienceProvider>
      </body>
    </html>
  );
}
