# CUSTOMER_JOURNEY_V1.md

**Parrilla OS — Jornada Oficial do Cliente**
Versão: 1.0
Status: Congelado para implementação
Aprovado por: Product Owner + Tech Lead

---

## DNA do Produto

> **O sistema deve agir como o melhor garçom da casa, utilizando tecnologia para oferecer um atendimento premium de forma consistente a todos os clientes.**

Este princípio não é uma metáfora.
É uma regra de decisão.

Sempre que surgir uma dúvida sobre UX, sobre fluxo, sobre o que mostrar ou omitir em determinado momento, a pergunta correta é:

> *"Se o melhor garçom da casa estivesse nesta mesa agora, o que ele faria?"*

Não estamos construindo um cardápio digital.
Estamos digitalizando o comportamento de um excelente atendente.

---

## Princípios de UX

Estes princípios governam todas as decisões de experiência do V1.
Nenhuma tela, fluxo ou interação deve contradizê-los.

**1. Uma tela, um objetivo.**
Cada tela tem exatamente uma razão de existir.
Misturar objetivos cria confusão e aumenta o esforço cognitivo do cliente.

**2. O sistema nunca obriga o cliente a percorrer etapas já conhecidas.**
Cliente recorrente não assiste ao onboarding.
Cliente que já se identificou não preenche o nome novamente.
O que foi aprendido pelo sistema é usado a favor do cliente.

**3. Reduzir cliques. Reduzir tempo. Reduzir esforço.**
Cada clique desnecessário é uma falha de design.
O objetivo é que a bebida esteja pedida em menos de 60 segundos após o QR Code.

**4. Antecipar antes de perguntar.**
Um bom garçom não pergunta o que é óbvio.
O sistema deve inferir o que pode e perguntar apenas o que não pode inferir.

**5. Transmitir confiança em cada etapa.**
O cliente nunca deve se sentir perdido.
Nunca deve duvidar se o pedido foi enviado.
Nunca deve se perguntar o que acontece a seguir.

**6. Reduzir a ansiedade de espera.**
A espera é inevitável. A ansiedade não é.
O acompanhamento do pedido existe para transformar espera em expectativa.

---

## Entidades da Jornada

Antes de descrever os fluxos, é necessário nomear as entidades que participam da experiência do cliente.
Estas entidades correspondem diretamente ao modelo de dados do sistema.

| Entidade | Descrição | Ciclo de vida |
|---|---|---|
| **Mesa** | Domínio físico do restaurante. Existe independentemente de clientes. | Permanente |
| **TableSession** | Uma ocupação da mesa. Começa quando o primeiro cliente escaneia o QR. Encerra quando o garçom fecha. | Duração da visita |
| **CustomerSession** | Presença de um cliente específico dentro de uma TableSession. | Duração da presença |
| **Pedido** | Uma transação fechada pertencente a um CustomerSession e a uma TableSession. | Imutável após envio |
| **Conta da Mesa** | Agregado financeiro de todos os pedidos da TableSession. | Encerra com a TableSession |

---

## Fluxo A — Primeiro Acesso

*O cliente nunca esteve no restaurante ou não possui histórico reconhecível pelo sistema.*

---

### Momento 0 — Chegada

**O que está acontecendo:**
O cliente chegou ao restaurante, foi acomodado e está olhando para o QR Code na mesa.

**O que ele sente:**
Curiosidade. Talvez leve hesitação — não sabe o que vai encontrar.

**O que o sistema precisa fazer:**
Ainda nada. Mas precisa estar pronto para receber.

---

### Momento 1 — QR Code escaneado

**Objetivo da etapa:** Identificar a mesa e inicializar a sessão.

**O que acontece tecnicamente:**
- O dispositivo abre `/mesa/[tableNum]`
- O sistema busca uma `TableSession` ativa para aquela mesa
- Não existe sessão ativa → cria nova `TableSession` com `status: 'active'`
- Registra `tableNum`, `tableSessionId` e `createdAt` no estado da sessão local

**O que o cliente vê:**
Uma tela de transição mínima. Sem formulários. Sem perguntas. Apenas o sistema se preparando para recebê-lo.

