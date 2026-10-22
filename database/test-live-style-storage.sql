begin;
do $$
declare who uuid; other_id uuid; ordinary uuid; stored text; denied boolean;
begin
 select id into who from public.usuarios where perfil::text='admin_slark' or nome ilike '%vtx%' or email ilike '%vtx%' limit 1;
 if who is null then raise exception 'Missing fixture';end if;
 select id into other_id from public.usuarios where id<>who limit 1;
 perform set_config('request.jwt.claim.sub',who::text,true);
 set local role authenticated;
 insert into public.personalizacoes_slarklive(usuario_id,skin,texto,moldura) values(who,'ouro','dourado','ouro')
 on conflict(usuario_id) do update set skin=excluded.skin,texto=excluded.texto,moldura=excluded.moldura;
 select skin into stored from public.personalizacoes_slarklive where usuario_id=who;
 if stored<>'ouro' then raise exception 'Gold did not persist';end if;
 update public.personalizacoes_slarklive set skin='rubi' where usuario_id=who;
 select skin into stored from public.personalizacoes_slarklive where usuario_id=who;
 if stored<>'rubi' then raise exception 'Second style did not persist';end if;
 denied:=false;
 begin
  insert into public.personalizacoes_slarklive(usuario_id,skin) values(other_id,'slark');
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Cross-account write allowed';end if;
 reset role;
 select u.id into ordinary from public.usuarios u
 where u.perfil::text='aluno' and coalesce(u.nome,'') not ilike '%vtx%' and coalesce(u.email,'') not ilike '%vtx%'
 and (select count(distinct (r.room_id,r.round_index,r.match_slot)) from slarklive_private.match_rewards r join public.alunos a on a.id=r.aluno_id where a.usuario_id=u.id)<25 limit 1;
 if ordinary is null then raise exception 'Missing ordinary fixture';end if;
 perform set_config('request.jwt.claim.sub',ordinary::text,true);
 set local role authenticated;
 if exists(select 1 from public.personalizacoes_slarklive where usuario_id=who) then raise exception 'Cross-account read allowed';end if;
 denied:=false;
 begin
  insert into public.personalizacoes_slarklive(usuario_id,skin) values(ordinary,'ouro') on conflict(usuario_id) do update set skin=excluded.skin;
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Locked Gold was accepted';end if;
 insert into public.personalizacoes_slarklive(usuario_id,skin) values(ordinary,'slark') on conflict(usuario_id) do update set skin='slark',texto='padrao',moldura='padrao';
 reset role;
end $$;
rollback;
select 'Verified: authenticated save/reload, second selection, VTX/admin access, cross-account isolation and victory lock; all test writes rolled back.' as result;
