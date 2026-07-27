begin;

-- PATCH-017
-- Fonte canônica inicial da demonstração comercial do +54 Jardim Aquarius.
-- Imagens de 13 de abril; ano e vigência comercial não confirmados.
-- Este script não representa confirmação de preços vigentes.

lock table public.categories in share row exclusive mode;
lock table public.menu_items in share row exclusive mode;

create temporary table patch_017_categories (
  source_key text primary key,
  name text not null unique,
  emoji text,
  sort_order integer not null unique
) on commit drop;

create temporary table patch_017_items (
  source_key text primary key,
  category_source_key text not null references patch_017_categories(source_key),
  name text not null,
  description text,
  price numeric not null,
  image_url text,
  available boolean not null,
  unique (category_source_key, name)
) on commit drop;

create temporary table patch_017_demo_categories (
  id bigint primary key,
  name text not null,
  emoji text,
  sort_order integer not null
) on commit drop;

create temporary table patch_017_demo_items (
  id bigint primary key,
  category_id bigint not null,
  name text not null,
  description text,
  price numeric not null,
  image_url text,
  available boolean not null
) on commit drop;

insert into patch_017_categories (source_key, name, emoji, sort_order)
values
  ('entrantes', 'Entrantes', null, 1),
  ('lanches', 'Lanches', null, 2),
  ('ensaladas', 'Ensaladas', null, 3),
  ('la-parrilla', 'La Parrilla', null, 4),
  ('prato-especial', 'Prato Especial', null, 5),
  ('sobremesas', 'Sobremesas', null, 6),
  ('bebidas', 'Bebidas', null, 7),
  ('cervejas', 'Cervejas', null, 8),
  ('cervejas-de-barril-300ml', 'Cervejas de Barril | 300ml', null, 9),
  ('drinks', 'Drinks', null, 10),
  ('cafe', 'Café', null, 11);

