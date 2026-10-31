-- Run every statement in ONE transaction. Serving data only; raw source/Parquet is retained.
-- statement-break
CREATE TEMP TABLE facility_names ON COMMIT DROP AS
WITH ranked AS (
  SELECT id, payload->'properties' AS p,
    row_number() OVER (PARTITION BY payload->'properties'->>'kabkota', payload->'properties'->>'kelompok' ORDER BY id) AS ordinal
  FROM sigara.ntt_facilities WHERE dataset_id='ntt-showcase-v2'
), named AS (
  SELECT id, p->>'nama' AS original_name,
    CASE WHEN nullif(btrim(p->>'nama'),'') IS NULL
      OR p->>'nama' ~* '(tanpa nama|belum tersedia|^REF-|^Faskes\b|^(Klinik|Puskesmas|Rumah Sakit|RS|nan|null)$)'
    THEN concat(
      CASE p->>'kelompok' WHEN 'rumah_sakit' THEN 'RS Harapan' WHEN 'puskesmas' THEN 'Puskesmas Sejahtera'
        WHEN 'praktik_mandiri' THEN 'Praktik Mandiri Sehat' ELSE 'Klinik Sehat' END,
      ' ', coalesce(nullif(regexp_replace(p->>'kabkota','([a-z])([A-Z])','\1 \2','g'),''),'NTT'),
      ' ', lpad(ordinal::text,3,'0'), ' (Simulasi)')
    ELSE p->>'nama' END AS name
  FROM ranked
)
SELECT id, original_name, name FROM named
UNION ALL
SELECT id, original_name,
  CASE WHEN nullif(btrim(original_name),'') IS NULL OR original_name ~* '(tanpa nama|belum tersedia|^REF-)'
    THEN 'RS Rujukan Lintas Wilayah ' || lpad(row_number() OVER (ORDER BY id)::text,3,'0') || ' (Simulasi)'
    ELSE original_name END
FROM (
  SELECT DISTINCT ON (e.payload->>'altId') e.payload->>'altId' AS id, e.payload->>'altName' AS original_name
  FROM sigara.ntt_episodes e
  WHERE e.dataset_id='ntt-showcase-v2' AND e.payload->>'altId' IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM named n WHERE n.id=e.payload->>'altId')
  ORDER BY e.payload->>'altId', e.id
) outside_alternatives;
-- statement-break
UPDATE sigara.ntt_facilities f
SET payload=jsonb_set(payload,'{properties}', (payload->'properties') || jsonb_build_object(
  'nama',n.name,'namaSumber',n.original_name,'nameSource','assigned_simulation'))
FROM facility_names n
WHERE f.dataset_id='ntt-showcase-v2' AND f.id=n.id AND n.name IS DISTINCT FROM n.original_name;
-- statement-break
UPDATE sigara.ntt_episodes e
SET payload=e.payload || jsonb_build_object('fromName',a.name,'toName',t.name)
  || CASE WHEN e.payload->>'altId' IS NULL THEN '{}'::jsonb
    ELSE jsonb_build_object('altName',(SELECT name FROM facility_names WHERE id=e.payload->>'altId')) END
FROM facility_names a, facility_names t
WHERE e.dataset_id='ntt-showcase-v2' AND a.id=e.from_id AND t.id=e.to_id;
-- statement-break
UPDATE sigara.ntt_visits v
SET payload=v.payload || jsonb_build_object('fromName',a.name,'toName',t.name)
FROM facility_names a, facility_names t
WHERE v.dataset_id='ntt-showcase-v2' AND a.id=v.payload->>'fromId' AND t.id=v.payload->>'toId';
-- statement-break
UPDATE sigara.ntt_resources r
SET payload=jsonb_set(r.payload,'{cases}',(
  SELECT jsonb_agg(c || jsonb_build_object('facilityNames',coalesce(c->'facilityNames','{}'::jsonb) ||
    jsonb_build_object('asal',(SELECT name FROM facility_names WHERE id=c->'facilityIds'->>'asal'),
      'tujuan',(SELECT name FROM facility_names WHERE id=c->'facilityIds'->>'tujuan'))) ORDER BY ord)
  FROM jsonb_array_elements(r.payload->'cases') WITH ORDINALITY AS cases(c,ord)
))
WHERE r.dataset_id='ntt-showcase-v2' AND r.key='geoai';
-- statement-break
UPDATE sigara.showcase_snapshots s
SET payload=s.payload || jsonb_build_object(
  'facilities', jsonb_set(s.payload->'facilities','{features}',(
    SELECT jsonb_agg(f.payload ORDER BY ord)
    FROM jsonb_array_elements(s.payload->'facilities'->'features') WITH ORDINALITY AS features(item,ord)
    JOIN sigara.ntt_facilities f ON f.dataset_id=s.id AND f.id=item->'properties'->>'id')),
  'episodes', (SELECT jsonb_agg(e.payload ORDER BY ord)
    FROM jsonb_array_elements(s.payload->'episodes') WITH ORDINALITY AS episodes(item,ord)
    JOIN sigara.ntt_episodes e ON e.dataset_id=s.id AND e.id=item->>'id'),
  'geoai',(SELECT payload FROM sigara.ntt_resources WHERE dataset_id=s.id AND key='geoai'))
WHERE s.id='ntt-showcase-v2';
-- statement-break
DO $$
BEGIN
  IF (SELECT count(*) FROM facility_names) <> 881 THEN RAISE EXCEPTION 'Unexpected facility registry size'; END IF;
  IF EXISTS (SELECT 1 FROM facility_names WHERE nullif(btrim(name),'') IS NULL OR name ~* '(tanpa nama|belum tersedia|^REF-|^(Klinik|Puskesmas|Rumah Sakit|RS)$)')
    THEN RAISE EXCEPTION 'Incomplete facility names'; END IF;
  IF EXISTS (SELECT 1 FROM sigara.ntt_episodes e
    LEFT JOIN facility_names a ON a.id=e.from_id LEFT JOIN facility_names t ON t.id=e.to_id
    WHERE e.dataset_id='ntt-showcase-v2' AND (a.id IS NULL OR t.id IS NULL
      OR e.payload->>'fromName' IS DISTINCT FROM a.name OR e.payload->>'toName' IS DISTINCT FROM t.name))
    THEN RAISE EXCEPTION 'Episode names do not match facility IDs'; END IF;
  IF EXISTS (SELECT 1 FROM sigara.ntt_visits v
    LEFT JOIN facility_names a ON a.id=v.payload->>'fromId' LEFT JOIN facility_names t ON t.id=v.payload->>'toId'
    WHERE v.dataset_id='ntt-showcase-v2' AND (a.id IS NULL OR t.id IS NULL
      OR v.payload->>'fromName' IS DISTINCT FROM a.name OR v.payload->>'toName' IS DISTINCT FROM t.name))
    THEN RAISE EXCEPTION 'Visit names do not match facility IDs'; END IF;
  IF (SELECT jsonb_array_length(payload->'episodes') FROM sigara.showcase_snapshots WHERE id='ntt-showcase-v2') <> 3683
    THEN RAISE EXCEPTION 'Snapshot lost episodes'; END IF;
END $$;
