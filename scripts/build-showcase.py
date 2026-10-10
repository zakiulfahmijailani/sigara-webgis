"""python scripts/build-showcase.py ../output/neon_kupang_import/kupang-city-package.json
Creates a synthetic showcase variant without modifying the baseline.
Existing Dijkstra times, geometries, and thresholds are retained.
"""
import json, sys, hashlib
from pathlib import Path
source=Path(sys.argv[1]); p=json.loads(source.read_text(encoding='utf-8'))
routes=[{'from':r['fktp_id'],'to':r['rs_id'],'minutes':r['menit_model'],'km':r['km_jalan'],'geometry':r['geometry']} for r in p['routes']]
caps={}
for c in p['capabilities']: caps.setdefault(c['fasilitas_id'],{})[c['layanan']]=c['mampu']
original={a['rujukan_id']:a for a in p['assessments']}
times={f:{r['to']:r['minutes'] for r in routes if r['from']==f} for f in {r['from'] for r in routes}}
changed=[]; cases=[]
for raw in p['referrals']:
    r=dict(id=raw['rujukan_id'],date=raw['tanggal'],month=raw['bulan'],to=raw['rs_tujuan'],service=raw['layanan'],reason=raw['alasan'],verified=raw['alasan_terverifikasi'],evidence=raw['bukti_lengkap'],eligible=raw['eligible_jkn'],emergency=raw['kondisi_darurat'],documentId=raw['dokumen_id'],capacities=raw['kapasitas_per_rs'],showcaseAdjusted=False)
    r['from']=raw['fktp_id']
    if len(changed)<25 and original[r['id']]['status']=='Sesuai model' and not r['emergency']:
        t=times[r['from']]; capable=[h for h in caps if caps[h].get(r['service'],False)]
        if capable:
            fastest=min(t[h] for h in capable)
            choices=[h for h in capable if t[h]-fastest>=8 and t[h]/max(fastest,.1)>=1.5 and sum(t[a]<t[h] for a in capable)>=2]
            if choices:
                r.update(to=max(choices,key=lambda h:t[h]),reason='tidak_ada',verified=False,evidence=True,eligible=True,capacities={h:True for h in caps},showcaseAdjusted=True)
                changed.append(r['id'])
    cases.append(r)
assert len(changed)==25
result=dict(metadata=dict(version='kupang-showcase-v1',snapshotAt='2026-10-10T10:00:00+08:00',expectedCounts=dict(red=25,orange=52,green=1003),baseCounts=dict(red=0,orange=52,green=1028),adjustedIds=changed,sourceHash=hashlib.sha256(source.read_bytes()).hexdigest(),city='Kota Kupang',policy='kupang-city-v1'),facilities=[dict(id=f['fasilitas_id'],kind=f['jenis'],lon=f['lon'],lat=f['lat'],node=f['node']) for f in p['facilities']],routes=routes,capabilities=caps,boundary=p['area'],roads=dict(type='MultiLineString',coordinates=[r['geometry']['coordinates'] for r in p['roads'] if r['highway'] in ('primary','secondary','tertiary','trunk')]),publicFacilities=[dict(id=f['osm_id'],name=f['nama'],lon=f['lon'],lat=f['lat']) for f in p['public_facilities']],cases=cases)
dest=Path(__file__).resolve().parents[1]/'src/data/showcase.json';dest.parent.mkdir(parents=True,exist_ok=True)
dest.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f'{len(cases)} synthetic referrals; {len(changed)} adjusted scenarios; {dest.stat().st_size} bytes')