insert into patch_017_items (
  source_key,
  category_source_key,
  name,
  description,
  price,
  image_url,
  available
)
values
  ('entrantes-empanadas-argentinas', 'entrantes', 'Empanadas Argentinas', 'Carne suave e Carne apimentada.', 18, null, true),
  ('entrantes-pao-de-alho', 'entrantes', 'Pão de Alho', 'Pão de Alho Artesanal feito com Alho assado e Requeijão.', 22, null, true),
  ('entrantes-bolinho-de-costela-com-gorgonzola', 'entrantes', 'Bolinho de Costela com Gorgonzola', '4 unidades', 34, null, true),
  ('entrantes-papas-fritas', 'entrantes', 'Papas Fritas', null, 49, null, true),
  ('entrantes-tabua-de-mini-empanadas', 'entrantes', 'Tábua de Mini Empanadas', '3 Mini Empanadas de Carne Suave e 3 Mini Empanadas de Queijo com Cebola, acompanha Chimichurri.', 49, null, true),
  ('entrantes-festival-de-linguica-artesanal', 'entrantes', 'Festival de Linguiça Artesanal', 'Linguiças de Pernil, Pernil Apimentado e Costela Bovina. Acompanha pão de alho, farofa e vinagrete.', 69, null, true),
  ('entrantes-provoleta-com-linguica-artesanal', 'entrantes', 'Provoleta com Linguiça Artesanal', 'Provolone assado com Linguiça de Pernil Artesanal. Acompanha Chimichurri e Pão da Casa.', 74, null, true),
  ('entrantes-el-preferido', 'entrantes', 'El Preferido', 'A combinação perfeita para compartilhar sabores! Chorizo de Angus, Linguiça Artesanal, Queijo Coalho, Farofa, Vinagrete e um Pão de Alho!', 139, null, true),
  ('lanches-hamburguesa', 'lanches', 'Hamburguesa', 'Pão de Brioche Artesanal, Burger Black Angus 180g e Muçarela. Acompanha Batata Palito.', 49, null, true),
  ('lanches-hamburguesa-com-salada', 'lanches', 'Hamburguesa com Salada', 'Pão de Brioche Artesanal, Burger Black Angus 180g, Muçarela, Alface e Tomate. Acompanha Batata Palito.', 56, null, true),
  ('lanches-hamburguesa-com-bacon', 'lanches', 'Hamburguesa com Bacon', 'Pão de Brioche Artesanal, Burger Black Angus 180g, Muçarela e Bacon. Acompanha Batata Palito.', 59, null, true),
  ('lanches-caminito', 'lanches', 'Caminito', '4 Unidades de Mini Burger em Pão de Brioche, Muçarela e Aioli. Acompanha Batata Palito.', 59, null, true),
  ('ensaladas-salada-julienne', 'ensaladas', 'Salada Julienne', 'Salada de Alface, Tomate, Cenoura, Palmito, Batata Palha, Parmesão e Molho Julienne.', 64, null, true),
  ('ensaladas-salada-caesar', 'ensaladas', 'Salada Caesar', 'Salada de Alface Americana com Croutons, Frango Grelhado (200g), Parmesão e Molho Caesar.', 69, null, true),
  ('ensaladas-salada-do-parrilleiro', 'ensaladas', 'Salada do Parrilleiro', 'Salada de Alface Americana com Croutons, Baby Beef (200g), Parmesão e Molho Caesar.', 74, null, true),
  ('ensaladas-salada-del-mar', 'ensaladas', 'Salada del Mar', 'Salada de Alface, Tomate, Cenoura, Palmito, Batata Palha, Parmesão, Molho Julienne e Salmão Chileno (200g).', 79, null, true),
  ('la-parrilla-bife-de-chorizo', 'la-parrilla', 'Bife de Chorizo', '300g', 139, null, true),
  ('la-parrilla-shoulder', 'la-parrilla', 'Shoulder', '300g', 119, null, true),
  ('la-parrilla-baby-beef', 'la-parrilla', 'Baby Beef', '300g', 129, null, true),
  ('la-parrilla-bombom', 'la-parrilla', 'Bombom', '300g', 129, null, true),
  ('la-parrilla-lomo', 'la-parrilla', 'Lomo', '300g', 124, null, true),
  ('la-parrilla-ojo-de-bife', 'la-parrilla', 'Ojo de Bife', '300g', 154, null, true),
  ('la-parrilla-fraldinha', 'la-parrilla', 'Fraldinha', '300g', 139, null, true),
  ('la-parrilla-assado-de-tira', 'la-parrilla', 'Assado de Tira', '300g', 139, null, true),
  ('la-parrilla-tapa-de-cuadril', 'la-parrilla', 'Tapa de Cuadril', '300g', 139, null, true),
  ('la-parrilla-file-de-frango', 'la-parrilla', 'Filé de Frango', null, 74, null, true),
  ('la-parrilla-galeto', 'la-parrilla', 'Galeto', null, 84, null, true),
  ('la-parrilla-salmao-na-brasa', 'la-parrilla', 'Salmão na Brasa', null, 109, null, true),
  ('la-parrilla-bife-a-milanesa', 'la-parrilla', 'Bife à Milanesa', 'Feito com Bombom da Alcatra', 94, null, true),
  ('la-parrilla-bife-a-parmegiana', 'la-parrilla', 'Bife à Parmegiana', 'Feito com Bombom da Alcatra', 99, null, true),
  ('la-parrilla-acompanhamentos', 'la-parrilla', 'Acompanhamentos', null, 74, null, true),
  ('prato-especial-parrillada-argentina', 'prato-especial', 'Parrillada Argentina', 'Essa experiência foi criada para que nossos clientes possam saborear os cortes mais emblemáticos da nossa Parrilla. O prato inclui Ojo de Bife (200g), Bife de Chorizo (200g) e Assado de Tira (300g). Como entrada: Mini Empanadas Argentinas. Acompanhamentos do dia servidos à vontade e sobremesa (mini churros c/ doce de leite argentino | 6 unid.). Prato para até duas pessoas.', 389, null, true),
  ('sobremesas-pudim-com-dulce-de-leche', 'sobremesas', 'Pudim com Dulce de Leche', 'Pudim cremoso acompanhado de Doce de Leite Argentino, Creme batido e Farofa de Castanhas. Finalizado com Flor de Sal.', 26, null, true),
  ('sobremesas-mini-churros', 'sobremesas', 'Mini Churros', '6 unidades. Acompanham Doce de Leite Argentino.', 32, null, true),
  ('sobremesas-petit-gateau-plus-54-parrilla', 'sobremesas', 'Petit Gateau +54 Parrilla', 'Feito na casa, acompanha Gelato Flor de Leite, Morangos e Farofa de Oreo.', 34, null, true),
  ('sobremesas-cocada-de-forno', 'sobremesas', 'Cocada de Forno', 'Cocada assada finalizada com Gelato Flor de Leite e Calda de Maracujá.', 34, null, true),
  ('bebidas-agua', 'bebidas', 'Água', 'Com ou Sem Gás', 9, null, true),
  ('bebidas-refrigerante', 'bebidas', 'Refrigerante', 'Coca-Cola, Coca Zero, Guaraná ou Guaraná Zero.', 11, null, true),
  ('bebidas-sprite-lemon', 'bebidas', 'Sprite Lemon', null, 14, null, true),
  ('bebidas-tonica', 'bebidas', 'Tônica', 'Normal ou Zero.', 11, null, true),
  ('bebidas-schweppes-citrus', 'bebidas', 'Schweppes Citrus', null, 11, null, true),
  ('cervejas-heineken', 'cervejas', 'Heineken', 'Long Neck', 18, null, true),
  ('cervejas-corona', 'cervejas', 'Corona', 'Long Neck', 18, null, true),
  ('cervejas-stella-artois', 'cervejas', 'Stella Artois', 'Long Neck', 17, null, true),
  ('cervejas-heineken-0-0', 'cervejas', 'Heineken 0.0', 'Long Neck', 18, null, true),
  ('cervejas-corona-cero', 'cervejas', 'Corona Cero', 'Long Neck', 18, null, true),
  ('cervejas-de-barril-300ml-chopp-brahma', 'cervejas-de-barril-300ml', 'Chopp Brahma', null, 12, null, true),
  ('cervejas-de-barril-300ml-chopp-estilos', 'cervejas-de-barril-300ml', 'Chopp Estilos', 'Consulte opções disponíveis.', 18, null, true),
  ('drinks-aperol-spritz', 'drinks', 'Aperol Spritz', 'Equilibrado e refrescante!', 34, null, true),
  ('drinks-fitzgerald', 'drinks', 'Fitzgerald', 'Levemente ácido e cítrico. Gin, blend de limões, xarope de açúcar e Angostura Bitter.', 32, null, true),
  ('drinks-negroni-spritz', 'drinks', 'Negroni Spritz', 'Amargo e levemente doce. Gin, Campari, Vermute Tinto e solução salina.', 35, null, true),
  ('drinks-classic-g-and-t', 'drinks', 'Classic G&T', 'Gin, limão siciliano e tônica.', 38, null, true),
  ('drinks-caipirinha', 'drinks', 'Caipirinha', 'Limão, Morango, Frutas Vermelhas, Maracujá ou Kiwi.', 32, null, true),
  ('drinks-caipiroska', 'drinks', 'Caipiroska', 'Limão, Morango, Frutas Vermelhas, Maracujá ou Kiwi.', 34, null, true),
  ('drinks-sakerinha', 'drinks', 'Sakerinha', 'Limão, Morango, Frutas Vermelhas, Maracujá ou Kiwi.', 32, null, true),
  ('cafe-nespresso-leggero', 'cafe', 'Nespresso Leggero', 'Mais suave', 9, null, true),
  ('cafe-nespresso-ristretto', 'cafe', 'Nespresso Ristretto', 'Mais intenso', 9, null, true);

