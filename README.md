# Parrilla OS

Plataforma white label de hospitalidade e operação presencial para restaurantes.

O produto combina uma jornada digital à mesa com roteamento operacional para Bar e Cozinha, entrega pelo Garçom e visão consolidada pelo Gerente. O piloto atual utiliza a identidade e o catálogo do **+54 Parrilla — Jardim Aquarius**; a arquitetura de experiência e marca permanece configurável.

## Comece por aqui

A fonte oficial para entender o projeto é:

- [Contexto mestre](docs/00_MASTER_PROJECT_CONTEXT.md)
- [Escopo e roadmap da V1](docs/02_V1_SCOPE_AND_ROADMAP.md)
- [Arquitetura](docs/03_ARCHITECTURE.md)
- [Modelo de domínio](docs/04_DOMAIN_MODEL.md)
- [Guia de desenvolvimento](docs/08_DEVELOPMENT_GUIDE.md)
- [Auditoria da documentação](docs/DOCUMENTATION_AUDIT.md)

Documentos anteriores foram preservados em [`docs/archive/`](docs/archive/) apenas como histórico e não devem orientar novas implementações.

## Stack

- Next.js 16 App Router e React 19;
- TypeScript em modo estrito;
- Supabase/PostgreSQL e Supabase Realtime;
- Zustand para estado local do cliente;
- Vercel como destino de deploy.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Variáveis públicas necessárias:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_RESTAURANT_ID=
NEXT_PUBLIC_RESTAURANT_NAME=
NEXT_PUBLIC_APP_URL=
```

Antes de concluir qualquer patch:

```bash
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

Consulte [AGENTS.md](AGENTS.md) antes de alterar código: a versão de Next.js do projeto possui regras próprias que devem ser lidas na documentação instalada em `node_modules/next/dist/docs/`.
