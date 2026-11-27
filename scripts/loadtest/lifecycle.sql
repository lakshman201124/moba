\set tno random(1, 2000)
SELECT md5('t' || :tno) AS qr, gen_random_uuid()::text AS dev, gen_random_uuid()::text AS coid \gset
SELECT public.start_visit(':qr', ':dev')->>'visit' AS visit \gset
SELECT length(public.get_public_menu()::text);
SELECT public.place_order(':visit', ':dev', ':coid'::uuid, '[{"dish_id":"367d445d-e7c9-4e77-8ab3-49d0d2f4d575","qty":1},{"dish_id":"dfa2aece-5dfa-4bb4-8187-18493f618f96","qty":2}]'::jsonb, 367)->>'orderNo';
SELECT length(public.get_table_state(':visit', ':dev')::text);
