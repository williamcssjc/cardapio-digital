# Inventário de cardápio

Auditoria realizada em 25/07/2026. Este documento descreve o conteúdo encontrado; não valida comercialmente o cardápio.

## Critério de confiança

- **Alta**: registro atual no Supabase do projeto.
- **Média**: canal oficial ou material da marca, mas sem confirmação de vigência.
- **Baixa**: agregador, avaliação de cliente ou inferência visual.
- **Ausente**: informação não localizada.

## Fonte operacional: Supabase

Consulta somente leitura às tabelas `categories` e `menu_items` em 25/07/2026.

| Categoria | Produto | Descrição cadastrada | Preço | Disponível no banco | Horário/disponibilidade específica | Imagem | Confiança |
|---|---|---|---:|---|---|---|---|
| Entradas | Batata Rústica | Batatas crocantes com ervas e molho da casa | R$ 26,90 | Sim | Ausente | Ausente | Alta |
| Parrilla | Chorizo Angus | Corte argentino grelhado na parrilla com acompanhamentos da casa | R$ 89,90 | Sim | Ausente | Ausente | Alta |
| Parrilla | Bife de Tira | Corte premium assado na brasa com sal parrillero | R$ 94,90 | Sim | Ausente | Ausente | Alta |
| Massas | Fettuccine Alfredo | Massa artesanal ao molho cremoso parmesão | R$ 54,90 | Sim | Ausente | Ausente | Alta |
| Hambúrgueres | Burger +54 | Hambúrguer artesanal com cheddar, bacon e molho especial | R$ 42,90 | Sim | Ausente | Ausente | Alta |
| Bebidas | Coca-Cola 350ml | Refrigerante lata gelado | R$ 7,00 | Sim | Ausente | Ausente | Alta |
| Sobremesas | Pudim Artesanal | Pudim cremoso com calda de caramelo | R$ 18,90 | Sim | Ausente | Ausente | Alta |

As seis categorias acima também são registros atuais do Supabase. O campo `available = true` confirma apenas o estado cadastrado no momento da consulta; não confirma estoque, unidade, dia da semana ou faixa de horário.

## Materiais externos encontrados

### Cardápio de usuário no Restaurant Guru

Fonte: [Restaurant Guru — menu do +54 Parrilla](https://restaurantguru.com.br/Calle54-Sao-Jose-dos-Campos-2/menu).

O agregador exibe uma versão enviada por usuários há cerca de um ano e outra atribuída ao proprietário há cinco anos. Ela cita categorias e itens adicionais, mas o próprio site alerta que nomes e preços podem ter mudado. Portanto:

- não é fonte válida para preços ou disponibilidade atuais;
- pode orientar uma futura conferência com o restaurante;
- nenhum item exclusivo dessa fonte foi incluído na proposta de seed como produto confirmado.

### Peça promocional local

Fonte: `public/images/bem-vindo-parrilla_files/699905967_18414904726180227_7264629547623066621_n.jpg`.

A peça mostra “Desayuno / Café da Manhã Colonial Argentino”, domingo, das 08h às 11h, R$ 69 por pessoa e R$ 119 por casal, associado à Unidade Aquarius. A data e a vigência não estão confirmadas. O conteúdo é histórico/promocional e não deve alimentar o cardápio sem validação humana.

### Avaliações e agregadores

Fontes:

- [Wanderlog — +54 Parrilla](https://wanderlog.com/pt/place/details/2829423/54-parrilla)
- [Restaurant Guru — Unidade Aquarius](https://restaurantguru.com.br/54-Parrilla-Jd-Aquarius-Sao-Jose-dos-Campos)
- [Restaurant Guru — Colinas](https://restaurantguru.com.br/Calle54-Sao-Jose-dos-Campos-2)

Relatos mencionam, entre outros, T-bone, El Preferido, fraldinha, sanduíches, cerveja e vinho. São relatos de clientes ou classificações automáticas, não confirmação de cardápio atual. Servem apenas como lista de perguntas para o restaurante.

## Inconsistências relevantes

1. O Supabase possui apenas sete produtos; fontes externas indicam um cardápio muito mais amplo.
2. Todos os sete registros têm `image_url = null`.
3. O banco não informa unidade, turno, dias de disponibilidade, destaque, assinatura da casa ou harmonização.
4. Só há uma bebida confirmada. Não é possível selecionar quatro bebidas iniciais reais sem aprovação de conteúdo adicional.
5. A promoção de café da manhã e os horários publicados por agregadores não podem ser tratados como atuais.

