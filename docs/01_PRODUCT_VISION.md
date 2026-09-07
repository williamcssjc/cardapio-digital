# Visão do produto

Status: **fonte canônica de produto**

## Problema

Cardápios digitais tradicionais reproduzem listas de produtos. Eles raramente compreendem o momento da visita, a identidade da casa ou a operação necessária para transformar uma escolha em atendimento.

Restaurantes também sofrem quando cliente, Bar, Cozinha, Garçom e Gerente trabalham com informações diferentes ou tentam inferir responsabilidades a partir de nomes e categorias.

## Visão

Parrilla OS é uma extensão digital da hospitalidade e da operação presencial. A interface deve desaparecer na experiência, enquanto a arquitetura torna responsabilidades explícitas.

O produto não tenta substituir pessoas. Ele reduz espera, repetição, erro e incerteza para que a equipe se concentre em receber e servir.

## Metáfora do excelente garçom

O motor deve dominar uma profissão universal e aprender a identidade da casa por configuração.

Um excelente garçom:

1. reconhece o contexto de chegada;
2. recebe sem criar burocracia;
3. oferece um primeiro gesto adequado;
4. apresenta a casa quando há interesse;
5. recomenda com contexto, sem pressionar;
6. deixa o cliente explorar;
7. acompanha os pedidos;
8. sabe quando interromper e quando permanecer discreto;
9. encerra a visita com clareza.

## Quatro camadas do produto

### Hospitality Engine

Comportamento universal da jornada: entrada, apresentação, recomendação, exploração e continuidade. Não conhece UUIDs nem regras específicas do +54.

### House Profile

Conteúdo editorial da casa: nome, história, tom, apresentação, destaques, papéis semânticos e curadoria.

### Operational Rules

Regras que alteram comportamento: faixa de mesas, quantidade mínima/máxima de pessoas e futuras regras operacionais aprovadas.

### Visual Theme e BrandIdentity

Identidade visual, marca, cores, tipografia, superfícies, raio e conteúdo do hero. Componentes consomem contratos; não verificam `brand.id` para decidir comportamento.

## White label

White label significa uma arquitetura compartilhada capaz de expressar casas diferentes sem copiar componentes por restaurante.

Hoje já existem:

- contratos `BrandIdentity` e `ExperienceProfile`;
- CSS variables derivadas da marca;
- tema visual configurado;
- exemplo alternativo de perfil;
- motores e componentes sem dependência do nome +54.

Ainda não existem:

- tenant resolvido por domínio ou URL;
- configuração remota por restaurante;
- isolamento completo de dados por estabelecimento;
- painel de criação de experiências;
- onboarding automatizado de novas casas.

Portanto, a arquitetura é **white-label-ready**, mas a plataforma multi-tenant pertence à evolução futura.

## Unidade piloto

O +54 Parrilla — Jardim Aquarius é a demonstração comercial e fonte inicial de conteúdo real. A referência orienta atmosfera e operação, mas não redefine o motor universal.

## Princípios de experiência

- hospitalidade antes da interface;
- restaurante antes do software;
- poucas decisões por vez;
- nenhuma urgência artificial;
- recomendação como serviço, não publicidade;
- autonomia explícita;
- espaço, ritmo e silêncio visual;
- identidade da casa sem componentes exclusivos;
- mobile real como requisito;
- acessibilidade e legibilidade preservadas;
- nenhuma funcionalidade deve competir com a refeição.

## Princípios operacionais

- a mesa organiza a visita;
- sessão representa a ocupação atual, não a mesa física;
- pedidos são incrementais;
- destino de produção é explícito;
- Bar e Cozinha avançam independentemente;
- Garçom atende e entrega, mas não é estação de produção;
- Gerente opera por exceção e visão consolidada;
- banco é fonte da verdade operacional;
- Realtime comunica mudanças persistidas, não inventa estado.

## Objetivos da V1

- demonstrar hospitalidade configurável;
- operar uma mesa real de ponta a ponta;
- encaminhar itens para a estação correta;
- permitir produção independente;
- persistir entrega;
- acompanhar toda a casa;
- consolidar conta e encerrar sessão;
- manter segurança, estabilidade e clareza suficientes para uma demonstração comercial real.

## Fora da V1

CRM, fidelidade, reservas, acomodação automática, pagamento integrado, fiscal, estoque, delivery, IA contextual, analytics avançado e multi-tenant completo não definem o sucesso da primeira versão.

Esses itens estão organizados em [10_V2_BACKLOG.md](10_V2_BACKLOG.md).