**O que o cliente sente:**
Que algo está acontecendo. Que ele está sendo reconhecido.

**Regra de UX:**
Nenhuma informação deve ser solicitada neste momento.
O sistema age primeiro, pergunta depois.

**Objetivo da tela:** Receber.

---

### Momento 2 — Boas-vindas

**Objetivo da etapa:** Acolher o cliente e apresentar o sistema em menos de 30 segundos.

**O que o cliente vê:**
- Identidade visual do restaurante (logo, nome, personalidade)
- Uma mensagem de boas-vindas calorosa e direta
- Uma explicação extremamente simples de como funciona:
  - "Escolha seus pratos aqui mesmo"
  - "Seu pedido vai direto para a cozinha"
  - "Acompanhe tudo pelo celular"
  - "Sem precisar chamar o garçom"
- Um único botão de ação: **"Começar"**

**O que o cliente sente:**
Acolhimento. Clareza. Confiança de que vai conseguir usar sem dificuldade.

**O que o sistema antecipa:**
Que o cliente está com sede.
Que ele quer pedir algo rapidamente.
Que ele não quer ler muito.

**Regras de UX:**
- Máximo de 4 linhas de texto explicativo
- Nenhum formulário nesta tela
- Nenhuma decisão complexa nesta tela
- O botão "Começar" é o único caminho

**Objetivo da tela:** Receber e transmitir confiança.

---

### Momento 3 — Identificação

**Objetivo da etapa:** Conhecer o cliente pelo nome para personalizar a experiência.

**O que o cliente vê:**
- Uma pergunta direta e acolhedora: *"Como posso te chamar?"*
- Um campo de texto simples para o nome
- Um botão de confirmação
- Nenhum outro campo obrigatório

**O que o cliente sente:**
Que está sendo tratado como pessoa, não como número de mesa.

**O que acontece tecnicamente:**
- `CustomerSession` é criada no Supabase com `name` e `table_session_id`
- `customerSessionId` é registrado no estado local da sessão
- `SessionStatus` avança para `customer_identified`

**Regras de UX:**
- Telefone **não** é solicitado aqui
- Campo único, sem fricção
- Nome pode ser apelido, nome completo ou qualquer identificação que o cliente escolher
- Não existe validação de formato — qualquer string não vazia é aceita

**Objetivo da tela:** Conhecer o cliente.

---

### Momento 4 — Bebidas

**Objetivo da etapa:** Permitir o primeiro pedido em menos de 60 segundos após o QR Code.

**Contexto operacional:**
Um bom garçom, ao receber uma mesa, oferece bebida imediatamente.
O cliente acabou de sentar. Está com sede. Não leu o cardápio ainda.
Este momento existe para reproduzir exatamente esse comportamento.

**O que o cliente vê:**
- Saudação personalizada com o nome: *"Olá, [Nome]. O que você vai beber?"*
- Cards visuais das bebidas disponíveis (categoria Bebidas do cardápio)
- Botão de ação rápida em cada bebida: **"Pedir"**
- Link discreto: *"Ver cardápio completo"*

**O que o cliente sente:**
Que o sistema antecipou o que ele precisava.
Que não precisa navegar para encontrar uma água ou um suco.

**O que acontece tecnicamente:**
- Bebidas são carregadas do Supabase filtrando a categoria correspondente
- Adicionar uma bebida chama `useCart.addItem()` normalmente
- O carrinho já aparece preenchido se o cliente confirmar

**Regras de UX:**
- Esta tela não é obrigatória — existe um caminho direto para o cardápio
- Não deve ser bloqueante
- Se o cliente ignorar e ir para o cardápio, não repetir esta tela

**Objetivo da tela:** Facilitar o primeiro pedido.

---

### Momento 5 — Cardápio

**Objetivo da etapa:** Permitir que o cliente explore e monte seu pedido.

**O que o cliente vê:**
- Navegação por categorias (sticky, horizontal)
- Cards de itens com foto, nome, descrição curta e preço
- Botão flutuante do carrinho quando há itens adicionados
- Botão flutuante "Minha Mesa" após o primeiro pedido enviado

