// ... (Imports de tipo e componentes existentes)
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";

// Imports de estilos na ordem correta de injeção e precedência
import "./globals.css";
import "@/styles/tokens.css";
import "@/styles/themes/index.css";
import "@/styles/primitives.css";
import "@/styles/menu-experience.css";
import "@/styles/hospitality-entry.css";

import { TableSessionListener } from '@/components/session/TableSessionListener';
import { ExperienceProvider } from '@/components/experience/ExperienceProvider';
import { getActiveImplementation } from '@/lib/platform/active-implementation';
import { createBrandCssVariables } from '@/lib/brand/brand-css-variables';

// Configuração das fontes da implementação gastronômica ativa
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

const activeImplementation = getActiveImplementation();
const activeBrand = activeImplementation.brandIdentity;

export const metadata: Metadata = {
  title: `${activeBrand.name} | ${activeBrand.unitName}`,
  description: activeBrand.description,
  applicationName: activeBrand.name,
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
      style={createBrandCssVariables(activeBrand)}
    >
      <body className="min-h-full flex flex-col">
        <ExperienceProvider implementation={activeImplementation}>
          <TableSessionListener />
          {children}
        </ExperienceProvider>
      </body>
    </html>
  );
}
