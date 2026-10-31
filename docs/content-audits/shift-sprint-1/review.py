# Review pass for a range of ranks: drops dated offerings that had started by
# the sprint date (they can't be joined from a fresh listing) and lists health
# words in bios and item titles/descriptions for a human look.
#   python3 docs/content-audits/shift-sprint-1/review.py <from> <to>
import json, glob, re, sys
lo, hi = int(sys.argv[1]), int(sys.argv[2])
import datetime
TODAY = (datetime.date.today() + datetime.timedelta(days=3)).isoformat()  # a few days' margin for the live insert
bad = re.compile(r'\b(pain|cancer|tumou?r|autoimmun\w*|anxiety|depress\w*|trauma\w*|ptsd|insomnia|diabet\w*|thyroid|fertility|infertil\w*|menopaus\w*|weight[- ]loss|immun\w*|lyme|covid|addict\w*|arthrit\w*|disease\w*|dis-ease|illness\w*|cure\w*|curing|diagnos\w*|medical|chronic|inflammat\w*|toxin\w*|detox\w*|blood pressure|migraine\w*|womb|surgery)\b', re.I)
for f in sorted(glob.glob('docs/content-audits/*.json')):
    if '.inserted' in f: continue
    try: d = json.load(open(f))
    except Exception: continue
    s = d.get('sprint') if isinstance(d, dict) else None
    if not s or s.get('hub', 'the-shift-network') != 'the-shift-network' or not (lo <= s.get('rank', 0) <= hi): continue
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