insert into patch_017_demo_categories (id, name, emoji, sort_order)
values
  (1, 'Entradas', '🥗', 1),
  (2, 'Parrilla', '🥩', 2),
  (3, 'Massas', '🍝', 3),
  (4, 'Hambúrgueres', '🍔', 4),
  (5, 'Bebidas', '🥤', 5),
  (6, 'Sobremesas', '🍮', 6);

insert into patch_017_demo_items (
  id,
  category_id,
  name,
  description,
  price,
  image_url,
  available
)
values
  (1, 2, 'Chorizo Angus', 'Corte argentino grelhado na parrilla com acompanhamentos da casa', 89.9, null, true),
  (2, 2, 'Bife de Tira', 'Corte premium assado na brasa com sal parrillero', 94.9, null, true),
  (3, 4, 'Burger +54', 'Hambúrguer artesanal com cheddar, bacon e molho especial', 42.9, null, true),
  (4, 3, 'Fettuccine Alfredo', 'Massa artesanal ao molho cremoso parmesão', 54.9, null, true),
  (5, 1, 'Batata Rústica', 'Batatas crocantes com ervas e molho da casa', 26.9, null, true),
  (6, 5, 'Coca-Cola 350ml', 'Refrigerante lata gelado', 7, null, true),
  (7, 6, 'Pudim Artesanal', 'Pudim cremoso com calda de caramelo', 18.9, null, true);

