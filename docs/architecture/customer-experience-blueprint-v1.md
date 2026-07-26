# Blueprint da experiência do cliente V1

| Etapa | Objetivo e pergunta respondida | Dados obrigatórios | Dados opcionais | Ação principal | Universal / configurável / regra | Estado atual |
|---|---|---|---|---|---|---|
| 1. Recepção | Criar chegada. “Onde estou?” | casa e mesa reconhecida | imagem e mensagem | Entrar | Motor conduz; Perfil fornece linguagem; Tema compõe | Implementada |
| 2. Nome | Identificar participante. “Como posso ser chamado?” | nome, `table_session_id` | telefone depois | Confirmar nome | Motor persiste; Perfil fornece texto | Implementada |
| 3. Quantidade | Registrar grupo. “Quantas pessoas chegaram?” | inteiro positivo | estimativa | Continuar | Motor persiste; Regras definem mínimo | Implementada |
| 4. Primeiro gesto | Acolher antes do cardápio. “O que a casa oferece primeiro?” | oferta configurada | alternativas/contexto | Aceitar ou seguir | Motor apresenta; Perfil escolhe conteúdo; Regras controlam disponibilidade | Não implementada |
| 5. Apresentação da casa | Explicar identidade. “Que lugar é este?” | texto aprovado | história/imagem | Conhecer/seguir | Perfil e Tema | Não implementada |
| 6. Destaques | Orientar escolha. “O que merece atenção?” | produtos válidos | motivo editorial | Explorar | Motor exibe; Perfil seleciona; Regras filtram | Não implementada |
| 7. Exploração do cardápio | Navegar. “O que posso pedir?” | categorias e itens disponíveis | imagem/ordem | Abrir produto/adicionar | Motor navega; Perfil fornece catálogo | Implementada |
| 8. Descoberta do produto | Entender item. “O que é e quanto custa?” | nome, descrição, preço | foto, peso, alergênicos | Adicionar | Perfil fornece conteúdo; Regras aplicam disponibilidade | Parcial: cards, sem detalhe completo |
| 9. Recomendações | Ajudar a decidir. “O que combina comigo/com o pedido?” | recomendação aprovada | contexto do pedido | Aceitar/ignorar | Motor oferece; Perfil define; Regras restringem | Não implementada |
| 10. Carrinho e pedido | Confirmar escolha. “Está tudo certo?” | itens, total, sessão | telefone | Enviar pedido | Motor | Implementada |
| 11. Acompanhamento | Reduzir incerteza. “Onde está meu pedido?” | pedido e status | estimativa | Acompanhar | Motor | Implementada com realtime |
| 12. Encerramento | Finalizar visita. “Minha sessão terminou?” | sessão encerrada | mensagem da casa | Encerrar | Motor encerra; Perfil agradece | Parcial |

## Limites

- O blueprint não adiciona fila, reserva, pagamento, IA ou automação de recomendação.
- “Primeiro gesto” não significa necessariamente bebida.
- Conteúdo ausente não recebe fallback inventado: a etapa deve ser omitida ou usar conteúdo explicitamente aprovado.

