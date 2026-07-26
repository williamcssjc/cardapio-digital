# Auditoria de escalabilidade

## Estado observado

O sistema funciona como uma instalação única. Há sinais corretos de separação — stores por domínio, tokens estruturais, tema +54 e `restaurantId` na sessão — mas o banco e várias consultas ainda não garantem isolamento entre casas.

## Conteúdo hardcoded

- `+54` nos cabeçalhos do menu, cozinha, garçom e encerramento;
- textos editoriais e operacionais espalhados nos componentes;
- imagem `/images/entrada.jpeg`;
- limite de 23 mesas;
- cores hexadecimais na recepção e nos painéis;
- nomes `parrilla-*` em tokens e persistência local;
- metadados padrão do Create Next App.

No PATCH-004, apenas textos/imagem da recepção e faixa de mesas foram centralizados, pois pertencem ao próximo trecho da jornada.

## Dependências do +54

- import global de `styles/themes/plus54.css`;
- `shortName = +54` no perfil padrão;
- imagens e linguagem visual específicas;
- nomes de aliases CSS `--parrilla-*`;
- identidade nos painéis operacionais.

## Dependências de cardápio provisório

- categorias e sete produtos não possuem `restaurant_id` ou `unit_id`;
- todos os produtos auditados têm `image_url = null`;
- `types/MenuItem` usa `photo_url`, enquanto o banco auditado expõe `image_url`;
- não existem campos confirmados para destaque, assinatura, primeiro gesto ou harmonização.

## Suposições de restaurante único

- `categories`, `menu_items` e `orders` são consultados sem tenant;
- não foram encontradas tabelas `restaurants`, `establishments`, `units` ou `tables`;
- `unit_id` em `table_sessions` é texto vindo do ambiente, sem chave estrangeira observável;
- cozinha e garçom carregam pedidos globais;
- API de pedidos aceita IDs enviados pelo cliente sem validar vínculo com a casa;
- um único tema é importado no layout raiz.

## Riscos de segurança entre estabelecimentos

Prioridade crítica antes de uma segunda casa:

1. Vazamento de cardápio e pedidos por ausência de filtro de tenant.
2. Realtime recebendo eventos de outra casa.
3. IDs de `table_session` e `customer_session` fornecidos pelo cliente sem verificação de vínculo.
4. Políticas RLS não auditáveis pelo repositório atual.
5. Busca de pedidos por telefone sem escopo de estabelecimento.

Este patch não corrige esses pontos porque isso exigiria decisões de modelo, autenticação e migrations.

## Riscos de regressão

- mudar chaves de localStorage perde sessões em andamento;
- remover aliases `--parrilla-*` quebra grande parte da UI;
- migrar consultas antes de povoar tenant torna o cardápio vazio;
- trocar a resolução do estabelecimento pode criar sessões sob um ID diferente;
- generalizar status pode quebrar cozinha, garçom e cliente.

## Componentes reutilizáveis

- stores `useCart`, `useOrderTracker`, `useAccount` e `useSession`;
- carrinho, checkout, acompanhamento, conta e sessões;
- boards de cozinha/garçom e realtime;
- componentes básicos de feedback e quantidade;
- tokens estruturais em `styles/tokens.css`.

## Componentes a adaptar incrementalmente

- cabeçalhos do menu, cozinha e garçom;
- tela de encerramento;
- menu e consultas de produtos;
- `TableSessionGate` e Identificação, extraindo acesso a dados para serviço;
- componentes que usam cores inline ou aliases de marca.

## Prioridades

### P0 — antes do segundo restaurante

- aprovar entidades `restaurants/units`;
- incluir tenant nas entidades comerciais e operacionais;
- definir RLS e resolução segura da casa;
- validar o vínculo de sessão nas APIs e no realtime.

### P1 — continuidade do +54

- implementar First Gesture pelo contrato do perfil;
- confirmar quatro ofertas reais;
- corrigir `image_url` versus `photo_url`;
- extrair identidade dos próximos componentes tocados.

### P2 — evolução gradual

- consolidar tokens;
- versionar configuração;
- migrar chaves persistidas com compatibilidade;
- criar ferramentas administrativas somente após requisitos reais.

