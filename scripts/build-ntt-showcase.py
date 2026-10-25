#!/usr/bin/env python3
"""
build-ntt-showcase.py
Reproducible preprocessing script for SIGARA NTT Master Dataset and GeoAI Evidence.
Generates all web-ready data artifacts for the NTT showcase.
"""

import os
import sys
import json
import math
import hashlib
import pandas as pd
import numpy as np

WORKSPACE_ROOT = r"H:\My Drive\1ab. Publication\2026. 10c. BPJS Healthkaton 2026"
APP_DIR = os.path.join(WORKSPACE_ROOT, "sigara-webgis")
DATA_DIR = os.path.join(APP_DIR, "src", "data")
PUBLIC_GEOAI_DIR = os.path.join(APP_DIR, "public", "geoai", "ntt", "v2")

# Authoritative input paths
MASTER_PARQUET = os.path.join(
    WORKSPACE_ROOT,
    "output",
    "master_dummy_ntt",
    "20261024_201204_812821",
    "tabel_utama_rujukan_ntt_2024_dummy.parquet"
)

FACILITIES_GEOPARQUET = os.path.join(
    WORKSPACE_ROOT,
    "output",
    "master_dummy_ntt",
    "20261024_201204_812821",
    "referensi_faskes_ntt.geoparquet"
)

IMAGERY_DIR = os.path.join(
    WORKSPACE_ROOT,
    "output",
    "remote_sensing_poc",
    "paket_16_ntt_v2"
)

IMAGERY_MANIFEST = os.path.join(IMAGERY_DIR, "manifest.json")
IMAGERY_MAPPING_CSV = os.path.join(IMAGERY_DIR, "pemetaan_episode.csv")

GADM_PROV = os.path.join(WORKSPACE_ROOT, "GADM", "gadm41_IDN_1.json", "gadm41_IDN_1.json")
GADM_DIST = os.path.join(WORKSPACE_ROOT, "GADM", "gadm41_IDN_2.json", "gadm41_IDN_2.json")


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def merc_to_wgs84(x, y):
    """Convert EPSG:3857 coordinates to WGS84 (EPSG:4326) [lon, lat]"""
    lon = x / 20037508.342789244 * 180.0
    lat = math.degrees(math.atan(math.exp(y / 20037508.342789244 * math.pi)) * 2 - math.pi / 2)
    return round(lon, 7), round(lat, 7)


def bounds_3857_to_wgs84_corners(b):
    """
    Convert [xmin, ymin, xmax, ymax] in EPSG:3857 to 4 WGS84 corners for MapLibre image source:
    Order required: [top-left, top-right, bottom-right, bottom-left]
    """
    xmin, ymin, xmax, ymax = b
    lon_min, lat_min = merc_to_wgs84(xmin, ymin)
    lon_max, lat_max = merc_to_wgs84(xmax, ymax)
    return [
        [lon_min, lat_max],  # top-left
        [lon_max, lat_max],  # top-right
        [lon_max, lat_min],  # bottom-right
        [lon_min, lat_min],  # bottom-left
    ]


def clean_val(v):
    if v is None:
        return None
    if isinstance(v, (float, np.floating)):
        if math.isnan(v) or math.isinf(v):
            return None
        return round(float(v), 5)
    if isinstance(v, (int, np.integer)):
        return int(v)
    if isinstance(v, pd.Timestamp):
        return v.strftime("%Y-%m-%d")
    return str(v)


