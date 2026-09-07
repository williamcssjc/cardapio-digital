# Arquitetura

Status: **arquitetura implementada atual**

## 1. Stack

- Next.js 16.2.6 App Router;
- React 19.2;
- TypeScript estrito;
- Supabase/PostgreSQL;
- Supabase Realtime;
- Zustand 5;
- Tailwind CSS 4, CSS modules e estilos temáticos;
- Vercel como destino de deploy.

Antes de usar APIs do Next.js, ler a documentação instalada em `node_modules/next/dist/docs/`, conforme `AGENTS.md`.

## 2. Mapa do sistema

```text
BrandIdentity ─┐
               ├→ ExperienceProvider → Hospitality Engine
ExperienceProfile ┘                         ↓
QR → TableSessionGate → HospitalityEntry → Menu Experience
                                              ↓
       Search / Sections / Recommendations / Product Experience
                                              ↓
                                      Zustand Cart
                                              ↓
                                      Orders API
                                              ↓
                              server-side item snapshots
                                              ↓
                                    Supabase orders
                                              ↓ trigger
                              order_station_executions
                                   ↙                  ↘
                           Station Board          Manager view
                          Bar / Kitchen               ↓
                                   ↘              Waiter delivery
                                      Realtime
```

## 3. App Router e composição

Rotas principais:

| Rota | Responsabilidade |
|---|---|
| `/mesa/[tableNum]` | Resolver mesa/sessão e iniciar HospitalityEntry. |
| `/` | Catálogo protegido por sessão ativa. |
| `/bem-vindo` | Compatibilidade; redireciona para `/`. |
| `/identificacao` | Fluxo legado preservado temporariamente. |
| `/obrigado` | Encerramento visual após sessão `closed`. |
| `/bar` | Operação da estação Bar. |
| `/cozinha` | Operação da estação Cozinha. |
| `/garcom` | Entrega atual por pedido/estação. |
| `/gerente` | Centro de comando operacional. |
| `/api/orders` | Criação de pedidos comuns. |
| `/api/orders/quick-drink` | Envio imediato da primeira bebida. |
| `/api/customer-orders` | Compatibilidade de consulta por telefone. |

`app/(menu)/page.tsx` permanece um Server Component e exporta `revalidate = 60`. Ele carrega o catálogo e compõe hero, busca e Experience Sections. Decisões de ordem não ficam na página.

## 4. Configuração de experiência

### ExperienceProfile

Fonte única para:

- seções e ordem da experiência;
- House Profile;
- entrada e jornada guiada;
- First Gesture;
- papéis semânticos de categorias;
- regras operacionais configuráveis;
- tema visual;
- BrandIdentity.

### BrandIdentity

Define marca, unidade, textos institucionais, cores e raios. `createBrandCssVariables()` aplica tokens no layout. Componentes não possuem branches específicos do +54.

### Limite atual

`defaultExperienceProfile` é local e único. Existe um exemplo alternativo para comprovar o contrato, mas não há resolução remota de tenant.

## 5. Engines e resolvers

### Hospitality Engine

Produz intenções semânticas e sequência de experiência. Não acessa Supabase nem IDs de persistência.

### Experience Sections Engine

Resolve `ExperienceProfile.sections` para componentes registrados. Chaves desconhecidas ou seções vazias não interrompem a página.

### Recommendation Engine

Obtém intenções da Hospitality Memory e resolve produtos contra o catálogo fornecido. Evita autorrecomendação, duplicata e referência ausente.

### Search Engine

Índice local imutável, normalização de caixa e acentos e ordenação determinística. Não consulta banco separadamente.

## 6. Fronteira do catálogo

```text
Supabase
→ SupabaseCatalogRepository
→ mapper defensivo
→ Category[] / MenuItem
→ Experience Platform
```

- UI não conhece query builder ou `PostgrestError`;
- mapper conhece `image_url`, `category_id`, `production_station` e `production_mode`;
- domínio recebe `imageUrl`, `productionStation` e `productionMode`;
- registros inválidos geram issues e não vazam detalhes de infraestrutura;
- não existe fallback local silencioso para falha do catálogo.

## 7. Sessão

`TableSessionGate` aguarda hidratação do Zustand, valida a faixa da mesa, chama `resolveTableSession`, guarda `tableSessionId` e renderiza `HospitalityEntry`.

`ActiveTableSessionGate` protege o catálogo, confirma que a sessão continua ativa e retorna à rota da mesa quando necessário.

`TableSessionListener` observa `table_sessions` e limpa Session, OrderTracker, Account e Cart quando a sessão muda para `closed`.

## 8. Pedidos e snapshots

APIs recebem apenas identidade e quantidade solicitadas. O servidor:

1. valida sessão da mesa e sessão do cliente;
2. carrega produtos atuais;
3. valida disponibilidade;
4. resolve preço;
5. resolve `productionStation` e `productionMode`;
6. persiste snapshot em `orders.items`;
7. usa chave idempotente para evitar repetição.

Preço ou destino enviados pelo cliente não são fonte confiável.

## 9. Production Routing

Contrato canônico em `types/production.ts`:

- estações: `bar`, `kitchen`, `service`;
- modos: `separation`, `preparation`;
- estados de execução: `pending`, `preparing`, `ready`.

O catálogo atual usa somente Bar e Cozinha. `service` representa trabalho humano futuro e não transforma o Garçom em estação de bebida.

## 10. Station Execution

`order_station_executions` possui uma linha por pedido e estação. Triggers criam execuções usando os snapshots validados e projetam o estado geral do pedido.

Pedidos antigos sem execução válida continuam legíveis por fallback centralizado. Painéis atuais exigem execução persistida para novos pedidos.

## 11. Delivery Persistence

Entrega não adiciona novo status. `delivered_at` registra que uma execução `ready` foi entregue. A RPC `confirm_station_execution_delivery` controla o timestamp e impede alteração, limpeza ou entrega prematura.

## 12. Realtime

Padrão atual:

```text
Server Component carrega snapshot
→ Client Component assina canal compartilhado
→ evento INSERT/UPDATE/DELETE reconcilia estado local
→ cleanup remove a subscription
```

Não existe polling operacional. Relógios locais usados para timers não consultam o banco.

## 13. Stores

| Store | Responsabilidade | Persistida localmente |
|---|---|---|
| `useSession` | visita, mesa, cliente, entrada e jornada | Sim |
| `useCart` | itens ainda não enviados | Sim |
| `useOrderTracker` | acompanhamento do cliente | Sim |
| `useAccount` | projeção local da conta | Não |

Stores controlam interface e continuidade local. Dados operacionais pertencem ao Supabase.

## 14. Current, Target e V2

### Current

- configuração local única;
- itens do pedido em JSON;
- execução por pedido + estação;
- entrega por execução;
- painéis operacionais com leitura pública compatível com RLS atual.

### Target da V1

- Garçom por mesa;
- administração de catálogo;
- fechamento persistido e seguro;
- autenticação/autorização operacional endurecida;
- base schema reproduzível;
- simulação e Release Candidate.

### V2

- tenant remoto;
- produção por item;
- eventos operacionais generalizados;
- IA, analytics e integrações externas.

O modelo de domínio correspondente está em [04_DOMAIN_MODEL.md](04_DOMAIN_MODEL.md).
