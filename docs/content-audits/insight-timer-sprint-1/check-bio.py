# Original-wording check (README §18.4): finds runs of 8+ consecutive words that a
# plan's bio or item descriptions share with the teacher's own pages.
#   python3 -I docs/content-audits/insight-timer-sprint-1/check-bio.py <plan.json> <source> [<source> ...]
# Sources are saved pages: .html (tags stripped) or .txt (e.g. the Insight Timer
# bio quoted word for word). Runs wholly inside one of the plan's own item titles
# (books, offerings, free resources) are ignored. Exit code 1 if anything matches.
import html, json, re, sys

plan_path, sources = sys.argv[1], sys.argv[2:]
plan = json.load(open(plan_path))
words = lambda t: re.findall(r'[a-z0-9]+', (t or '').lower().replace("'", '').replace('’', ''))

def text(path):
    t = open(path, encoding='utf8', errors='ignore').read()
    if path.endswith(('.html', '.htm')):
        t = re.sub(r'(?s)<script.*?</script>|<style.*?</style>', ' ', t)
        t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
    return t

grams = set()
for p in sources:
    s = words(text(p))
    grams |= {tuple(s[i:i + 8]) for i in range(len(s) - 7)}
titles = [' '.join(words(it['title'])) for k in ('books', 'courses', 'free_resources') for it in plan.get(k, [])]

def runs(t):
    b, out, i = words(t), [], 0
    while i <= len(b) - 8:
        if tuple(b[i:i + 8]) in grams:
            j = i + 8
            while j < len(b) and tuple(b[j - 7:j + 1]) in grams: j += 1
            run = ' '.join(b[i:j])
            if not any(run in x for x in titles if len(x.split()) >= 3): out.append(run)
            i = j
        else: i += 1
    return out

found = [('bio', r) for r in runs(plan['healer']['create']['bio'])]
for k in ('videos', 'books', 'courses', 'free_resources'):
    for it in plan.get(k, []):
        found += [(f"{k}: {it['title'][:50]}", r) for r in runs(it.get('description'))]
for where, r in found: print(f'COPIED ({where}): {r}')
print(f"{len(found)} copied run(s) against {len(sources)} source(s)" if found else f'OK: no 8-word runs against {len(sources)} source(s)')
sys.exit(1 if found else 0)
