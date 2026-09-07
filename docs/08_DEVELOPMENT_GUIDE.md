# Guia de desenvolvimento

Status: **guia oficial para desenvolvedores e agentes**

## 1. Antes de alterar código

1. leia `AGENTS.md` integralmente;
2. consulte a documentação relevante em `node_modules/next/dist/docs/`;
3. leia [00_MASTER_PROJECT_CONTEXT.md](00_MASTER_PROJECT_CONTEXT.md);
4. consulte arquitetura, domínio e escopo da V1;
5. inspecione os arquivos reais antes de propor props, hooks, stores ou APIs;
6. preserve mudanças existentes no working tree.

## 2. Instalação

Requisitos:

- Node.js compatível com Next.js 16;
- npm;
- projeto Supabase configurado.

```bash
npm install
npm run dev
```

O servidor usa a primeira porta disponível. Verifique o terminal antes de assumir `3000`.

## 3. Variáveis de ambiente

Obrigatórias para catálogo e sessões:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Configuração da casa:

```text
NEXT_PUBLIC_RESTAURANT_ID=
NEXT_PUBLIC_RESTAURANT_NAME=
```

Geração de QR Codes:

```text
NEXT_PUBLIC_APP_URL=
```

Nunca documentar ou versionar valores secretos. O runtime atual usa chave pública anon; não adicionar service role ao cliente.

## 4. Comandos

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
git diff --check
npm run generate:qrcodes
```

Validadores disponíveis em `scripts/`:

- `validate-real-catalog.ts`;
- `validate-hospitality-curation.ts`;
- `validate-production-routing.ts`;
- `validate-station-execution.ts`;
- `validate-patch-027a-migration.ts`;
- `validate-manager-command-center.ts`;
- `validate-delivery-persistence.ts`.

Execute os validadores afetados por cada patch.

## 5. Estrutura

| Pasta | Responsabilidade |
|---|---|
| `app/` | rotas, páginas, layouts e APIs do App Router |
| `components/` | composição visual e interação |
| `lib/catalog/` | repository, mapper, import e identidade semântica |
| `lib/hospitality/` | curadoria e resolvers de hospitalidade |
| `lib/experience/` | motores de composição |
| `lib/recommendations/` | Recommendation Engine e resolução |
| `lib/session/` | resolução, identificação e validação de sessão |
| `lib/orders/` | snapshot, roteamento e dispatch |
| `lib/production/` | Station Execution e projeções |
| `lib/delivery/` | entrega persistida |
| `lib/manager/` | projeções do Manager Command Center |
| `lib/supabase/` | clientes e subscriptions |
| `lib/stores/` | estado local Zustand |
| `types/` | contratos compartilhados |
| `styles/` | tokens, tema, primitives e experiência |
| `supabase/migrations/` | evolução versionada do banco |
| `supabase/seeds/` | seeds explicitamente aprovados |
| `docs/` | fonte canônica e histórico |

## 6. Regras arquiteturais

- UI não decide recomendação, roteamento ou estado operacional.
- Hospitality Engine não conhece banco ou IDs de persistência.
- Componentes não conhecem restaurantes específicos.
- Catálogo passa por Repository e Mapper.
- Preço, estação e modo são resolvidos no servidor.
- Snapshot histórico é imutável.
- `productionStation` é a fonte do destino.
- Realtime começa com snapshot server-side.
- Não criar polling quando já existe subscription.
- Não criar listener por item ou mesa para operação.
- Zustand não substitui Supabase.
- Fallback legado deve permanecer centralizado.

## 7. Como criar um patch

Formato:

```text
PATCH-NNN

Objetivo
Arquivos
Plano
Implementação
Validação
Resultado
```

Fluxo:

1. entender o contexto;
2. localizar contratos e consumidores;
3. explicar plano curto;
4. implementar somente uma funcionalidade;
5. validar proporcionalmente ao risco;
6. corrigir falhas dentro do escopo;
7. relatar alterações e limitações;
8. aguardar aprovação antes do próximo patch.

## 8. Banco e migrations

1. auditar schema real antes de escrever SQL;
2. preparar migration transacional e abortar em divergências;
3. não executar remotamente sem autorização explícita;
4. validar contagens, constraints, triggers, policies e rollback;
5. após execução, validar pela mesma fronteira pública usada pelo runtime;
6. não enfraquecer RLS para fazer teste passar;
7. não alterar registros inesperados.

## 9. Documentação

Após cada patch aprovado, atualizar somente os documentos afetados:

- contexto mestre quando o estado geral mudar;
- escopo quando um item mudar de categoria;
- arquitetura/domínio quando contratos mudarem;
- changelog e histórico com resumo curto;
- release checklist quando um bloqueio for resolvido.

Não criar um novo documento por patch. Relatórios detalhados pertencem ao histórico ou à conversa, não à fonte canônica.

## 10. Git

- preservar mudanças do usuário;
- verificar `git status` antes e depois;
- não usar `git reset --hard` ou descarte destrutivo;
- commit e push somente quando explicitamente autorizados;
- staging deve conter apenas arquivos do patch;
- mensagem deve descrever o resultado, não o processo.

## 11. Validação mínima

Para qualquer alteração funcional:

```bash
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

Além disso:

- validar desktop e mobile quando houver UI;
- validar refresh/hidratação quando houver Zustand;
- validar Realtime em múltiplas janelas quando houver operação;
- validar anon e usuário autenticado quando houver RLS;
- confirmar console sem erros.

## 12. Troubleshooting

### Porta ocupada

Leia o processo indicado pelo Next.js e use a URL realmente iniciada. Não execute múltiplos servidores para o mesmo `.next`.

### Cache ou imagem antiga

Confirme `src`, hash e arquivo público antes de apagar `.next`. Reinicie o servidor somente depois de provar cache.

### Migration pendente

Não adapte o runtime permanentemente ao banco antigo. Preserve fallback transitório, aplique a migration com autorização e valide o estado definitivo.

### Hidratação

Server e primeiro render cliente precisam receber os mesmos valores serializáveis. Relógios locais podem começar depois da hidratação.

### Falha de catálogo

Não invente catálogo local. Verifique env, resposta pública, mapper e issues normalizadas.

## 13. Referências

- [Arquitetura](03_ARCHITECTURE.md)
- [Domínio](04_DOMAIN_MODEL.md)
- [Banco e segurança](07_DATABASE_AND_SECURITY.md)
- [Decisões arquiteturais](ARCHITECTURAL_DECISIONS.md)
- [Release](09_RELEASE.md)