do $$
declare
  is_demo_snapshot boolean;
  is_canonical_snapshot boolean;
begin
  select
    (select count(*) from public.categories) = 6
    and (select count(*) from public.menu_items) = 7
    and not exists (
      select id, name, emoji, sort_order from public.categories
      except
      select id, name, emoji, sort_order from patch_017_demo_categories
    )
    and not exists (
      select id, name, emoji, sort_order from patch_017_demo_categories
      except
      select id, name, emoji, sort_order from public.categories
    )
    and not exists (
      select id, category_id, name, description, price, image_url, available
      from public.menu_items
      except
      select id, category_id, name, description, price, image_url, available
      from patch_017_demo_items
    )
    and not exists (
      select id, category_id, name, description, price, image_url, available
      from patch_017_demo_items
      except
      select id, category_id, name, description, price, image_url, available
      from public.menu_items
    )
  into is_demo_snapshot;

  select
    (select count(*) from public.categories) = 11
    and (select count(*) from public.menu_items) = 57
    and not exists (
      select name, emoji, sort_order from public.categories
      except
      select name, emoji, sort_order from patch_017_categories
    )
    and not exists (
      select name, emoji, sort_order from patch_017_categories
      except
      select name, emoji, sort_order from public.categories
    )
    and not exists (
      select c.name, i.name, i.description, i.price, i.image_url, i.available
      from public.menu_items i
      join public.categories c on c.id = i.category_id
      except
      select c.name, i.name, i.description, i.price, i.image_url, i.available
      from patch_017_items i
      join patch_017_categories c on c.source_key = i.category_source_key
    )
    and not exists (
      select c.name, i.name, i.description, i.price, i.image_url, i.available
      from patch_017_items i
      join patch_017_categories c on c.source_key = i.category_source_key
      except
      select c.name, i.name, i.description, i.price, i.image_url, i.available
      from public.menu_items i
      join public.categories c on c.id = i.category_id
    )
  into is_canonical_snapshot;

  if not is_demo_snapshot and not is_canonical_snapshot then
    raise exception using
      message = 'PATCH-017 abortado: o catálogo atual não corresponde ao snapshot demonstrativo 6/7 nem ao catálogo canônico 11/57.';
  end if;
end
$$;

do $$
declare
  menu_items_category_id_attnum smallint;
  categories_id_attnum smallint;
  canonical_category_fk_count integer;
begin
  select attribute.attnum::smallint
  into menu_items_category_id_attnum
  from pg_attribute attribute
  where attribute.attrelid = 'public.menu_items'::regclass
    and attribute.attname = 'category_id'
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into categories_id_attnum
  from pg_attribute attribute
  where attribute.attrelid = 'public.categories'::regclass
    and attribute.attname = 'id'
    and not attribute.attisdropped;

  if menu_items_category_id_attnum is null or categories_id_attnum is null then
    raise exception using
      message = 'PATCH-017 abortado: colunas da relação canônica não foram encontradas.';
  end if;

  select count(*)
  into canonical_category_fk_count
  from pg_constraint constraint_record
  where constraint_record.contype = 'f'
    and constraint_record.conrelid = 'public.menu_items'::regclass
    and constraint_record.confrelid = 'public.categories'::regclass
    and constraint_record.conkey =
      array[menu_items_category_id_attnum]::smallint[]
    and constraint_record.confkey =
      array[categories_id_attnum]::smallint[];

  if canonical_category_fk_count <> 1 then
    raise exception using
      message = 'PATCH-017 abortado: a FK canônica menu_items.category_id → categories.id não foi encontrada exatamente uma vez.';
  end if;

  if exists (
    select 1
    from pg_constraint constraint_record
    where constraint_record.contype = 'f'
      and constraint_record.confrelid = 'public.menu_items'::regclass
  ) then
    raise exception using
      message = 'PATCH-017 abortado: menu_items possui referências externas; audite-as antes da substituição.';
  end if;

  if exists (
    select 1
    from pg_constraint constraint_record
    where constraint_record.contype = 'f'
      and constraint_record.confrelid = 'public.categories'::regclass
      and not (
        constraint_record.conrelid = 'public.menu_items'::regclass
        and constraint_record.conkey =
          array[menu_items_category_id_attnum]::smallint[]
        and constraint_record.confkey =
          array[categories_id_attnum]::smallint[]
      )
  ) then
    raise exception using
      message = 'PATCH-017 abortado: categories possui referência externa ou inesperada além da FK canônica.';
  end if;
