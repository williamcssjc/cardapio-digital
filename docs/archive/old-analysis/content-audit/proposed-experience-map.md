# Mapa proposto da experiência

Este mapa organiza conteúdo existente e pendências. As frases marcadas como **sugestão editorial** não são fatos do restaurante.

## 1. Recepção

- **Conteúdo confirmado no produto:** mesa identificada e quantidade de pessoas fazem parte do fluxo atual.
- **Imagem proposta:** `public/images/entrada.jpeg`.
- **Sugestão editorial:** usar uma saudação curta e hospitalidade silenciosa, sem apresentar preços ou categorias.
- **Pendente:** aprovação final do texto e dos direitos da fotografia.

## 2. Primeiro gesto: bebida

O Supabase confirma somente **Coca-Cola 350ml — R$ 7,00**. Não há base precisa para quatro recomendações reais.

| Posição | Conteúdo proposto | Classificação | Fonte |
|---|---|---|---|
| 1 | Coca-Cola 350ml | Informação confirmada | Supabase `menu_items.id = 6` |
| 2 | Bebida a definir | Informação ausente | Catálogo não fornecido |
| 3 | Bebida a definir | Informação ausente | Catálogo não fornecido |
| 4 | Bebida a definir | Informação ausente | Catálogo não fornecido |

Vinho e cerveja aparecem em imagens e avaliações, mas marca, rótulo, volume, preço e disponibilidade não estão confirmados. Não devem ser oferecidos pelo sistema ainda.

## 3. Descobrindo a casa

- **Informação confirmada em canal oficial indexado:** “Autêntica Parrilla Argentina”, no [Linktree oficial](https://linktr.ee/54parrilla).
- **Informação confirmada por fonte institucional externa:** matéria do [Colinas Shopping](https://www.colinasshopping.com.br/shopping/blog/%26cat%3Dgastronomia) descreve churrasco em estilo portenho e 11 anos de operação no shopping em agosto de 2025.
- **Sugestão editorial:** apresentar a parrilla argentina, a brasa e a hospitalidade em duas ou três frases.
- **Não usar sem aprovação:** narrativa de fundação, chef, origem familiar, técnicas exclusivas ou promessa de ingredientes.

## 4. Destaques da casa

- **Candidatos confirmados no banco:** Chorizo Angus e Bife de Tira.
- **Imagem de categoria:** `709101656...jpg`.
- **Sugestão editorial:** destacar os dois itens somente como seleções atuais da categoria Parrilla.
- **Pendente:** o banco não possui campo ou evidência de “mais pedido”, “assinatura” ou destaque editorial. O restaurante precisa aprovar esse status.

## 5. Exploração por categorias

Ordem proposta, preservando as categorias reais: Entradas, Parrilla, Massas, Hambúrgueres, Bebidas e Sobremesas.

- Parrilla já possui candidata visual.
- Todas as demais categorias precisam de fotografia confirmada.
- A ordem é uma sugestão editorial, não uma regra de negócio.

## 6. Descoberta dos pratos

Os sete registros do Supabase já fornecem nome, descrição, preço e disponibilidade geral. Faltam:

- fotografia;
- peso/volume, exceto Coca-Cola 350ml;
- composição detalhada e alergênicos;
- acompanhamentos exatos de Chorizo Angus;
- definição de “molho da casa” e “molho especial”;
- unidade e turno de disponibilidade.

## 7. Harmonizações

Não existe harmonização confirmada no banco ou em cardápio oficial acessível.

- **Inferência visual:** `584539853...jpg` associa vinho tinto e carne em uma mesa.
- **Sugestão editorial:** validar com o restaurante uma harmonização para cada corte e uma opção sem álcool.
- **Bloqueio:** não publicar pares de produtos antes de confirmar bebidas, rótulos, preços e disponibilidade.

## 8. Pedido

Usar apenas produtos `available = true` do Supabase. A auditoria não propõe mudanças de fluxo, preço ou regras de pedido.

## 9. Acompanhamento

- **Sugestão editorial:** mensagens curtas de presença e cuidado.
- **Pendente:** tom de voz aprovado e eventos operacionais que podem disparar mensagens.
- Avaliações públicas valorizam atendimento atencioso, mas isso é percepção de clientes, não regra operacional.

## 10. Encerramento

- **Sugestão editorial:** agradecimento simples e convite a avaliar a experiência.
- **Pendente:** canal oficial de avaliação por unidade e autorização para direcionamento.
- O Linktree oficial possui um link “Google Review”, mas a unidade de destino precisa ser verificada.

## Conteúdo utilizável agora

1. Estrutura das seis categorias.
2. Sete produtos com descrições e preços do Supabase.
3. Posicionamento “Autêntica Parrilla Argentina”, sujeito à aprovação editorial.
4. Fotografia de entrada como candidata de recepção.
5. Fotografias de carne como capas provisórias de categoria após autorização.

