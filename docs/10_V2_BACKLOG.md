# Backlog V2

Status: **fora do escopo congelado da V1**

Prioridade é aproximada e só será reavaliada depois da Release Candidate.

## Experiência e CRM

### Cliente recorrente e CRM — alta

- **Problema:** cada visita atual começa sem memória global do cliente.
- **Ideia:** perfil recorrente, preferências, histórico consentido e segmentação.
- **Fora da V1:** exige identidade, consentimento, retenção e novo domínio.
- **Dependências:** autenticação/identidade, políticas de privacidade e modelo multi-tenant.

### Fidelidade, favoritos e campanhas — média

- **Problema:** não há relacionamento depois da visita.
- **Ideia:** programa de fidelidade, favoritos e comunicação autorizada por WhatsApp/SMS.
- **Fora da V1:** não é necessário para operar a mesa.
- **Dependências:** CRM, consentimento, canais externos e analytics.

### IA contextual — média

- **Problema:** recomendações atuais são editoriais e determinísticas.
- **Ideia:** personalizar sugestões por contexto, histórico e disponibilidade.
- **Fora da V1:** curadoria atual prova a experiência sem risco algorítmico.
- **Dependências:** dados confiáveis, avaliação, explicabilidade e fallback.

## Recepção e acomodação

### Guest Arrivals — alta

- **Problema:** a sessão nasce quando a mesa é reconhecida; não existe entidade anterior à acomodação.
- **Ideia:** registrar chegada antes da TableSession.
- **Fora da V1:** não é necessário no fluxo direto por QR da mesa.
- **Dependências:** recepção, reservas e estados de acomodação.

### Reservas e fila de espera — alta

- **Problema:** disponibilidade e espera são externas ao sistema.
- **Ideia:** reserva, check-in, fila e previsão de espera.
- **Fora da V1:** amplia a jornada antes da mesa.
- **Dependências:** GuestArrival, Table física, calendário e notificações.

### Motor de acomodação e combinação de mesas — média

- **Problema:** não há cálculo automático de capacidade.
- **Ideia:** sugerir mesas ou combinações conforme grupo e salão.
- **Fora da V1:** requer modelo físico completo da unidade.
- **Dependências:** tables, layout, reservas e regras operacionais.

## Operação

### Produção individual por item — alta

- **Problema:** V1 agrega execução por pedido + estação.
- **Ideia:** ProductionTask e DeliveryTask por item ou lote.
- **Fora da V1:** a granularidade atual atende o fluxo inicial com menor complexidade.
- **Dependências:** migration, UI, compatibilidade histórica e nova projeção de pedido.

### Pickup e deslocamento explícitos — média

- **Problema:** `ready` até `delivered_at` não distingue retirada e transporte.
- **Ideia:** `picked_up`, `delivering` ou eventos equivalentes.
- **Fora da V1:** adicionaria estados antes de haver evidência operacional.
- **Dependências:** Garçom 2.0 e simulação real.

### Estações especializadas — média

- **Problema:** somente Bar, Kitchen e Service estão contratados.
- **Ideia:** Coffee, Dessert, Grill, Pizza, Sushi e Bakery configuráveis.
- **Fora da V1:** piloto não exige painéis separados.
- **Dependências:** administração de estações e permissões.

### Inteligência operacional — média

- **Problema:** alertas atuais são limiares determinísticos.
- **Ideia:** heat map, previsão de gargalos, prioridade e próxima ação sugerida.
- **Fora da V1:** depende de histórico real e telemetria.
- **Dependências:** analytics, eventos confiáveis e simulação.

## Gestão

### Multiunidade completa — alta

- **Problema:** contratos são configuráveis, mas a implantação é única.
- **Ideia:** rede, unidades, usuários, permissões e configuração remota.
- **Fora da V1:** piloto valida primeiro uma operação.
- **Dependências:** tenant resolution, RLS e painel administrativo.

### Experience Builder — baixa

- **Problema:** ExperienceProfile é alterado em código.
- **Ideia:** configurar narrativa, seções, curadoria e tema por painel.
- **Fora da V1:** gestão de catálogo é suficiente para a primeira operação.
- **Dependências:** multi-tenant, versionamento e preview/publicação.

### Funcionários e escalas — baixa

- **Problema:** painéis não representam escala ou capacidade do time.
- **Ideia:** usuários, turnos, estações e produtividade.
- **Fora da V1:** operação atual é por painel, não por workforce management.
- **Dependências:** autenticação operacional e analytics.

## Financeiro

### Pagamento integrado — alta

- **Problema:** V1 encerra a conta operacionalmente, mas não processa pagamento.
- **Ideia:** Pix, cartão e status de pagamento.
- **Fora da V1:** envolve provedores, conciliação e risco financeiro.
- **Dependências:** Account persistida, Payment, segurança e webhook.

### Divisão de conta e gorjeta — média

- **Problema:** conta pertence à mesa e não é dividida por pessoa/item.
- **Ideia:** divisão avançada, gorjeta e múltiplos pagadores.
- **Fora da V1:** fechamento simples é suficiente para validar a operação.
- **Dependências:** Payment e regras comerciais.

### Fiscal, caixa e PDV — alta

- **Problema:** sistema não emite fiscal nem controla caixa.
- **Ideia:** integração com PDV/ERP, fiscal e conciliação.
- **Fora da V1:** depende de fornecedores e legislação.
- **Dependências:** APIs externas, contratos e segurança.

## Estoque e fornecedores

### Estoque e disponibilidade automática — alta

- **Problema:** `available` é atualizado manualmente.
- **Ideia:** ingredientes, baixas, alertas e indisponibilidade automática.
- **Fora da V1:** exige ficha técnica e movimentação confiável.
- **Dependências:** catálogo administrável, insumos e eventos de venda.

### Ficha técnica, custos e fornecedores — média

- **Problema:** preço existe sem custo ou composição operacional.
- **Ideia:** receita, custo, margem, compra e fornecedor.
- **Fora da V1:** é gestão de backoffice.
- **Dependências:** estoque e permissões administrativas.

## Analytics

### Métricas avançadas — média

- **Problema:** Gerente mostra operação atual, não análise histórica.
- **Ideia:** ticket por grupo, tempo por etapa, ocupação, conversão e produtos.
- **Fora da V1:** exige política de eventos e dados acumulados.
- **Dependências:** telemetria, privacidade e warehouse/queries.

### Previsões — baixa

- **Problema:** não há previsão de demanda ou atraso.
- **Ideia:** forecast de produção, ocupação e gargalos.
- **Fora da V1:** sem dados suficientes para qualidade.
- **Dependências:** analytics histórico e avaliação contínua.

## Canais e integrações

### Delivery, iFood e marketplace — média

- **Problema:** produto opera consumo presencial.
- **Ideia:** consolidar pedidos externos e entrega.
- **Fora da V1:** muda atores, endereço, logística e SLA.
- **Dependências:** integrações, catálogo sincronizado e fiscal.

### App nativo — baixa

- **Problema:** experiência atual é web.
- **Ideia:** aplicativo para equipe ou cliente recorrente.
- **Fora da V1:** PWA/web atende a validação inicial.
- **Dependências:** necessidade comprovada e estratégia mobile.

## Regra de promoção para V1 futura

Nenhum item deste arquivo muda de escopo sem:

1. problema validado;
2. decisão do Product Owner;
3. impacto arquitetural documentado;
4. atualização explícita do freeze;
5. remoção deste backlog para evitar duplicação.