def main():
    print("=== SIGARA NTT Data Preprocessing ETL ===")
    os.makedirs(DATA_DIR, exist_ok=True)

    # 1. Load Master Parquet
    print(f"Reading Master Parquet: {MASTER_PARQUET}")
    master_sha = file_sha256(MASTER_PARQUET)
    df = pd.read_parquet(MASTER_PARQUET)
    print(f"Loaded master: {df.shape[0]} rows, {df.shape[1]} columns")

    # 2. Load Facility Reference
    print(f"Reading Facility Reference: {FACILITIES_GEOPARQUET}")
    ref_sha = file_sha256(FACILITIES_GEOPARQUET)
    ref_df = pd.read_parquet(FACILITIES_GEOPARQUET)
    print(f"Loaded facilities: {ref_df.shape[0]} records, {ref_df.shape[1]} columns")

    # 3. Load Imagery Manifest and Mapping
    print(f"Reading Imagery Manifest: {IMAGERY_MANIFEST}")
    with open(IMAGERY_MANIFEST, "r", encoding="utf-8") as f:
        img_manifest_raw = json.load(f)

    # Load mapping CSV
    mapping_df = pd.read_csv(IMAGERY_MAPPING_CSV)
    evidence_episode_ids = set(mapping_df["episode"].astype(str))
    print(f"Evidence episodes ({len(evidence_episode_ids)}): {evidence_episode_ids}")

    # Acceptance check: exactly 8 episodes
    assert len(evidence_episode_ids) == 8, f"Expected 8 evidence episodes, got {len(evidence_episode_ids)}"

    # 4. Prepare GeoAI Manifest with rewritten paths and converted coordinates
    sanitized_images = []
    for item in img_manifest_raw["images"]:
        corners = bounds_3857_to_wgs84_corners(item["bounds_3857"])
        lon_min, lat_min = merc_to_wgs84(item["bounds_3857"][0], item["bounds_3857"][1])
        lon_max, lat_max = merc_to_wgs84(item["bounds_3857"][2], item["bounds_3857"][3])
        
        sanitized_images.append({
            "number": item["number"],
            "package": item["package"],
            "region": item["region"],
            "episode": str(item["episode"]),
            "kind": item["kind"],
            "mode": item["mode"],
            "title": item["title"],
            "scenario": item["scenario"],
            "image": f"/geoai/ntt/v2/{item['image']}",
            "thumbnail": f"/geoai/ntt/v2/{item['thumbnail']}",
            "overlay": f"/geoai/ntt/v2/{item['overlay']}",
            "latar": f"/geoai/ntt/v2/latar/{item['package']}.png",
            "corners": corners,
            "boundsWgs84": [lon_min, lat_min, lon_max, lat_max],
            "bounds3857": item["bounds_3857"],
            "index": item["index"],
            "rule": item["rule"],
            "formula": item["formula"],
            "paper": item["paper"],
            "candidatePixels": item["candidate_pixels"],
            "validFractionLand": item["valid_fraction_land"],
            "nearProxyIntersection": item["near_proxy_intersection"],
            "qualityGapNearProxy": item["quality_gap_near_proxy"],
            "noRealDetection": item.get("no_real_detection", True),
            "nominalGridM": item.get("nominal_grid_m", 20),
            "sha256": item.get("sha256", "")
        })

    sanitized_cases = []
    for c in img_manifest_raw.get("cases", []):
        bounds_corners = bounds_3857_to_wgs84_corners(c["bounds_3857"])
        asal_wgs = merc_to_wgs84(c["points_3857"]["asal"][0], c["points_3857"]["asal"][1])
        tujuan_wgs = merc_to_wgs84(c["points_3857"]["tujuan"][0], c["points_3857"]["tujuan"][1])
        alt_wgs = merc_to_wgs84(c["points_3857"]["alternatif"][0], c["points_3857"]["alternatif"][1])
        
        sanitized_cases.append({
            "package": c["package"],
            "region": c["region"],
            "episode": str(c["episode"]),
            "category": c["category"],
            "facilityIds": c.get("facility_ids", {}),
            "facilityNames": c.get("facility_names", {}),
            "pointsWgs84": {
                "asal": asal_wgs,
                "tujuan": tujuan_wgs,
                "alternatif": alt_wgs
            },
            "corners": bounds_corners
        })

    geoai_output = {
        "version": "ntt-geoai-v2",
        "count": len(sanitized_images),
        "attribution": {
            "sentinel": "Sentinel-2 cloudless — https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)",
            "license": "CC BY-NC-SA 4.0 for non-commercial showcase",
            "syntheticNote": "Peta indeks dan overlay analitis merupakan data sintetis untuk demonstrasi POC. Bukan deteksi bencana real-time."
        },
        "papers": [
            {
                "citation": "Kulk et al. (2023)",
                "doi": "https://doi.org/10.3390/rs15215139",
                "topic": "Flood mapping using MNDWI"
            },
            {
                "citation": "Notti et al. (2023)",
                "doi": "https://doi.org/10.5194/nhess-23-2625-2023",
                "topic": "Landslide candidate mapping using dNDVI & slope"
            },
            {
                "citation": "Picos et al. (2019)",
                "doi": "https://doi.org/10.3390/f10111021",
                "topic": "Burn scar mapping using dNBR"
            }
        ],
        "images": sanitized_images,
        "cases": sanitized_cases
    }

    geoai_path = os.path.join(DATA_DIR, "ntt-geoai-manifest.json")
    with open(geoai_path, "w", encoding="utf-8") as f:
        json.dump(geoai_output, f, indent=2, ensure_ascii=False)
    print(f"Saved GeoAI manifest: {geoai_path} ({os.path.getsize(geoai_path)} bytes)")

    # 5. Extract GADM NTT Province & District Boundaries
    print("Extracting NTT Province boundary...")
    with open(GADM_PROV, "r", encoding="utf-8") as f:
        g1 = json.load(f)
    ntt_prov_feats = [feat for feat in g1["features"] if feat["properties"].get("NAME_1") == "NusaTenggaraTimur"]
    prov_fc = {"type": "FeatureCollection", "features": ntt_prov_feats}
    prov_path = os.path.join(DATA_DIR, "ntt-boundary.geojson")
    with open(prov_path, "w", encoding="utf-8") as f:
        json.dump(prov_fc, f, ensure_ascii=False)
    print(f"Saved NTT boundary: {prov_path} ({os.path.getsize(prov_path)} bytes, {len(ntt_prov_feats)} features)")

    print("Extracting NTT District boundaries...")
    with open(GADM_DIST, "r", encoding="utf-8") as f:
        g2 = json.load(f)
    ntt_dist_feats = [feat for feat in g2["features"] if feat["properties"].get("NAME_1") == "NusaTenggaraTimur"]
    # Simplify properties for web delivery
    for feat in ntt_dist_feats:
        props = feat.get("properties", {})
        feat["properties"] = {
            "gid": props.get("GID_2"),
            "name": props.get("NAME_2"),
            "type": props.get("TYPE_2"),
            "varname": props.get("VARNAME_2")
        }
    dist_fc = {"type": "FeatureCollection", "features": ntt_dist_feats}
    dist_path = os.path.join(DATA_DIR, "ntt-districts.geojson")
    with open(dist_path, "w", encoding="utf-8") as f:
        json.dump(dist_fc, f, ensure_ascii=False)
    print(f"Saved NTT districts: {dist_path} ({os.path.getsize(dist_path)} bytes, {len(ntt_dist_feats)} districts)")

    # 6. Extract Facilities GeoJSON (879 records)
    print("Preparing NTT Facilities GeoJSON...")
    ref_ids_set = set(ref_df["id_faskes_sim"])
    fac_features = []
    fac_lookup = {}

    for _, row in ref_df.iterrows():
        fid = str(row["id_faskes_sim"])
        lon = float(row["longitude"])
        lat = float(row["latitude"])
        nama = str(row["nama"]) if pd.notna(row["nama"]) else f"Faskes {fid}"
        peran = str(row["peran_sim"]) if pd.notna(row["peran_sim"]) else "LAINNYA"
        kelompok = str(row["kelompok"]) if pd.notna(row["kelompok"]) else "UMUM"
        kab = str(row["kabkota_ref"]) if pd.notna(row["kabkota_ref"]) else ""
        sumber = str(row["sumber_audit"]) if pd.notna(row["sumber_audit"]) else ""
        peran_verif = bool(row["peran_terverifikasi"]) if pd.notna(row["peran_terverifikasi"]) else False
        exist_verif = bool(row["keberadaan_2024_terverifikasi"]) if pd.notna(row["keberadaan_2024_terverifikasi"]) else False
        
        # Capability dictionary
        capabilities = {}
        for col in ref_df.columns:
            if col.startswith("layanan_") and bool(row[col]) is True:
                service_name = col.replace("layanan_", "")
                capabilities[service_name] = True

        fac_record = {
            "id": fid,
            "nama": nama,
            "peran": peran,
            "kelompok": kelompok,
            "kabkota": kab,
            "sumber": sumber,
            "peranVerif": peran_verif,
            "existVerif": exist_verif,
            "lon": lon,
            "lat": lat,
            "services": list(capabilities.keys())
        }
        fac_lookup[fid] = fac_record

        fac_features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": {
                "id": fid,
                "nama": nama,
                "peran": peran,
                "kelompok": kelompok,
                "kabkota": kab,
                "peranVerif": peran_verif,
                "existVerif": exist_verif
            }
        })

    fac_fc = {"type": "FeatureCollection", "features": fac_features}
    fac_path = os.path.join(DATA_DIR, "ntt-facilities.geojson")
    with open(fac_path, "w", encoding="utf-8") as f:
        json.dump(fac_fc, f, ensure_ascii=False)
    print(f"Saved NTT facilities: {fac_path} ({os.path.getsize(fac_path)} bytes, {len(fac_features)} features)")

    # 7. Process Master Episodes and Visits
    print("Processing master visits and episodes...")
    # Ensure episode ID is string
    df["id_kelompok_rujukan_fktp"] = df["id_kelompok_rujukan_fktp"].astype(str)

    # Reconcile master facility IDs
    master_orig_ids = set(df["id_faskes_asal_sim"].dropna().astype(str))
    master_dest_ids = set(df["id_faskes_tujuan_sim"].dropna().astype(str))
    all_master_facs = master_orig_ids | master_dest_ids
    
    unmatched_origins = master_orig_ids - ref_ids_set
    unmatched_destinations = master_dest_ids - ref_ids_set
    print(f"Distinct origin facility IDs: {len(master_orig_ids)} (unmatched in ref: {len(unmatched_origins)})")
    print(f"Distinct destination facility IDs: {len(master_dest_ids)} (unmatched in ref: {len(unmatched_destinations)})")

    # Detect outside NTT nearest alternatives (10 episodes)
    master_alt_ids = set(df["id_alternatif_layak_terdekat"].dropna().astype(str))
    alt_outside_ids = master_alt_ids - ref_ids_set
    print(f"Distinct alternative facility IDs not in NTT reference: {alt_outside_ids}")

    # Build episodes dictionary and visits dictionary
    episodes_map = {}
    visits_map = {}

    grouped = df.groupby("id_kelompok_rujukan_fktp", sort=False)

    for ep_id, group in grouped:
        first_row = group.iloc[0]
        
        # Date processing
        dates_fktp = group["tanggal_kunjungan_fktp"].dropna()
        dates_fkrtl = group["tanggal_datang_fkrtl"].dropna()
        first_date = dates_fktp.min() if len(dates_fktp) else None
        last_date = dates_fkrtl.max() if len(dates_fkrtl) else (dates_fktp.max() if len(dates_fktp) else None)

        alt_id = first_row.get("id_alternatif_layak_terdekat")
        alt_id_str = str(alt_id) if pd.notna(alt_id) else None
        alt_is_outside = alt_id_str in alt_outside_ids

        # Alternative coords: if outside NTT, mark altOutside=True
        alt_lon = clean_val(first_row.get("longitude_alternatif_sim"))
        alt_lat = clean_val(first_row.get("latitude_alternatif_sim"))

        ep_record = {
            "id": str(ep_id),
            "cat": str(first_row["kategori_indikasi"]),  # TINGGI_SIM, SEDANG_SIM, RENDAH_SIM
            "fromId": str(first_row["id_faskes_asal_sim"]),
            "fromName": str(first_row.get("nama_faskes_asal_sim") or fac_lookup.get(str(first_row["id_faskes_asal_sim"]), {}).get("nama", first_row["id_faskes_asal_sim"])),
            "fromLon": clean_val(first_row["longitude_asal_sim"]),
            "fromLat": clean_val(first_row["latitude_asal_sim"]),
            "toId": str(first_row["id_faskes_tujuan_sim"]),
            "toName": str(first_row.get("nama_faskes_tujuan_sim") or fac_lookup.get(str(first_row["id_faskes_tujuan_sim"]), {}).get("nama", first_row["id_faskes_tujuan_sim"])),
            "toLon": clean_val(first_row["longitude_tujuan_sim"]),
            "toLat": clean_val(first_row["latitude_tujuan_sim"]),
            "altId": alt_id_str,
            "altName": fac_lookup.get(alt_id_str, {}).get("nama", alt_id_str) if alt_id_str else None,
            "altLon": alt_lon,
            "altLat": alt_lat,
            "altOutside": alt_is_outside,
            "distM": clean_val(first_row.get("jarak_tujuan_m")),
            "timeMin": clean_val(first_row.get("waktu_tujuan_menit")),
            "altTimeMin": clean_val(first_row.get("waktu_alternatif_layak_min")),
            "diffMin": clean_val(first_row.get("selisih_waktu_menit")),
            "timeRatio": clean_val(first_row.get("rasio_waktu")),
            "nCloser": clean_val(first_row.get("jumlah_alternatif_layak_lebih_dekat")),
            "reason": str(first_row.get("alasan_indikasi", "tidak_ada")),
            "fraudIdx": clean_val(first_row.get("indeks_indikasi_fraud")),
            "kabAsal": str(first_row.get("kabkota_asal_sim_gadm", "")),
            "kabTujuan": str(first_row.get("kabkota_tujuan_sim_gadm", "")),
            "distMethod": str(first_row.get("metode_jarak", "proksi_lingkaran")),
            "timeMethod": str(first_row.get("metode_waktu", "proksi_kecepatan")),
            "visitCount": len(group),
            "firstDate": clean_val(first_date),
            "lastDate": clean_val(last_date),
            "month": first_date.strftime("%Y-%m") if pd.notna(first_date) else "2024-01",
            "hasGeoAI": str(ep_id) in evidence_episode_ids
        }
        episodes_map[str(ep_id)] = ep_record

        # Store visits
        v_list = []
        for _, v_row in group.iterrows():
            v_list.append({
                "visitId": str(v_row.get("id_kunjungan_fkrtl", "")),
                "dateFktp": clean_val(v_row.get("tanggal_kunjungan_fktp")),
                "dateFktpEnd": clean_val(v_row.get("tanggal_pulang_fktp")),
                "dateFkrtl": clean_val(v_row.get("tanggal_datang_fkrtl")),
                "dateFkrtlEnd": clean_val(v_row.get("tanggal_pulang_fkrtl")),
                "fromId": str(v_row.get("id_faskes_asal_sim", "")),
                "fromName": str(v_row.get("nama_faskes_asal_sim", "")),
                "toId": str(v_row.get("id_faskes_tujuan_sim", "")),
                "toName": str(v_row.get("nama_faskes_tujuan_sim", "")),
                "diagnosa": str(v_row.get("diagnosa_awal_fktp", "")) if pd.notna(v_row.get("diagnosa_awal_fktp")) else None,
                "poli": str(v_row.get("poli_tujuan_sim", "")) if pd.notna(v_row.get("poli_tujuan_sim")) else None
            })
        visits_map[str(ep_id)] = v_list

    episodes_list = list(episodes_map.values())

    # Write episodes JSON
    episodes_path = os.path.join(DATA_DIR, "ntt-episodes.json")
    with open(episodes_path, "w", encoding="utf-8") as f:
        json.dump(episodes_list, f, ensure_ascii=False)
    print(f"Saved NTT episodes: {episodes_path} ({os.path.getsize(episodes_path)} bytes, {len(episodes_list)} episodes)")

    # Write visits JSON
    visits_path = os.path.join(DATA_DIR, "ntt-visits.json")
    with open(visits_path, "w", encoding="utf-8") as f:
        json.dump(visits_map, f, ensure_ascii=False)
    print(f"Saved NTT visits: {visits_path} ({os.path.getsize(visits_path)} bytes, {len(visits_map)} episode keys)")

    # 8. Create Summary Metadata
    cat_counts = {
        "TINGGI_SIM": sum(1 for e in episodes_list if e["cat"] == "TINGGI_SIM"),
        "SEDANG_SIM": sum(1 for e in episodes_list if e["cat"] == "SEDANG_SIM"),
        "RENDAH_SIM": sum(1 for e in episodes_list if e["cat"] == "RENDAH_SIM")
    }
    visit_cat_counts = {
        "TINGGI_SIM": sum(e["visitCount"] for e in episodes_list if e["cat"] == "TINGGI_SIM"),
        "SEDANG_SIM": sum(e["visitCount"] for e in episodes_list if e["cat"] == "SEDANG_SIM"),
        "RENDAH_SIM": sum(e["visitCount"] for e in episodes_list if e["cat"] == "RENDAH_SIM")
    }

    # Unique participants
    participants_count = int(df["id_peserta_sumber"].nunique())

    # Months list
    months_list = sorted(list(set(e["month"] for e in episodes_list if e["month"])))

    # Districts list
    districts_list = sorted(list(set(e["kabAsal"] for e in episodes_list if e["kabAsal"])))

    # GeoAI episodes
    geoai_eps = [e["id"] for e in episodes_list if e["hasGeoAI"]]

    # Outside NTT alternatives
    outside_alt_eps = [e["id"] for e in episodes_list if e.get("altOutside")]

    summary_data = {
        "version": "ntt-showcase-v2",
        "snapshotAt": "2026-10-25T20:30:00+07:00",
        "masterSha256": master_sha,
        "referenceSha256": ref_sha,
        "scope": "Nusa Tenggara Timur (Provinsi & Kepulauan)",
        "totals": {
            "visits": len(df),
            "episodes": len(episodes_list),
            "participants": participants_count,
            "facilitiesReference": len(ref_df),
            "masterUniqueOrigins": len(master_orig_ids),
            "masterUniqueDestinations": len(master_dest_ids),
            "masterUniqueFacilities": len(all_master_facs),
            "geoaiEpisodes": len(geoai_eps),
            "outsideAltEpisodes": len(outside_alt_eps)
        },
        "episodeCategories": cat_counts,
        "visitCategories": visit_cat_counts,
        "months": months_list,
        "districts": districts_list,
        "geoaiEpisodeIds": geoai_eps,
        "outsideAltEpisodeIds": outside_alt_eps,
        "disclaimer": "Kasus, koordinat fasilitas, dan indeks prioritas merupakan data sintetis untuk keperluan simulasi POC Healthkathon 2026. Bukan penetapan kecurangan (fraud) terbukti."
    }

    summary_path = os.path.join(DATA_DIR, "ntt-summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2, ensure_ascii=False)
    print(f"Saved NTT summary: {summary_path} ({os.path.getsize(summary_path)} bytes)")

    # 9. Verification & Acceptance Checks
    print("\n=== ACCEPTANCE CHECKS ===")
    checks = [
        ("Total visits match 10,776", len(df) == 10776, len(df)),
        ("Total episodes match 3,683", len(episodes_list) == 3683, len(episodes_list)),
        ("Total participants match 2,329", participants_count == 2329, participants_count),
        ("TINGGI_SIM episodes match 364", cat_counts["TINGGI_SIM"] == 364, cat_counts["TINGGI_SIM"]),
        ("SEDANG_SIM episodes match 23", cat_counts["SEDANG_SIM"] == 23, cat_counts["SEDANG_SIM"]),
        ("RENDAH_SIM episodes match 3,296", cat_counts["RENDAH_SIM"] == 3296, cat_counts["RENDAH_SIM"]),
        ("TINGGI_SIM visits match 926", visit_cat_counts["TINGGI_SIM"] == 926, visit_cat_counts["TINGGI_SIM"]),
        ("SEDANG_SIM visits match 49", visit_cat_counts["SEDANG_SIM"] == 49, visit_cat_counts["SEDANG_SIM"]),
        ("RENDAH_SIM visits match 9,801", visit_cat_counts["RENDAH_SIM"] == 9801, visit_cat_counts["RENDAH_SIM"]),
        ("Facility reference count matches 879", len(ref_df) == 879, len(ref_df)),
        ("Distinct master origins match 185", len(master_orig_ids) == 185, len(master_orig_ids)),
        ("Distinct master destinations match 387", len(master_dest_ids) == 387, len(master_dest_ids)),
        ("GeoAI images count matches 16", len(sanitized_images) == 16, len(sanitized_images)),
        ("GeoAI episodes count matches 8", len(geoai_eps) == 8, len(geoai_eps)),
        ("Outside-NTT alternative episodes match 10", len(outside_alt_eps) == 10, len(outside_alt_eps))
    ]

    all_passed = True
    for title, passed, val in checks:
        status = "PASS" if passed else "FAIL"
        print(f"[{status}] {title}: {val}")
        if not passed:
            all_passed = False

    if all_passed:
        print("\nAll acceptance checks passed successfully!")
    else:
        print("\nSome acceptance checks FAILED!")
        sys.exit(1)


if __name__ == "__main__":
    main()
