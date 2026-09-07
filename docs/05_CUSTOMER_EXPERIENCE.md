# Experiência do cliente

Status: **jornada oficial da V1**

## Filosofia

O cliente está no restaurante para viver a refeição, a companhia e o ambiente. O sistema deve ser breve, previsível e quase invisível.

A jornada oferece contexto e autonomia. Ela nunca deve parecer cadastro, demonstração de software ou sequência obrigatória de telas.

## Fluxo oficial

```text
QR da mesa
→ reconhecimento da mesa
→ criação/reutilização da TableSession
→ nome do responsável + quantidade de pessoas
→ oferta rápida de bebida
→ boas-vindas
→ pergunta de familiaridade
├─ já conhece → catálogo
└─ primeira vez → apresentação da casa
                   → recomendações guiadas ou exploração
→ catálogo / busca / Product Experience
→ carrinho
→ checkout
→ pedido
→ Minha Mesa
→ pedidos adicionais
→ conta
→ sessão encerrada
→ obrigado
```

## 1. QR e mesa — implementado

Cada QR aponta para `/mesa/[tableNum]`. O número é validado conforme `OperationalRules`. O QR identifica somente o lugar físico.

`TableSessionGate` espera a hidratação local e então busca uma sessão ativa ou cria uma nova. Concorrência de criação é reconciliada pela unicidade no banco.

## 2. Identificação leve — implementado

O cliente informa:

- nome do responsável;
- quantidade de pessoas em um campo numérico digitável.

O valor aceita somente inteiros positivos dentro da faixa configurada e é descrito como estimativa. Nome e `party_size` são persistidos na sessão correspondente e refletidos no Zustand.

Não existe escolha rígida de “família”, “casal” ou “individual”.

## 3. Oferta rápida — implementado

Antes da apresentação longa, o sistema oferece até três bebidas configuradas por identificadores semânticos.

Ao confirmar:

- o produto é validado no servidor;
- um pedido é criado imediatamente;
- preço, estação e modo vêm do catálogo persistido;
- uma chave idempotente evita repetição;
- o pedido entra no Bar sem esperar o carrinho principal;
- cliente, conta e acompanhamento local recebem o pedido criado.

Pular a oferta não bloqueia a experiência.

## 4. Boas-vindas e familiaridade — implementado

A casa recebe o cliente e pergunta se é sua primeira visita.

- **Já conheço:** libera o catálogo diretamente.
- **Sim, quero conhecer:** inicia apresentação curta e contextual.

O histórico do navegador é sincronizado com os passos da jornada para que voltar não reabra o fluxo legado.

## 5. Apresentação e jornada guiada — implementado

O ExperienceProfile fornece narrativa e recomendações sem IDs de banco. A configuração atual apresenta:

- um momento de abertura;
- um momento principal;
- alternativas limitadas;
- opção permanente de explorar livremente.

Adicionar uma recomendação utiliza o mesmo carrinho. Declinar ou explorar não cria estado operacional artificial.

## 6. Catálogo — implementado

- 11 categorias ordenadas;
- 57 produtos;
- First Gesture para `Bebidas` via papel `bebidas`;
- Highlights e apresentação da casa;
- busca por nome, descrição e categoria, sem diferença de caixa ou acento;
- navegação sticky;
- fallback estável para ausência de imagem;
- Product Experience em Dialog;
- troca de produto dentro do Dialog por recomendação.

## 7. Carrinho e checkout — implementado com pendência

O carrinho é intenção local. O checkout envia os IDs e quantidades; o servidor resolve os dados confiáveis.

Pendência de V1: o Checkout ainda exige telefone, embora a recepção inicial seja deliberadamente leve. O PATCH-032 deve reconciliar essa exigência sem duplicar identificação.

## 8. Pedido e acompanhamento — implementado

Cada envio cria um Order incremental. O cliente pode continuar escolhendo depois do primeiro pedido.

“Minha Mesa” carrega pedidos ligados à `customer_session`, traduz estados operacionais para linguagem humana e recebe atualizações Realtime.

Entrega parcial de uma estação não encerra prematuramente um pedido misto.

## 9. Conta — parcialmente implementado

Existe:

- subtotal local dos pedidos conhecidos;
- quantidade de itens;
- ação de pedir a conta;
- mudança da TableSession para `closing`;
- mensagem local de conta solicitada.

Ainda falta:

- conta persistida e consolidada pela TableSession;
- verificação de produção/entregas pendentes;
- confirmação operacional de fechamento;
- integração com eventual PDV;
- liberação segura da mesa.

Pagamento dentro do sistema não pertence à V1.

## 10. Obrigado — implementado como reação ao fechamento

Quando `table_sessions.status` muda para `closed`, o listener:

1. limpa Session, OrderTracker, Account e Cart;
2. limpa stores persistidas relevantes;
3. substitui a rota por `/obrigado`.

O mecanismo existe, mas depende do fluxo operacional de fechamento que será completado no PATCH-030.

## Continuidade e falhas

- refresh recupera sessão e jornada pelo Zustand persistido;
- `ActiveTableSessionGate` confirma sessão antes do catálogo;
- sessão ausente retorna à mesa ou à entrada compatível;
- catálogo indisponível apresenta estado editorial seguro;
- referência editorial ausente oculta somente o bloco correspondente;
- erro de bebida permite tentar novamente ou seguir;
- produto sem imagem mantém geometria e fallback.

## Planejado antes da RC

- Garçom por mesa e entrega parcial clara;
- conta e fechamento completos;
- remoção de ações e rotas legadas concorrentes;
- reconciliação do telefone;
- fotografias necessárias à demonstração;
- QA da jornada em dispositivos reais e condições adversas.

## Não implementado

- reconhecimento de cliente recorrente;
- personalização por histórico;
- reservas e fila;
- divisão avançada de conta;
- pagamento integrado;
- fidelidade e CRM;
- IA recomendando autonomamente.
