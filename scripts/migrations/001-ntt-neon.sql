CREATE SCHEMA IF NOT EXISTS sigara;
CREATE TABLE IF NOT EXISTS sigara.ntt_datasets (
  id text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('loading','ready')),
  manifest jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sigara.ntt_resources (
  dataset_id text NOT NULL REFERENCES sigara.ntt_datasets(id),
  key text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY(dataset_id,key)
);
CREATE TABLE IF NOT EXISTS sigara.ntt_episodes (
  dataset_id text NOT NULL REFERENCES sigara.ntt_datasets(id),
  id text NOT NULL,
  category text NOT NULL,
  from_id text NOT NULL,
  to_id text NOT NULL,
  district text NOT NULL,
  month text NOT NULL,
  has_geoai boolean NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY(dataset_id,id)
);
CREATE INDEX IF NOT EXISTS ntt_episodes_filters ON sigara.ntt_episodes(dataset_id,district,month,category,id);
CREATE INDEX IF NOT EXISTS ntt_episodes_origin ON sigara.ntt_episodes(dataset_id,from_id,to_id,id);
CREATE TABLE IF NOT EXISTS sigara.ntt_visits (
  dataset_id text NOT NULL,
  episode_id text NOT NULL,
  sequence integer NOT NULL,
  visit_id text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY(dataset_id,episode_id,sequence),
  FOREIGN KEY(dataset_id,episode_id) REFERENCES sigara.ntt_episodes(dataset_id,id)
);
CREATE TABLE IF NOT EXISTS sigara.ntt_facilities (
  dataset_id text NOT NULL REFERENCES sigara.ntt_datasets(id),
  id text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY(dataset_id,id)
);
CREATE TABLE IF NOT EXISTS sigara.ntt_master_rujukan (
  dataset_id text NOT NULL REFERENCES sigara.ntt_datasets(id),
  row_number integer NOT NULL,
  episode_id text NOT NULL,
  visit_id text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY(dataset_id,row_number)
);
CREATE INDEX IF NOT EXISTS ntt_master_episode ON sigara.ntt_master_rujukan(dataset_id,episode_id);
CREATE TABLE IF NOT EXISTS sigara.ntt_source_files (
  dataset_id text NOT NULL REFERENCES sigara.ntt_datasets(id),
  filename text NOT NULL,
  sha256 text NOT NULL,
  content bytea NOT NULL,
  PRIMARY KEY(dataset_id,filename)
);
COMMENT ON TABLE sigara.ntt_master_rujukan IS 'Master NTT 2024: 206 source columns in payload. Original column types and source hash in dataset manifest. Synthetic enrichment for POC, not a fraud verdict. No public raw-master API.';
COMMENT ON TABLE sigara.ntt_source_files IS 'Exact original Parquet retained for lossless recovery. Not accessible to the public application reader.';
