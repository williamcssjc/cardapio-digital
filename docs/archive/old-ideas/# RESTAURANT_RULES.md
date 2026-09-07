# RESTAURANT_RULES.md

# Parrilla OS

## Objetivo

Este documento define as regras operacionais de um restaurante.

O sistema deve se adaptar ao restaurante.

Nunca o contrário.

Todas as funcionalidades devem respeitar estas regras antes de qualquer decisão técnica.

---

# Filosofia

O Parrilla OS não é apenas um software.

Ele é um garçom digital, um maître digital, um gerente operacional e um assistente da cozinha.

Toda funcionalidade deve melhorar a experiência do cliente e facilitar o trabalho da equipe.

Se uma funcionalidade não melhorar a operação do restaurante, ela não deve existir.

---

# A Mesa é a Unidade Central

Para o restaurante, o elemento mais importante não é o pedido.

É a mesa.

Tudo acontece ao redor dela.

Uma mesa possui:

- clientes
- sessões
- pedidos
- conta
- atendimento
- histórico

O sistema sempre deve enxergar primeiro a mesa.

Depois os pedidos.

Nunca o contrário.

---

# O Pedido NÃO pertence ao Restaurante

Todo pedido pertence a um cliente.

Mesmo quando uma única pessoa faz o pedido para toda a mesa.

Cada prato precisa possuir um responsável.

Exemplo:

Mesa 12

Carlos
- Picanha

Fernanda
- Salada Caesar

João
- Hambúrguer

Assim, quando o garçom levar os pratos:

"Carlos, sua picanha."

Sem perguntar:

"Quem pediu a picanha?"

---

# O Garçom enxerga Mesas

Na operação real:

o garçom NÃO pensa em pedidos.

Ele pensa em mesas.

Depois ele olha os pedidos daquela mesa.

O painel do garçom deve funcionar exatamente assim.

Mesa 8

↓

Pedidos ativos

↓

Clientes

↓

Conta

---

# A Cozinha enxerga Produção

A cozinha não precisa saber quem pagará a conta.

Ela precisa produzir.

Ela deve enxergar:

Mesa

Pedido

Itens

Tempo

Prioridade

Nada além disso.

---

# O Cliente enxerga apenas sua experiência

O cliente nunca deve pensar em processos internos.

Ele deve apenas sentir que tudo acontece naturalmente.

Exemplo:

"Nossa bebida já está vindo."

"O garçom já está trazendo seu pedido."

Nunca:

"Status READY"

Nunca:

"Pedido #145"

O sistema fala a linguagem do cliente.

---

# Toda Mesa possui Sessões

Uma mesa pode possuir uma ou várias sessões.

Exemplos:

Casal

Uma sessão.

Família

Uma sessão.

Dois casais

Duas sessões.

Confraternização

Várias sessões.

O sistema precisa suportar todas.

---

# Uma Sessão representa um grupo

Sessão NÃO é cliente.

Sessão NÃO é pedido.

Sessão representa um grupo que dividirá uma conta.

Exemplo:

Mesa 20

Sessão A

Carlos

Fernanda

Sessão B

João

Amanda

Cada sessão possui:

- pedidos
- subtotal
- divisão
- pagamento

---

# Cliente

Cada cliente possui identidade própria.

Campos mínimos:

Nome

Telefone

ou Login Social

No futuro:

Histórico

Preferências

Restrições

Favoritos

Aniversário

Frequência

---

# Entrada no Restaurante

Fluxo oficial:

Cliente chega

↓

Senta na mesa

↓

Escaneia QR Code

↓

Mesa identificada

↓

Sessão criada

↓

Boas-vindas

↓

Cardápio

O Checkout nunca deverá perguntar:

"Qual sua mesa?"

Essa informação já deve existir.

---

# Primeiro Acesso

No primeiro acesso:

Apresentar:

Boas-vindas

Como funciona

Tempo médio

Como pedir

Como chamar garçom

Como fechar conta

Como acompanhar pedido

Depois:

Entrar no cardápio.

---

# Retorno do Cliente

Quando o cliente já conhece a casa:

Não repetir tutorial.

Mostrar:

"Bem-vindo de volta."

Sugestões.

Pedidos favoritos.

Últimos pedidos.

Promoções relevantes.

Tudo com poucos cliques.

---

# Bebidas possuem prioridade

Na operação real:

Cliente chega com sede.

O garçom normalmente oferece bebida primeiro.

O sistema deve facilitar isso.

Sempre.

Nunca obrigar o cliente a navegar o cardápio inteiro.

---

# Pedido Compartilhado

Uma pessoa pode pedir para várias.

Exemplo:

Porção.

Pizza.

Vinho.

No fechamento da conta.

O sistema deve permitir dividir o item entre participantes.

Sem cálculos manuais.

---

# Conta

Conta pertence à sessão.

Nunca ao pedido.

Uma sessão possui vários pedidos.

Uma conta possui várias sessões.

---

# Fluxo Oficial do Pedido

Pendente

↓

Em preparo

↓

Pronto

↓

Entregue

↓

Finalizado

Sem exceções.

---

# Cancelamentos

Pedidos cancelados:

Não entram em subtotal.

Não aparecem como ativos.

Não entram em métricas.

Devem permanecer apenas para auditoria.

---

# Atendimento Premium

O sistema deve agir como um excelente garçom.

Antecipar necessidades.

Facilitar escolhas.

Evitar dúvidas.

Reduzir espera.

Eliminar perguntas desnecessárias.

---

# O Sistema nunca substitui pessoas

Ele potencializa pessoas.

Garçom continua atendendo.

Cozinha continua produzindo.

Gerente continua gerenciando.

O sistema remove burocracia.

---

# Princípio de Ouro

Toda decisão de produto deve responder:

"Isto melhora a experiência do cliente?"

e

"Isto melhora a operação do restaurante?"

Se ambas forem SIM,

a funcionalidade merece existir.

Caso contrário,

ela não pertence ao Parrilla OS.

---

# Visão de Longo Prazo

O Parrilla OS deverá evoluir para controlar todo o restaurante.

Incluindo:

- Atendimento
- Pedidos
- Cozinha
- Garçom
- Caixa
- Financeiro
- Estoque
- Compras
- Funcionários
- Escalas
- CRM
- Fidelidade
- Delivery
- Eventos
- Reservas
- BI
- Inteligência Artificial

Sempre mantendo o mesmo princípio:

Tecnologia invisível.

Experiência inesquecível.

Operação extremamente eficiente.

Operação extremamente eficiente.

Este é um documento que considero fundamental. Junto com CUSTOMER_JOURNEY_V1.md, ele passa a ser uma das bases do Parrilla OS.

Na minha visão, o projeto agora começa a ganhar uma identidade clara:

PROJECT_CONTEXT.md → onde o projeto está.
ROADMAP.md → para onde ele vai.
CUSTOMER_JOURNEY_V1.md → experiência completa do cliente.
RESTAURANT_RULES.md → como um restaurante funciona na vida real.
ARCHITECTURE.md → como o software implementa essas regras.

Com esses cinco documentos, qualquer IA ou desenvolvedor consegue entender o projeto antes de escrever uma única linha de código. Isso reduz retrabalho e mantém a arquitetura consistente ao longo da evolução do sistema.