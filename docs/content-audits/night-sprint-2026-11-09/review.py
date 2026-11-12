# Review pass for a range of ranks: drops dated offerings that had started by
# the sprint date (they can't be joined from a fresh listing) and lists health
# words in bios and item titles/descriptions for a human look.
#   python3 docs/content-audits/night-sprint-2026-11-09/review.py <from> <to>
import json, glob, re, sys
lo, hi = int(sys.argv[1]), int(sys.argv[2])
import datetime
TODAY = (datetime.date.today() + datetime.timedelta(days=3)).isoformat()  # a few days' margin for the live insert
# The health rule since 12 Nov 2026 (README §18.4): words that may mean a claim
# to cure or treat a disease; the same list as scripts/lib/health.mjs.
bad = re.compile(r'\b(cure[sd]?|curing|incurable|treat(?:s|ed|ing|ment)?|reverse[sd]?|heal(?:s|ed|ing)? (?:your |the )?(?:body|disease|illness)|cancer\w*|tumou?r\w*|immun\w*|autoimmun\w*|diabet\w*|thyroid|lyme|covid\w*|coronavirus|vaccin\w*|arthrit\w*|alzheimer\w*|parkinson\w*|dementia|asthma|autis\w*|hypertension|blood pressure|cholesterol|infertil\w*|disease\w*|chronic (?:illness|fatigue|disease)|fibromyalgia|lupus|multiple sclerosis|ibs|crohn\w*|inflammat\w*|medication|instead of (?:a |your )?doctor|stop (?:your|taking) \w+)\b', re.I)
for f in sorted(glob.glob('docs/content-audits/*.json')):
    if '.inserted' in f: continue
    try: d = json.load(open(f))
    except Exception: continue
    s = d.get('sprint') if isinstance(d, dict) else None
    if not s or s.get('sprint') != 'night-1' or not (lo <= s.get('rank', 0) <= hi): continue
    before = len(d['courses'])
    d['courses'] = [c for c in d['courses'] if not (c.get('start_date') and c['start_date'] < TODAY)]
    dropped = before - len(d['courses'])
    if dropped:
        s.setdefault('left_out', []).append(f'{dropped} dated offering(s) that had already started by {TODAY}')
        json.dump(d, open(f, 'w'), indent=2, ensure_ascii=False)
    hits = []
    m = bad.findall(d['healer']['create']['bio'])
    if m: hits.append(('BIO', sorted(set(x.lower() for x in m))))
    for k in ['videos', 'books', 'courses', 'free_resources']:
        for it in d[k]:
            m = bad.findall(it['title'] + ' || ' + (it.get('description') or ''))
            if m: hits.append((k, it['title'][:80], sorted(set(x.lower() for x in m))))
    n = sum(len(d[k]) for k in ['videos', 'books', 'courses', 'free_resources'])
    print(f"#{s['rank']} {f.split('/')[-1]} items={n} dropped_started={dropped}")
    for h in hits: print('   ', h)