**O que o cliente sente:**
Controle. Liberdade de explorar no próprio ritmo.

**O que o sistema antecipa:**
Que o cliente vai querer ver foto dos pratos.
Que ele vai comparar preços.
Que ele pode voltar ao cardápio várias vezes durante a visita.

**Regras de UX:**
- Carrinho não bloqueia a navegação
- "Minha Mesa" não bloqueia o carrinho
- Os dois coexistem como entidades independentes

**Objetivo da tela:** Escolher pratos.

---

### Momento 6 — Carrinho

**Objetivo da etapa:** Revisar o pedido antes de enviar.

**O que o cliente vê:**
- Lista de itens selecionados com quantidade e preço
- Controles de quantidade (+ e −)
- Total do pedido atual
- Botão **"Continuar"**

**O que o cliente sente:**
Controle sobre o que está pedindo antes de confirmar.

**Regras de UX:**
- Carrinho é temporário — representa apenas o pedido atual em montagem
- Não exibe pedidos anteriores da visita (isso é responsabilidade do "Minha Mesa")
- Pode ser esvaziado e remontado quantas vezes o cliente quiser

**Objetivo da tela:** Revisar antes de confirmar.

---

### Momento 7 — Checkout

**Objetivo da etapa:** Confirmar e enviar o pedido para a cozinha.

**O que o cliente vê:**
- Resumo do pedido
- Campo de mesa (já preenchido automaticamente pelo QR Code — não editável)
- Nome já preenchido automaticamente (vindo da `CustomerSession`)
- Botão **"Confirmar pedido"**

**O que o cliente sente:**
Que o sistema já sabe quem ele é e onde ele está.
Que confirmar é o único passo necessário.

**O que acontece tecnicamente:**
- `POST /api/orders` com `table_session_id`, `customer_session_id`, itens e total
- API retorna `{ id, created_at }`
- `useOrderTracker.addOrder()` registra o pedido localmente
- `useAccount.addOrder()` atualiza o subtotal da conta (chamado pelo Checkout, não pelo tracker)
- Carrinho é limpo
- `SessionStatus` avança para `tracking`

**Regras de UX:**
- Nome e mesa nunca devem ser solicitados novamente após a identificação inicial
- Telefone não é solicitado aqui
- Nenhum campo obrigatório além dos preenchidos automaticamente
- Confirmação deve ser um único toque

**Objetivo da tela:** Enviar o pedido.

---

### Momento 8 — Pedido enviado

**Objetivo da etapa:** Confirmar o recebimento e eliminar a ansiedade imediata.

**O que o cliente vê:**
- Número do pedido em destaque
- Mensagem de confirmação calorosa: *"Valeu, [Nome]! Seu pedido já está na cozinha."*
- Horário do pedido
- Tempo estimado de preparo
- Caminho claro para acompanhar: *"Acompanhar pedido"*

**O que o cliente sente:**
Certeza de que o pedido chegou.
Alívio. Expectativa positiva.

**Regras de UX:**
- Esta tela não deve exigir nenhuma ação do cliente para desaparecer
- Deve oferecer caminho natural para "Minha Mesa" ou de volta ao cardápio
- Não deve bloquear novos pedidos

**Objetivo da tela:** Confirmar e tranquilizar.

---

### Momento 9 — Acompanhamento

**Objetivo da etapa:** Transformar o tempo de espera em expectativa, eliminando a ansiedade.

**O que o cliente vê:**
No `SessionDrawer` ("Minha Mesa"):
- Card do pedido com status atual
- Barra de progresso visual: Recebido → Em preparo → Pronto → Entregue
- Texto correspondente a cada status:
  - `pending` → *"Recebido — seu pedido está na fila"*
  - `preparing` → *"Em preparo — a cozinha está trabalhando nisso"*
  - `ready` → *"Pronto — o garçom já está levando até você"*
  - `delivered` → *"Entregue — bom apetite!"*
- Atualização automática via Realtime (sem refresh)

**O que o cliente sente:**
Que está sendo cuidado.
Que não precisa chamar ninguém para saber onde está seu pedido.

