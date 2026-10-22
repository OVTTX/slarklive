-- Verification only: all room, ledger and student changes are rolled back.
begin;
create temporary table live_points_fixture as
select jsonb_build_object('version',2,'rankingVersion',1,'rankingId',gen_random_uuid(),'owner',tr.professor_id,'trailId',tr.id,'demo',false,'status','active','index',4,
 'teams',jsonb_build_object(tm.id::text,jsonb_build_object('id',tm.id,'members',(select jsonb_agg(jsonb_build_object('id',m.aluno_id)) from public.time_membros m where m.time_id=tm.id))),
 'tournament',jsonb_build_object('rounds',jsonb_build_array(jsonb_build_array(jsonb_build_object('a',tm.id,'b',gen_random_uuid(),'bye',false,'winner',null))),'question',4,'bank',jsonb_build_array(0,1,2,3,4),'revealedItems',jsonb_build_array(0,1,2,3,4)),
 'answers',(select jsonb_object_agg(n::text,jsonb_build_object(tm.id::text,jsonb_build_object('correct',true))) from generate_series(0,4) n)) as room
from public.times tm join public.trilhas tr on tr.sala_id=tm.sala_id
join public.usuarios u on u.id=tr.professor_id and u.perfil::text='professor' and u.ativo is not false
where (select count(*) from public.time_membros m join public.alunos a on a.id=m.aluno_id where m.time_id=tm.id and a.sala_id=tm.sala_id)=4
limit 1;
do $$begin if (select count(*) from live_points_fixture)<>1 then raise exception 'No complete quartet available for verification'; end if;end$$;
create temporary table live_points_before as select a.id,coalesce(a.pontos,0) as points from public.alunos a,live_points_fixture f where exists(select 1 from jsonb_array_elements(f.room->'teams'->(f.room#>>'{tournament,rounds,0,0,a}')->'members') m where (m->>'id')::uuid=a.id);
create temporary table style_wins_before as
select distinct a.usuario_id,(select count(distinct (r.room_id,r.round_index,r.match_slot)) from slarklive_private.match_rewards r join public.alunos aa on aa.id=r.aluno_id where aa.usuario_id=a.usuario_id) as wins
from public.alunos a join live_points_before b on a.id=b.id;
update slarklive_private.state set data=jsonb_set(data,'{rooms,__ranking_verify__}',(select room from live_points_fixture)) where id=1;
update slarklive_private.state set data=jsonb_set(data,'{rooms,__ranking_verify__,tournament,rounds,0,0,winner}',to_jsonb(data#>>'{rooms,__ranking_verify__,tournament,rounds,0,0,a}')) where id=1;
do $$begin
 if (select count(*) from public.alunos a join live_points_before b on b.id=a.id where a.pontos=b.points+30)<>4 then raise exception 'Expected exactly 30 points per member'; end if;
 if (select count(*) from slarklive_private.match_rewards r,live_points_fixture f where r.room_id=(f.room->>'rankingId')::uuid)<>4 then raise exception 'Expected four ledger entries'; end if;
end$$;
do $$declare who record; actual integer;begin
 for who in select * from style_wins_before loop
  perform set_config('request.jwt.claim.sub',who.usuario_id::text,true);
  set local role authenticated;
  actual:=public.slarklive_minhas_vitorias();
  reset role;
  if actual<>who.wins+1 then raise exception 'Own-account victory count mismatch';end if;
 end loop;
 perform set_config('request.jwt.claim.sub','',true);
 if has_function_privilege('anon','public.slarklive_minhas_vitorias()','EXECUTE') then raise exception 'Anonymous can read wins';end if;
 if has_table_privilege('authenticated','slarklive_private.match_rewards','SELECT') then raise exception 'Client can read ledger';end if;
end$$;
-- Replay the same winner, including a reset-and-retry, cannot credit twice.
update slarklive_private.state set data=jsonb_set(data,'{rooms,__ranking_verify__,tournament,rounds,0,0,winner}','null'::jsonb) where id=1;
update slarklive_private.state set data=jsonb_set(data,'{rooms,__ranking_verify__,tournament,rounds,0,0,winner}',to_jsonb(data#>>'{rooms,__ranking_verify__,tournament,rounds,0,0,a}')) where id=1;
do $$begin
 if (select count(*) from public.alunos a join live_points_before b on b.id=a.id where a.pontos=b.points+30)<>4 then raise exception 'Duplicate award'; end if;
 if has_function_privilege('authenticated','slarklive_private.credit_match_winners()','EXECUTE') or has_function_privilege('anon','slarklive_private.credit_match_winners()','EXECUTE') then raise exception 'Public execution must be revoked'; end if;
end$$;
do $$declare who record; actual integer;begin
 for who in select * from style_wins_before loop
  perform set_config('request.jwt.claim.sub',who.usuario_id::text,true);
  set local role authenticated;
  actual:=public.slarklive_minhas_vitorias();
  reset role;
  if actual<>who.wins+1 then raise exception 'Own-account victory count mismatch';end if;
 end loop;
 perform set_config('request.jwt.claim.sub','',true);
 if has_function_privilege('anon','public.slarklive_minhas_vitorias()','EXECUTE') then raise exception 'Anonymous can read wins';end if;
 if has_table_privilege('authenticated','slarklive_private.match_rewards','SELECT') then raise exception 'Client can read ledger';end if;
end$$;
-- Preview saves never affect production points.
update slarklive_preview_private.state set data=jsonb_set(data,'{rooms,__ranking_verify__}',(select room from live_points_fixture)) where id=1;
update slarklive_preview_private.state set data=jsonb_set(data,'{rooms,__ranking_verify__,tournament,rounds,0,0,winner}',to_jsonb(data#>>'{rooms,__ranking_verify__,tournament,rounds,0,0,a}')) where id=1;
do $$begin if (select count(*) from public.alunos a join live_points_before b on b.id=a.id where a.pontos=b.points+30)<>4 then raise exception 'Preview changed production ranking'; end if;end$$;
-- Demonstration rooms and byes must not credit the real classroom.
update slarklive_private.state set data=jsonb_set(data,'{rooms,__demo_verify__}',(select room || jsonb_build_object('rankingId',gen_random_uuid(),'demo',true) from live_points_fixture)) where id=1;
update slarklive_private.state set data=jsonb_set(data,'{rooms,__demo_verify__,tournament,rounds,0,0,winner}',to_jsonb(data#>>'{rooms,__demo_verify__,tournament,rounds,0,0,a}')) where id=1;
update slarklive_private.state set data=jsonb_set(data,'{rooms,__bye_verify__}',(select jsonb_set(room || jsonb_build_object('rankingId',gen_random_uuid()),'{tournament,rounds,0,0,bye}','true') from live_points_fixture)) where id=1;
update slarklive_private.state set data=jsonb_set(data,'{rooms,__bye_verify__,tournament,rounds,0,0,winner}',to_jsonb(data#>>'{rooms,__bye_verify__,tournament,rounds,0,0,a}')) where id=1;
do $$begin if (select count(*) from public.alunos a join live_points_before b on b.id=a.id where a.pontos=b.points+30)<>4 then raise exception 'Demo or bye changed ranking'; end if;end$$;
-- An incomplete real roster must roll back the result as well as its credits.
update slarklive_private.state set data=jsonb_set(data,'{rooms,__bad_verify__}',(select jsonb_set(room || jsonb_build_object('rankingId',gen_random_uuid()),array['teams',room#>>'{tournament,rounds,0,0,a}','members'],(room->'teams'->(room#>>'{tournament,rounds,0,0,a}')->'members')-0) from live_points_fixture)) where id=1;
do $$declare rejected boolean:=false;begin
 begin
  update slarklive_private.state set data=jsonb_set(data,'{rooms,__bad_verify__,tournament,rounds,0,0,winner}',to_jsonb(data#>>'{rooms,__bad_verify__,tournament,rounds,0,0,a}')) where id=1;
 exception when raise_exception then
  if sqlerrm not like 'Slark Live: integrantes%' then raise; end if;rejected:=true;
 end;
 if not rejected then raise exception 'Invalid roster was accepted'; end if;
 if (select data#>>'{rooms,__bad_verify__,tournament,rounds,0,0,winner}' from slarklive_private.state where id=1) is not null then raise exception 'Failed result was not rolled back'; end if;
 if (select count(*) from public.alunos a join live_points_before b on b.id=a.id where a.pontos=b.points+30)<>4 then raise exception 'Partial credits persisted'; end if;
 if has_column_privilege('slarklive_app','public.alunos','pontos','UPDATE') then raise exception 'Server role must not gain direct balance update rights'; end if;
end$$;
rollback;
select 'Verified: +30 for all four members, no duplicate credit, public execution denied, preview/demo/byes isolated, invalid roster rolled back; all test changes rolled back.' as result;
