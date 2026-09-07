# Arquivo histórico

Os documentos deste diretório explicam a evolução do projeto, mas **não são fonte de verdade atual**.

Use a documentação numerada em `docs/` para qualquer nova implementação.

## Política

- `REFERENCE`: preservado porque explica uma decisão ou fonte específica;
- `ARCHIVE`: histórico útil, mas substituído;
- `MERGE`/`UPDATE`: conteúdo incorporado aos documentos canônicos antes do arquivamento;
- `REMOVE`: somente duplicata exata, prompt sem conhecimento exclusivo, arquivo pessoal, índice obsoleto ou proposta integralmente substituída.

## Classificação da consolidação

Auditoria inicial: 96 documentos.

| Classe | Quantidade | Tratamento |
|---|---:|---|
| KEEP | 2 | `AGENTS.md` e `CLAUDE.md` permanecem na raiz. |
| UPDATE | 1 | `README.md` foi atualizado no lugar. |
| MERGE | 40 | Conteúdo incorporado à base canônica e original arquivado. |
| REFERENCE | 10 | Fonte específica preservada para consulta histórica. |
| ARCHIVE | 24 | Histórico útil, mas substituído. |
| REMOVE | 19 | Removido após verificação e consolidação. |

O inventário individual, no qual cada um dos 96 documentos recebe exatamente uma classe, está em [`DOCUMENTATION_AUDIT.md`](../DOCUMENTATION_AUDIT.md).

## Organização

- `legacy/`: arquitetura, engenharia e decisões antigas;
- `historical/`: visão, direção, governança e contexto do produto;
- `old-roadmaps/`: escopos, status e sequências substituídas;
- `old-patches/`: especificações e revisões de patches;
- `old-ideas/`: jornadas, design e propostas ainda não oficiais na origem;
- `old-analysis/`: auditorias técnicas e de conteúdo substituídas.

## Remoções realizadas

- 13 cópias exatas de `1IDEIAS-CARDAPIO/DOCUMENTACAOV.1`;
- `1IDEIAS-CARDAPIO/resumo.txt`, duplicata de `master projetc.txt`;
- prompts `CLAUDE.txt` e `gemini.txt` sem conhecimento exclusivo;
- `diario de dev.txt`, conteúdo pessoal;
- `DOCUMENTACAOV.1/documentacao.txt`, índice obsoleto;
- `content-audit/proposed-seed.json`, proposta dos sete produtos substituída pelo seed real versionado.

Nenhum arquivo de aplicação, migration, seed vigente ou tooling foi movido para este diretório.