**Regras de UX:**
- O cliente nunca deve ver o termo operacional "Pronto para retirada" — esse é linguajar interno da cozinha/garçom
- O status deve ser traduzido para linguagem do cliente em cada etapa
- A atualização deve acontecer automaticamente, sem nenhuma ação do cliente

**Objetivo da tela:** Reduzir ansiedade de espera.

---

### Momento 10 — Durante a refeição

**O que acontece:**
O cliente pode fazer novos pedidos a qualquer momento.
Cada novo pedido segue o mesmo fluxo do Momento 5 ao Momento 9.
O "Minha Mesa" acumula todos os pedidos da visita.

**O que o sistema garante:**
- O carrinho está sempre limpo e pronto para um novo pedido
- O histórico da visita está sempre acessível no "Minha Mesa"
- O subtotal da conta cresce automaticamente a cada pedido confirmado

---

### Momento 11 — Conta da Mesa

**Objetivo da etapa:** Encerrar a experiência de forma clara e sem atrito.

**O que o cliente vê:**
No `SessionDrawer`, seção "Conta":
- Lista de todos os pedidos da visita
- Subtotal acumulado
- Botão **"Pedir conta"**
- Botão **"Chamar garçom"** (ação auxiliar)

**O que acontece ao pedir conta:**
- `TableSession.status` avança para `'closing'` localmente
- Uma notificação é enviada ao painel do garçom (V1: POST para uma rota de notificação, ou update de campo na `table_sessions`)
- O cliente vê confirmação: *"Conta solicitada. O garçom já está a caminho."*

**O que o cliente sente:**
Que foi fácil. Que não precisou levantar, acenar ou esperar para pedir a conta.

**Regras de UX:**
- Após pedir conta, o botão some e é substituído pela mensagem de confirmação
- O cliente ainda pode chamar o garçom mesmo após pedir a conta

**Objetivo da tela:** Encerrar a experiência.

---

### Momento 12 — Encerramento

**O que acontece:**
O garçom encerra a `TableSession` no painel operacional.
`TableSession.status` avança para `'closed'`.
`SessionStatus` no cliente avança para `'paid'`.

**O que o cliente vê (se ainda com o celular aberto):**
Uma mensagem de encerramento: *"Obrigado pela visita, [Nome]. Até a próxima!"*

**O que o cliente sente:**
Que foi bem atendido do início ao fim.

---

## Fluxo B — Cliente Recorrente

*O sistema identificou que já existe uma `TableSession` ativa para esta mesa, ou que o cliente já possui histórico reconhecível.*

---

### Princípio do Fluxo B

> O sistema nunca deve obrigar o cliente a percorrer etapas já conhecidas.

Um cliente que já conhece o sistema e o restaurante não deve assistir ao onboarding.
Não deve ler explicações que já leu.
A experiência deve ser imediata, pessoal e eficiente.

---

### Momento 1 — QR Code escaneado (mesa com sessão ativa)

**O que acontece tecnicamente:**
- O dispositivo abre `/mesa/[tableNum]`
- O sistema detecta `TableSession` ativa para aquela mesa
- Verifica se existe `CustomerSession` local (Zustand) com `tableSessionId` correspondente

**Dois subcasos:**

#### Subcaso B1 — Mesmo dispositivo (sessão local existe)

O cliente reabriu o browser ou voltou à aba.
`CustomerSession` local ainda está no Zustand.

**O que o cliente vê:**
Retorna diretamente para onde estava — cardápio, "Minha Mesa" ou acompanhamento.
Sem nenhuma pergunta. Sem nenhuma tela intermediária.

**O que o cliente sente:**
Que o sistema "lembrou" dele.

#### Subcaso B2 — Novo dispositivo ou sessão local perdida

O cliente trocou de dispositivo ou fechou o browser.
Não existe `CustomerSession` local.
Mas existe `TableSession` ativa no banco.

**O que o cliente vê:**
Uma tela simples com duas opções:
- *"Já estou nessa mesa"* — entra na sessão existente como novo `CustomerSession`
- *"Primeira vez nessa mesa"* — tecnicamente idêntico, apenas UX mais acolhedora