end
$$;

-- A remoção é restrita aos sete registros demonstrativos integralmente
-- verificados acima. Qualquer referência externa protegida por FK aborta e
-- reverte toda a transação.
delete from public.menu_items item
using patch_017_demo_items demo
where item.id = demo.id
  and item.category_id = demo.category_id
  and item.name = demo.name
  and item.description is not distinct from demo.description
  and item.price = demo.price
  and item.image_url is not distinct from demo.image_url
  and item.available = demo.available;

delete from public.categories category
using patch_017_demo_categories demo
where category.id = demo.id
  and category.name = demo.name
  and category.emoji is not distinct from demo.emoji
  and category.sort_order = demo.sort_order
  and not exists (
    select 1
    from public.menu_items item
    where item.category_id = category.id
  );

insert into public.categories (name, emoji, sort_order)
select source.name, source.emoji, source.sort_order
from patch_017_categories source
where not exists (
  select 1
  from public.categories category
  where category.name = source.name
);

do $$
begin
  if exists (
    select name
    from public.categories
    group by name
    having count(*) > 1
  ) then
    raise exception using
      message = 'PATCH-017 abortado: existem categorias duplicadas por nome.';
  end if;
end
$$;

update public.categories category
set
  emoji = source.emoji,
  sort_order = source.sort_order
from patch_017_categories source
where category.name = source.name;

do $$
begin
  if exists (
    select source.name
    from patch_017_items source
    join public.menu_items item on item.name = source.name
    join public.categories category on category.id = item.category_id
    join patch_017_categories expected_category
      on expected_category.source_key = source.category_source_key
    where category.name <> expected_category.name
  ) then
    raise exception using
      message = 'PATCH-017 abortado: um produto canônico já existe em outra categoria.';
  end if;
end
$$;

update public.menu_items item
set
  description = source.description,
  price = source.price,
  image_url = source.image_url,
  available = source.available
from patch_017_items source
join patch_017_categories source_category
  on source_category.source_key = source.category_source_key
join public.categories category
  on category.name = source_category.name
where item.category_id = category.id
  and item.name = source.name;

insert into public.menu_items (
  category_id,
  name,
  description,
  price,
  image_url,
  available
)
select
  category.id,
  source.name,
  source.description,
  source.price,
  source.image_url,
  source.available
from patch_017_items source
join patch_017_categories source_category
  on source_category.source_key = source.category_source_key
join public.categories category
  on category.name = source_category.name
where not exists (
  select 1
  from public.menu_items item
  where item.category_id = category.id
    and item.name = source.name
);

do $$
begin
  if (select count(*) from public.categories) <> 11 then
    raise exception using
      message = 'PATCH-017 abortado: contagem final de categorias diferente de 11.';
  end if;

  if (select count(*) from public.menu_items) <> 57 then
    raise exception using
      message = 'PATCH-017 abortado: contagem final de produtos diferente de 57.';
  end if;

  if exists (
    select source.source_key
    from patch_017_items source
    join patch_017_categories source_category
      on source_category.source_key = source.category_source_key
    left join public.categories category
      on category.name = source_category.name
    left join public.menu_items item
      on item.category_id = category.id
      and item.name = source.name
      and item.description is not distinct from source.description
      and item.price = source.price
      and item.image_url is not distinct from source.image_url
      and item.available = source.available
    where item.id is null
  ) then
    raise exception using
      message = 'PATCH-017 abortado: um ou mais produtos não correspondem à fonte intermediária.';
  end if;
end
$$;

commit;
