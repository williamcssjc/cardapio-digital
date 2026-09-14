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
OperationProfile ─┐
CapabilitiesProfile ─┐
                     ├→ GastronomicImplementation
ExperienceProfile ───┘                         ↓
                  Active Implementation Boundary
                                  ↓
QR → TableSessionGate → HospitalityEntry → Menu Experience
Counter-Service → ServiceSessionIdentityGate → Menu Experience
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
| `/api/service-session` | Abertura leve de Customer/ServiceSession. |
| `/api/service-session/close` | Encerramento de visita sem consumo. |

`app/(menu)/page.tsx` permanece um Server Component e exporta `revalidate = 60`. Ele exige `catalog`, carrega o catálogo e compõe hero, busca e Experience Sections. Decisões de ordem não ficam na página.

As superfícies operacionais e administrativas consultam a implementação ativa antes de renderizar. `CapabilitiesProfile` responde se uma capability existe para a implementação atual; ele não substitui autenticação nem autorização do usuário.

| Surface | Capability |
|---|---|
| `/` | `catalog` |
| `/bar` | `barOperations` |
| `/cozinha` | `kitchenOperations` |
| `/garcom` | `waiterOperations` |
| `/gerente` | `managerOperations` |
| `/admin/catalogo` | `catalogAdmin` |
| `/api/orders` | `orders` |
| APIs/experiência de conta | `tableAccount` |

## 4. Configuração de experiência

### Platform Boundary

MODARA separa Core, Implementação Ativa e Capabilities. A implementação +54 Jardim Aquarius permanece como referência configurada, não como regra arquitetural do core.

`lib/platform/capabilities.ts` oferece a consulta reutilizável de capability. Páginas podem usar a guarda server-side que resolve para `notFound()` quando o módulo não existe; APIs usam uma guarda equivalente que retorna erro HTTP sem expor uma superfície funcional.

`lib/implementations` registra as implementações locais disponíveis. `getActiveImplementation()` seleciona explicitamente por `NEXT_PUBLIC_MODARA_IMPLEMENTATION`, com fallback para `plus54-jardim-aquarius`. Essa seleção é ferramenta local de desenvolvimento/validação, não tenant resolver, hostname routing ou configuração remota.

Implementações atuais:

| Implementação | Perfil |
|---|---|
| `plus54-jardim-aquarius` | Full Service / Hospitality |
| `quintal-skatepark` | Counter-Service / Self-Service |

### CapabilitiesProfile

Fonte única para disponibilidade de módulos por implementação. Exemplos atuais incluem catálogo público, busca, recomendações, carrinho, pedidos, operações de Bar/Cozinha/Garçom/Gerente, Conta e Administração de Catálogo.

Capability não é permissão. Em Catalog Admin, a operação exige:

```text
catalogAdmin habilitado
+ usuário autenticado
+ usuário autorizado em modara_admin_users
```

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

Perfis e implementações são locais. Não há resolução remota de tenant, isolamento de dados por estabelecimento ou catálogo próprio por implementação. O Quintal Skatepark ainda consome a infraestrutura/catalog data existente e não representa catálogo real próprio.

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

`ActiveTableSessionGate` protege o catálogo para operações com mesa física, confirma que a sessão continua ativa e retorna à rota da mesa quando necessário. Quando `OperationProfile.physicalTables.enabled` é `false`, o catálogo pode ser aberto diretamente para operações de balcão/self-service.

Para Counter-Service, o catálogo direto agora passa por `ServiceSessionIdentityGate`, que abre uma visita persistente com nome e telefone sem criar mesa fictícia. Pagamento digital e ciclo formal de retirada (`ready for pickup`, notificação do cliente e confirmação de retirada) ainda não possuem domínio próprio.

A auditoria da MODARA-006 confirmou que catálogo, pedidos, produção, Delivery Persistence e capability composition já atendem operações gastronômicas diferentes. A MODARA-007 introduz a fundação local de `Customer` persistente e `ServiceSession` como raiz de visita; a migration ainda exige aplicação remota antes de ser a fonte efetiva no Supabase.

Novas identificações exigem `preferred_name` e `phone_normalized`. Se a persistência de `Customer → ServiceSession → CustomerSession` falhar ou a migration não estiver aplicada, o fluxo novo falha explicitamente; a compatibilidade fica nos dados históricos e no rollout, não em fallback silencioso de criação legada.

A direção arquitetural futura aprovada para investigação/implementação é:

```text
Customer
  ↓
ServiceSession / Visit
  ↓
TableSession opcional
  ↓
CustomerSession
```

Nessa evolução, o Account Core continua preservado em `table_session_id` para o +54 e deve ser adaptado posteriormente para visitas sem mesa quando a capability de conta for habilitada para Counter-Service.

No Quintal Skatepark, `checkoutMode: "disabled"` descreve somente a reference implementation limitada atual. Ele não representa a operação alvo final de consumo acumulado por visita, fechamento solicitado, pagamento presencial confirmado por funcionário e encerramento persistente da visita. O modelo de checkout deverá ser revisto depois da fundação `ServiceSession`/Visit.

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

Quando a migration MODARA-007 estiver aplicada, pedidos novos também preservam `service_session_id`. Esse vínculo é opcional para compatibilidade histórica e não substitui `table_session_id` nos módulos que continuam table-scoped.

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

- seleção local explícita entre implementações de referência;
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