**O que o cliente sente:**
Que o sistema reconhece a situação sem criar fricção.

**Regras de UX:**
- Nenhuma das duas opções é "errada" tecnicamente — ambas criam um novo `CustomerSession`
- A distinção existe apenas para a mensagem de boas-vindas ser adequada
- Não exige login, senha ou confirmação por e-mail

---

### Momento 2 — Boas-vindas recorrente

**O que o cliente vê:**
- *"Que bom ter você de volta, [Nome]."* (se nome disponível)
- Atalhos rápidos baseados no histórico:
  - *"Repetir último pedido"* (se histórico disponível)
  - *"Bebidas"*
  - *"Novidades"*
  - *"Cardápio completo"*

**O que o cliente sente:**
Reconhecimento. Velocidade. Que não precisa começar do zero.

**Regras de UX:**
- Onboarding não é exibido
- Identificação não é solicitada novamente se o nome já é conhecido
- A tela deve ser mínima — o cliente quer agir, não ler

---

### Momento 3 em diante — Fluxo idêntico ao Fluxo A

A partir da escolha de bebidas ou cardápio, o fluxo é idêntico ao Fluxo A a partir do Momento 4.

---

## Resumo — Objetivos por Tela

| Tela | Objetivo único | Fluxo |
|---|---|---|
| Transição QR | Inicializar sessão | A e B |
| Boas-vindas (novo) | Receber e transmitir confiança | A |
| Boas-vindas (recorrente) | Reconhecer e acelerar | B |
| Identificação | Conhecer o cliente pelo nome | A |
| Bebidas | Facilitar o primeiro pedido | A e B |
| Cardápio | Escolher pratos | A e B |
| Carrinho | Revisar antes de confirmar | A e B |
| Checkout | Enviar o pedido | A e B |
| Pedido enviado | Confirmar e tranquilizar | A e B |
| Minha Mesa | Acompanhar e ter visão geral da visita | A e B |
| Conta da Mesa | Encerrar a experiência | A e B |

---

## Tradução de Status para o Cliente

O cliente nunca vê a linguagem operacional interna do sistema.
Esta tabela é a referência oficial de tradução.

| Status interno | Texto exibido ao cliente |
|---|---|
| `pending` | *"Recebido — seu pedido está na fila"* |
| `preparing` | *"Em preparo — a cozinha está trabalhando nisso"* |
| `ready` | *"Pronto — o garçom já está levando até você"* |
| `delivered` | *"Entregue — bom apetite!"* |

---

## Decisões de Produto Registradas

| Decisão | Definição |
|---|---|
| Telefone | Não obrigatório na entrada. Solicitado apenas em contextos de valor real (fidelidade, pagamento) |
| Onboarding | Exibido apenas no primeiro acesso |
| Mesa | Identificada via QR Code. Preenchida automaticamente em todos os contextos seguintes |
| Nome | Único campo obrigatório na identificação |
| Pedidos | Múltiplos pedidos permitidos na mesma visita sem reiniciar o fluxo |
| Conta | Pertence à mesa. Acumulada automaticamente. Encerrada pelo garçom |
| Encerramento de sessão | Responsabilidade exclusiva do garçom. Nunca por timeout |

---

## Pendências para ESP-02

As seguintes questões de UX surgem naturalmente deste documento e precisam ser representadas no fluxograma de estados:

1. **Transição de `table_identified` para `customer_identified`:** hoje `useSession` não distingue esses dois momentos. O fluxograma de estados (ESP-02) deve mapear exatamente quando e como cada transição ocorre.

2. **Detecção de cliente recorrente:** em V1, a recorrência é detectada pela presença de `CustomerSession` local no Zustand. Em V2, será por telefone ou ID no banco. O fluxograma deve deixar esse ponto explícito como extensão futura sem quebrar o fluxo atual.

3. **Notificação ao garçom quando conta é solicitada:** o mecanismo exato (campo `status` na `table_sessions`, tabela separada de eventos, ou Realtime) precisa ser definido na ESP-03 (schema) antes de ser especificado.
