-- Noir is a zero-cost cosmetic. Account ownership and all other unlock thresholds stay unchanged.
alter table public.personalizacoes_slark drop constraint personalizacoes_slark_skin_check;
alter table public.personalizacoes_slark add constraint personalizacoes_slark_skin_check check (skin in ('slark','aurora','oceano','ametista','ouro','rosa','solar','floresta','cosmos','grafite','rubi','noir'));

create or replace function public.validar_personalizacao_slark() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare completo boolean; pontos integer; necessario integer;
begin
  if auth.uid() is null or auth.uid() <> new.usuario_id then
    raise exception 'Esta personalização pertence a outra conta.' using errcode='42501';
  end if;
  select (u.perfil::text='admin_slark' or u.nome ilike '%vtx%' or u.email ilike '%vtx%')
    into completo from public.usuarios u where u.id=auth.uid();
  select coalesce(max(a.pontos),0) into pontos from public.alunos a where a.usuario_id=auth.uid();
  necessario := greatest(
    case new.skin when 'noir' then 0 when 'slark' then 0 when 'aurora' then 100 when 'oceano' then 300 when 'ametista' then 750 when 'ouro' then 1500 when 'rosa' then 450 when 'solar' then 600 when 'floresta' then 900 when 'cosmos' then 1200 when 'grafite' then 1800 when 'rubi' then 2100 else 2147483647 end,
    case new.texto when 'padrao' then 0 when 'gelo' then 100 when 'azul' then 300 when 'dourado' then 1000 else 2147483647 end,
    case new.moldura when 'padrao' then 0 when 'orbita' then 200 when 'constelacao' then 500 when 'ouro' then 1500 else 2147483647 end
  );
  if not coalesce(completo,false) and greatest(pontos,0)<necessario then
    raise exception 'Você ainda não desbloqueou este estilo.' using errcode='42501';
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

alter table public.personalizacoes_slarklive drop constraint personalizacoes_slarklive_skin_check;
alter table public.personalizacoes_slarklive add constraint personalizacoes_slarklive_skin_check check (skin in ('slark','aurora','oceano','ametista','ouro','rosa','solar','floresta','cosmos','grafite','rubi','noir'));

create or replace function public.validar_personalizacao_slarklive() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare completo boolean; vitorias integer; necessario integer;
begin
  if auth.uid() is null or auth.uid() <> new.usuario_id then
    raise exception 'Esta personalização pertence a outra conta.' using errcode='42501';
  end if;
  select (u.perfil::text='admin_slark' or u.nome ilike '%vtx%' or u.email ilike '%vtx%')
    into completo from public.usuarios u where u.id=auth.uid();
  vitorias := public.slarklive_minhas_vitorias();
  necessario := greatest(
    case new.skin when 'noir' then 0 when 'slark' then 0 when 'aurora' then 1 when 'oceano' then 3 when 'ametista' then 8 when 'ouro' then 25 when 'rosa' then 5 when 'solar' then 7 when 'floresta' then 10 when 'cosmos' then 15 when 'grafite' then 30 when 'rubi' then 40 else 2147483647 end,
    case new.texto when 'padrao' then 0 when 'gelo' then 1 when 'azul' then 3 when 'dourado' then 20 else 2147483647 end,
    case new.moldura when 'padrao' then 0 when 'orbita' then 3 when 'constelacao' then 8 when 'ouro' then 25 else 2147483647 end
  );
  if not coalesce(completo,false) and greatest(vitorias,0)<necessario then
    raise exception 'Você ainda não desbloqueou este estilo.' using errcode='42501';
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

