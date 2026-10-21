-- Only the trusted production room state can award classroom points.
-- No client RPC, service key or direct UPDATE grant is introduced.
begin;
create table if not exists slarklive_private.match_rewards (
 room_id uuid not null,
 round_index integer not null check (round_index between 0 and 5),
 match_slot integer not null check (match_slot between 0 and 31),
 team_id uuid not null,
 aluno_id uuid not null references public.alunos(id),
 points smallint not null default 30 check (points = 30),
 awarded_at timestamptz not null default now(),
 primary key (room_id,round_index,match_slot,aluno_id)
);
alter table slarklive_private.match_rewards enable row level security;
revoke all on slarklive_private.match_rewards from public,anon,authenticated,slarklive_app,slarklive_preview_app;
create or replace function slarklive_private.credit_match_winners()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
 entry record; round_row record; match_row record; room jsonb; previous jsonb;
 duel jsonb; previous_duel jsonb; roster jsonb; winner text; room_id uuid;
 classroom uuid; member_ids uuid[]; changed integer; score_a integer; score_b integer;
 question_index text; item_index text; owner_id uuid;
begin
 if tg_table_schema <> 'slarklive_private' or tg_table_name <> 'state' or tg_op <> 'UPDATE' then
  raise exception 'Slark Live: origem de pontuação inválida.';
 end if;
 -- Background connections use the dedicated production role. Interactive SQL is
 -- restricted to the database owner; preview/authenticated/anonymous cannot call it.
 if session_user not in ('slarklive_app','postgres') then
  raise exception 'Slark Live: conexão sem permissão para pontuar.';
 end if;
 for entry in select key,value from pg_catalog.jsonb_each(new.data->'rooms') loop
  room := entry.value; previous := old.data->'rooms'->entry.key;
  if room = previous or room->>'rankingVersion' is distinct from '1'
     or room->>'demo' is distinct from 'false' or room->'tournament' is null then continue; end if;
  -- First persist the original room. Never credit imported/historical results.
  if previous->>'rankingId' is distinct from room->>'rankingId'
     or previous->>'rankingVersion' is distinct from '1' then continue; end if;
  room_id := (room->>'rankingId')::uuid; owner_id := (room->>'owner')::uuid;
  if auth.uid() is not null and auth.uid() <> owner_id then
   raise exception 'Slark Live: professor divergente da sessão.';
  end if;
  select t.sala_id into classroom from public.trilhas t join public.usuarios u on u.id=owner_id
   where t.id=(room->>'trailId')::uuid and u.ativo is not false
     and (u.perfil::text='admin_slark'
       or (u.perfil::text='professor' and t.professor_id=u.id)
       or (u.perfil::text='diretor' and t.escola_id=u.escola_id));
  if classroom is null then raise exception 'Slark Live: trilha fora do acesso do professor.'; end if;
  for round_row in select value,ordinality-1 as idx from pg_catalog.jsonb_array_elements(room->'tournament'->'rounds') with ordinality loop
   for match_row in select value,ordinality-1 as slot from pg_catalog.jsonb_array_elements(round_row.value) with ordinality loop
    duel := match_row.value; winner := duel->>'winner';
    previous_duel := previous->'tournament'->'rounds'->(round_row.idx::integer)->(match_row.slot::integer);
    if winner is null or duel->>'bye'='true' or previous_duel->>'winner' is not null then continue; end if;
    if winner not in (duel->>'a',duel->>'b') or previous_duel->>'a' is distinct from duel->>'a'
       or previous_duel->>'b' is distinct from duel->>'b' then
     raise exception 'Slark Live: confronto inválido para pontuação.';
    end if;
    -- Recount the five revealed questions rather than accepting a browser score.
    score_a := 0; score_b := 0;
    for n in 0..4 loop
     item_index := room->'tournament'->'bank'->>((round_row.idx::integer)*5+n);
     if item_index is null or not (room->'tournament'->'revealedItems' @> pg_catalog.jsonb_build_array(item_index::integer)) then
      raise exception 'Slark Live: conclua as cinco perguntas antes de pontuar.';
     end if;
     if room->'answers'->item_index->(duel->>'a')->>'correct'='true' then score_a:=score_a+1; end if;
     if room->'answers'->item_index->(duel->>'b')->>'correct'='true' then score_b:=score_b+1; end if;
    end loop;
    if score_a=score_b then
     question_index := room->>'index';
     if (room->'tournament'->>'question')::integer < 5
        or not (room->'tournament'->'revealedItems' @> pg_catalog.jsonb_build_array(question_index::integer))
        or (coalesce(room->'answers'->question_index->(duel->>'a')->>'correct','false') = coalesce(room->'answers'->question_index->(duel->>'b')->>'correct','false'))
        or coalesce(room->'answers'->question_index->winner->>'correct','false')<>'true' then
      raise exception 'Slark Live: desempate ainda não concluído.';
     end if;
    elsif winner <> (case when score_a>score_b then duel->>'a' else duel->>'b' end) then
     raise exception 'Slark Live: vencedor divergente dos acertos.';
    end if;
    roster := room->'teams'->winner->'members';
    if roster is distinct from previous->'teams'->winner->'members' or pg_catalog.jsonb_array_length(roster)<>4 then
     raise exception 'Slark Live: integrantes alterados durante a partida.';
    end if;
    select array_agg(distinct (m->>'id')::uuid order by (m->>'id')::uuid) into member_ids from pg_catalog.jsonb_array_elements(roster) m;
    if pg_catalog.cardinality(member_ids)<>4 or
      (select count(*) from public.time_membros tm join public.alunos a on a.id=tm.aluno_id join public.times t on t.id=tm.time_id
       where tm.time_id=winner::uuid and a.id=any(member_ids) and a.sala_id=classroom and t.sala_id=classroom)<>4 then
     raise exception 'Slark Live: quarteto fora da turma ou cadastro incompleto.';
    end if;
    with awarded as (
     insert into slarklive_private.match_rewards(room_id,round_index,match_slot,team_id,aluno_id)
     select room_id,round_row.idx::integer,match_row.slot::integer,winner::uuid,id from unnest(member_ids) id
     on conflict do nothing returning aluno_id
    )
    update public.alunos a set pontos=coalesce(a.pontos,0)+30 from awarded where a.id=awarded.aluno_id;
    get diagnostics changed = row_count;
    if changed not in (0,4) then raise exception 'Slark Live: crédito incompleto; operação desfeita.'; end if;
   end loop;
  end loop;
 end loop;
 return new;
end;
$$;
revoke all on function slarklive_private.credit_match_winners() from public,anon,authenticated,slarklive_app,slarklive_preview_app;
drop trigger if exists credit_match_winners on slarklive_private.state;
create trigger credit_match_winners after update of data on slarklive_private.state
 for each row when (old.data is distinct from new.data) execute function slarklive_private.credit_match_winners();
commit;
