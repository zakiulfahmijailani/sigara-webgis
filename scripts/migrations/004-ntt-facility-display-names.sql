-- Run all statements in one transaction. Remove only the exact display-name suffix.
-- Assignment provenance (nameSource/namaSumber) is retained.
-- statement-break
UPDATE sigara.ntt_facilities
SET payload=jsonb_set(payload,'{properties,nama}',to_jsonb(regexp_replace(payload->'properties'->>'nama',' \(Simulasi\)$','')))
WHERE dataset_id='ntt-showcase-v2' AND payload->'properties'->>'nama' LIKE '% (Simulasi)';
-- statement-break
UPDATE sigara.ntt_episodes
SET payload=payload || jsonb_build_object(
  'fromName',regexp_replace(payload->>'fromName',' \(Simulasi\)$',''),
  'toName',regexp_replace(payload->>'toName',' \(Simulasi\)$',''),
  'altName',regexp_replace(payload->>'altName',' \(Simulasi\)$',''))
WHERE dataset_id='ntt-showcase-v2';
-- statement-break
UPDATE sigara.ntt_visits
SET payload=payload || jsonb_build_object(
  'fromName',regexp_replace(payload->>'fromName',' \(Simulasi\)$',''),
  'toName',regexp_replace(payload->>'toName',' \(Simulasi\)$',''))
WHERE dataset_id='ntt-showcase-v2';
-- statement-break
UPDATE sigara.ntt_resources SET payload=replace(payload::text,' (Simulasi)"','"')::jsonb
WHERE dataset_id='ntt-showcase-v2' AND key='geoai';
-- statement-break
UPDATE sigara.showcase_snapshots SET payload=replace(payload::text,' (Simulasi)"','"')::jsonb
WHERE id='ntt-showcase-v2';
