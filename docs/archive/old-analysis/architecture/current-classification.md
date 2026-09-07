# Classificação da implementação atual

Auditoria realizada no PATCH-004.

| Funcionalidade ou elemento | Local atual | Camada correta | Situação | Ação recomendada |
|---|---|---|---|---|
| QR identifica número da mesa | `app/mesa/[tableNum]` e QR codes | Motor | Correto | Preservar |
| Faixa de mesas 1–23 | antes em `TableSessionGate`; agora no perfil padrão | Regras | Extraído no PATCH-004 | Futuramente carregar por unidade |
| Criação/reuso de `table_sessions` | `TableSessionGate.tsx` | Motor | Funcional, mas componente acessa Supabase | Preservar neste patch; extrair serviço depois |
| Nome e quantidade do grupo | `app/identificacao/page.tsx` | Motor + Regras | Funcional | Preservar; textos agora vêm do Perfil |
| `party_size` persistido | `table_sessions` e `useSession` | Motor | Correto | Preservar |
| Nome, mensagem e CTA de recepção | páginas Bem-vindo/Identificação | Perfil | Extraído no PATCH-004 | Evoluir somente quando houver fonte de configuração |
| Fotografia da recepção | perfil padrão | Tema/Perfil editorial | Extraída no PATCH-004 | Manter referência validada |
| Cores da recepção inline | páginas Bem-vindo/Identificação | Tema | Acoplado | Migrar incrementalmente para tokens |
| Tema +54 | `styles/themes/plus54.css` | Tema | Bem separado | Preservar; remover aliases apenas gradualmente |
| Tokens de estrutura | `styles/tokens.css` | Motor visual | Reutilizável | Preservar |
| Paleta duplicada | `app/globals.css` e tema +54 | Tema | Acoplada/duplicada | Consolidar em patch visual próprio |
| Nome `+54` em menu, cozinha, garçom e obrigado | páginas correspondentes | Perfil | Acoplado | Extrair incrementalmente |
| Categorias e itens | Supabase | Perfil da casa | Contrato de imagem corrigido; vínculo de estabelecimento não verificável | Preservar mapper; definir isolamento antes de multi-tenant |
| Carrinho | `useCart` e componentes `cart` | Motor | Reutilizável | Preservar |
| Checkout | `Checkout.tsx` | Motor | Funcional; acesso por API | Preservar |
| Pedidos | `orders`, APIs e stores | Motor | Funcional | Preservar status e realtime |
| Painel da cozinha | `app/cozinha`, `components/kitchen` | Motor operacional | Reutilizável, branding acoplado | Extrair identidade depois |
| Painel do garçom | `app/garcom`, `components/waiter` | Motor operacional | Reutilizável, branding acoplado | Extrair identidade depois |
| Realtime de pedidos | boards/listeners | Motor | Reutilizável | Preservar |
| Listener de encerramento da mesa | `TableSessionListener.tsx` | Motor | Reutilizável | Preservar |
| Chaves `parrilla-session` e `parrilla-order-tracker` | stores Zustand | Motor | Branding técnico acoplado | Migrar somente com estratégia de compatibilidade |
| `restaurantId` na sessão | `VisitContext` e `useSession` | Contexto do estabelecimento | Parcial | Agora usa o ID do perfil padrão; falta resolução confiável |
| Consultas de categorias/pedidos sem tenant | páginas e APIs | Motor + dados | Risco | Corrigir somente após modelo multi-tenant aprovado |
| Textos de status e erros | múltiplos componentes | Motor/Perfil conforme o caso | Misturados | Classificar e extrair por fluxo, não em massa |
| Primeiro gesto | inexistente | Motor com conteúdo do Perfil e condição em Regras | Pendente | Próximo patch, após catálogo aprovado |
