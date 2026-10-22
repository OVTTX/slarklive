create table public.personalizacoes_slarklive (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  skin text not null default 'slark' check (skin in ('slark','aurora','oceano','ametista','ouro','rosa','solar','floresta','cosmos','grafite','rubi')),
  texto text not null default 'padrao' check (texto in ('padrao','gelo','azul','dourado')),
  moldura text not null default 'padrao' check (moldura in ('padrao','orbita','constelacao','ouro')),
  atualizado_em timestamptz not null default now()
);
alter table public.personalizacoes_slarklive enable row level security;
revoke all on public.personalizacoes_slarklive from anon;
grant select,insert,update on public.personalizacoes_slarklive to authenticated;
create policy live_estilo_ler on public.personalizacoes_slarklive for select to authenticated using ((select auth.uid())=usuario_id);
create policy live_estilo_criar on public.personalizacoes_slarklive for insert to authenticated with check ((select auth.uid())=usuario_id);
create policy live_estilo_alterar on public.personalizacoes_slarklive for update to authenticated using ((select auth.uid())=usuario_id) with check ((select auth.uid())=usuario_id);

create function public.validar_personalizacao_slarklive() returns trigger
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
    case new.skin when 'slark' then 0 when 'aurora' then 1 when 'oceano' then 3 when 'ametista' then 8 when 'ouro' then 25 when 'rosa' then 5 when 'solar' then 7 when 'floresta' then 10 when 'cosmos' then 15 when 'grafite' then 30 when 'rubi' then 40 else 2147483647 end,
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
revoke all on function public.validar_personalizacao_slarklive() from public,anon;
grant execute on function public.validar_personalizacao_slarklive() to authenticated;
create trigger validar_personalizacao before insert or update on public.personalizacoes_slarklive for each row execute function public.validar_personalizacao_slarklive();
