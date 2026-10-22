-- Own-account aggregate only: no direct ledger read grant, no account argument,
-- no point updates, no changes to award validation or room privileges.
create schema if not exists slarklive_styles_private;
revoke all on schema slarklive_styles_private from public,anon;
grant usage on schema slarklive_styles_private to authenticated;

-- A narrow privileged reader is needed because the reward ledger stays private.
create function slarklive_styles_private.minhas_vitorias()
returns integer language plpgsql stable security definer set search_path = ''
as $$
begin
 if auth.uid() is null then
  raise exception 'Entre com sua conta Slark.' using errcode='42501';
 end if;
 return (select count(distinct (r.room_id,r.round_index,r.match_slot))::integer
  from slarklive_private.match_rewards r join public.alunos a on a.id=r.aluno_id
  where a.usuario_id=auth.uid());
end;
$$;
revoke all on function slarklive_styles_private.minhas_vitorias() from public,anon;
grant execute on function slarklive_styles_private.minhas_vitorias() to authenticated;

-- PostgREST entry point uses invoker rights and accepts no identity from callers.
create function public.slarklive_minhas_vitorias()
returns integer language sql stable security invoker set search_path = ''
as $$ select slarklive_styles_private.minhas_vitorias(); $$;
revoke all on function public.slarklive_minhas_vitorias() from public,anon;
grant execute on function public.slarklive_minhas_vitorias() to authenticated;
