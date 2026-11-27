\set n random(1, 400)
SELECT v AS visit, d AS dev FROM bench_visits WHERE n = :n \gset
SELECT length(public.get_table_state(':visit', ':dev')::text);
