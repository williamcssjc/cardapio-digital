begin;

lock table public.menu_items in share row exclusive mode;

create temporary table patch_026_product_routing (
  product_name text primary key,
  production_station text not null
) on commit drop;

insert into patch_026_product_routing (
  product_name,
  production_station
)
values
  ('Empanadas Argentinas', 'kitchen'),
  ('Pão de Alho', 'kitchen'),
  ('Bolinho de Costela com Gorgonzola', 'kitchen'),
  ('Papas Fritas', 'kitchen'),
  ('Tábua de Mini Empanadas', 'kitchen'),
  ('Festival de Linguiça Artesanal', 'kitchen'),
  ('Provoleta com Linguiça Artesanal', 'kitchen'),
  ('El Preferido', 'kitchen'),
  ('Hamburguesa', 'kitchen'),
  ('Hamburguesa com Salada', 'kitchen'),
  ('Hamburguesa com Bacon', 'kitchen'),
  ('Caminito', 'kitchen'),
  ('Salada Julienne', 'kitchen'),
  ('Salada Caesar', 'kitchen'),
  ('Salada do Parrilleiro', 'kitchen'),
  ('Salada del Mar', 'kitchen'),
  ('Bife de Chorizo', 'kitchen'),
  ('Shoulder', 'kitchen'),
  ('Baby Beef', 'kitchen'),
  ('Bombom', 'kitchen'),
  ('Lomo', 'kitchen'),
  ('Ojo de Bife', 'kitchen'),
  ('Fraldinha', 'kitchen'),
  ('Assado de Tira', 'kitchen'),
  ('Tapa de Cuadril', 'kitchen'),
  ('Filé de Frango', 'kitchen'),
  ('Galeto', 'kitchen'),
  ('Salmão na Brasa', 'kitchen'),
  ('Bife à Milanesa', 'kitchen'),
  ('Bife à Parmegiana', 'kitchen'),
  ('Acompanhamentos', 'kitchen'),
  ('Parrillada Argentina', 'kitchen'),
  ('Pudim com Dulce de Leche', 'kitchen'),
  ('Mini Churros', 'kitchen'),
  ('Petit Gateau +54 Parrilla', 'kitchen'),
  ('Cocada de Forno', 'kitchen'),
  ('Água', 'bar'),
  ('Refrigerante', 'bar'),
  ('Sprite Lemon', 'bar'),
  ('Tônica', 'bar'),
  ('Schweppes Citrus', 'bar'),
  ('Heineken', 'bar'),
  ('Corona', 'bar'),
  ('Stella Artois', 'bar'),
  ('Heineken 0.0', 'bar'),
  ('Corona Cero', 'bar'),
  ('Chopp Brahma', 'bar'),
  ('Chopp Estilos', 'bar'),
  ('Aperol Spritz', 'bar'),
  ('Fitzgerald', 'bar'),
  ('Negroni Spritz', 'bar'),
  ('Classic G&T', 'bar'),
  ('Caipirinha', 'bar'),
  ('Caipiroska', 'bar'),
  ('Sakerinha', 'bar'),
  ('Nespresso Leggero', 'bar'),
  ('Nespresso Ristretto', 'bar');

do $$
begin
  if (select count(*) from patch_026_product_routing) <> 57 then
    raise exception using
      message = 'PATCH-026 abortado: o mapeamento não contém 57 produtos.';
  end if;

  if (select count(*) from public.menu_items) <> 57 then
    raise exception using
      message = 'PATCH-026 abortado: o catálogo remoto não contém exatamente 57 produtos.';
  end if;

  if exists (
    select routing.product_name
    from patch_026_product_routing routing
    left join public.menu_items item
      on item.name = routing.product_name
    where item.id is null
  ) or exists (
    select item.name
    from public.menu_items item
    left join patch_026_product_routing routing
      on routing.product_name = item.name
    where routing.product_name is null
  ) then
    raise exception using
      message = 'PATCH-026 abortado: o catálogo diverge do snapshot canônico esperado.';
  end if;

  if (
    select count(*)
    from patch_026_product_routing
    where production_station = 'bar'
  ) <> 21 or (
    select count(*)
    from patch_026_product_routing
    where production_station = 'kitchen'
  ) <> 36 then
    raise exception using
      message = 'PATCH-026 abortado: contagem de estações inválida.';
  end if;
end
$$;

alter table public.menu_items
  add column if not exists production_station text;

update public.menu_items item
set production_station = routing.production_station
from patch_026_product_routing routing
where item.name = routing.product_name;

do $$
begin
  if exists (
    select 1
    from public.menu_items
    where production_station is null
      or production_station not in ('bar', 'kitchen', 'service')
  ) then
    raise exception using
      message = 'PATCH-026 abortado: produto sem estação V1 válida após o backfill.';
  end if;
end
$$;

alter table public.menu_items
  drop constraint if exists menu_items_production_station_format;

alter table public.menu_items
  add constraint menu_items_production_station_format
  check (production_station ~ '^[a-z][a-z0-9-]*$');

alter table public.menu_items
  alter column production_station set not null;

comment on column public.menu_items.production_station is
  'Código semântico da estação operacional responsável pelo item.';

commit;
