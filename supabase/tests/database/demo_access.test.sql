begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into demo_access_codes (code_hash, display_suffix)
values ('test-code-hash', 'A5HZ');

select results_eq(
  $$select count(*)::bigint from activate_demo_code('test-code-hash','test-session-hash','203.0.113.10')$$,
  $$values (1::bigint)$$,
  'first activation returns one row'
);

select results_eq(
  $$select count(*)::bigint from activate_demo_code('test-code-hash','second-session','203.0.113.11')$$,
  $$values (0::bigint)$$,
  'second activation returns no row'
);

select ok(
  (select abs(extract(epoch from (session_deadline - activated_at)) - 600) <= 2
     from demo_access_codes where code_hash = 'test-code-hash'),
  'deadline is ten minutes after activation'
);

select is(
  claim_demo_generation_attempt('test-session-hash'),
  1,
  'first generation attempt is claimed'
);
select is(
  claim_demo_generation_attempt('test-session-hash'),
  2,
  'second generation attempt is claimed'
);
select is(
  claim_demo_generation_attempt('test-session-hash'),
  3,
  'third generation attempt is claimed'
);
select is(
  claim_demo_generation_attempt('test-session-hash'),
  null::integer,
  'fourth attempt is rejected'
);

insert into demo_requests (access_code_id, name, package_id)
select id, 'Test User', 7 from demo_access_codes
where code_hash = 'test-code-hash';

select ok(
  complete_demo_generation(
    'test-session-hash',
    (select id from demo_requests where access_code_id =
      (select id from demo_access_codes where code_hash = 'test-code-hash')),
    'provider-1', 'demo-user', 'ciphertext', 'iv', 'tag', now() + interval '1 hour'
  ),
  'successful result is completed atomically'
);
select is(
  (select status from demo_access_codes where code_hash = 'test-code-hash'),
  'used',
  'successful result consumes the access code'
);
select is(
  (select status from demo_requests limit 1),
  'ok',
  'successful result marks the request complete'
);

set local role anon;
select throws_ok(
  $$select * from activate_demo_code('x','y','z')$$,
  'anon cannot activate codes directly'
);
select throws_ok(
  $$select claim_demo_generation_attempt('y')$$,
  'anon cannot claim generation attempts directly'
);
reset role;

set local role authenticated;
select throws_ok(
  $$select * from activate_demo_code('x','y','z')$$,
  'authenticated cannot activate codes directly'
);
select throws_ok(
  $$select claim_demo_generation_attempt('y')$$,
  'authenticated cannot claim generation attempts directly'
);
reset role;

select * from finish();
rollback;
