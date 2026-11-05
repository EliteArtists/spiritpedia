"""Email pass (5 Nov 2026): check every result file before anything is applied.

  python3 -I docs/content-audits/email-pass-2026-11-05/verify.py

For each result: the shape is right, the slug is in the queue, and a found
address appears on its saved source page (as text, in a mailto, or behind
Cloudflare's data-cfemail, decoded here), or a lead has checked it by hand
(`verified_by_hand`, saying how). Writes checked.json beside it,
which apply.mjs reads; prints the problems and the totals.
"""
import json
import os
import re
import sys
from html import unescape

DIR = 'docs/content-audits/email-pass-2026-11-05'
EMAIL = re.compile(r'^[^@\s]+@[^@\s]+\.[a-z]{2,}$', re.I)
OFF_LIMITS = re.compile(r'(^|\.)(theshiftnetwork\.com|mindvalley\.com|humanitysteam\.org|spiritrock\.org|evolvingwisdom\.com|'
                        r'linktr\.ee|amazon\.com|amzn\.to|openlibrary\.org|instagram\.com|facebook\.com|substack\.com|'
                        r'x\.com|twitter\.com|linkedin\.com|tiktok\.com)$', re.I)


def host(url):
    m = re.match(r'https?://([^/:?#]+)', url or '')
    return m.group(1).lower() if m else ''


def cf_decode(hexstr):
    key = int(hexstr[:2], 16)
    return ''.join(chr(int(hexstr[i:i + 2], 16) ^ key) for i in range(2, len(hexstr), 2))


def page_text(path):
    raw = open(path, encoding='utf-8', errors='replace').read()
    decoded = [cf_decode(h) for h in re.findall(r'data-cfemail="([0-9a-f]+)"', raw)]
    decoded += [cf_decode(h) for h in re.findall(r'/cdn-cgi/l/email-protection#([0-9a-f]+)', raw)]
    text = unescape(raw)
    # "[at]" / "(dot)" style, as shown to readers.
    loose = re.sub(r'\s*[\[\(\{]\s*at\s*[\]\)\}]\s*', '@', text, flags=re.I)
    loose = re.sub(r'\s*[\[\(\{]\s*dot\s*[\]\)\}]\s*', '.', loose, flags=re.I)
    return (text + '\n' + loose + '\n' + '\n'.join(decoded)).lower()


queue = {q['slug']: q for q in json.load(open(f'{DIR}/queue.json'))}
results, problems = {}, []
for name in sorted(os.listdir(f'{DIR}/results')):
    if not name.endswith('.json'):
        continue
    r = json.load(open(f'{DIR}/results/{name}'))
    slug = r.get('slug')
    issues = []
    if slug not in queue or name != f'{slug}.json':
        issues.append('slug not in queue or file name differs')
    outcome = r.get('outcome')
    if outcome not in ('email', 'form', 'none'):
        issues.append(f'outcome {outcome!r}')
    email = (r.get('email') or '').strip()
    if outcome == 'email':
        if not EMAIL.match(email):
            issues.append(f'not an address: {email!r}')
        if not r.get('email_source', '').startswith('http'):
            issues.append('no email_source URL')
        src = r.get('saved_source')
        if not src or not os.path.exists(src):
            issues.append('saved source missing')
        elif email.lower() not in page_text(src) and not r.get('verified_by_hand'):
            issues.append(f'{email} not found on the saved source page')
        if OFF_LIMITS.search(host(r.get('email_source'))):
            issues.append('email_source is an off-limits site')
    form = r.get('contact_form_url')
    if outcome == 'form' and not (form or '').startswith('http'):
        issues.append('form outcome without a contact_form_url')
    if form and OFF_LIMITS.search(host(form)):
        issues.append('contact form on an off-limits site')
    for url in r.get('checked') or []:
        if OFF_LIMITS.search(host(url)):
            issues.append(f'checked an off-limits site: {url}')
    r['verified'] = not issues
    r['issues'] = issues
    results[slug] = r
    if issues:
        problems.append(f"{r.get('n')} {slug}: {'; '.join(issues)}")

missing = [s for s in queue if s not in results]
json.dump(results, open(f'{DIR}/checked.json', 'w'), indent=1, ensure_ascii=False)
counts = {}
for r in results.values():
    counts[r.get('outcome')] = counts.get(r.get('outcome'), 0) + 1
print(f'{len(results)} results of {len(queue)}; {counts}; doubtful {sum(bool(r.get("doubtful")) for r in results.values())}')
if missing:
    print(f'missing ({len(missing)}): {", ".join(missing)}')
print('\n'.join(problems) or 'no problems')
sys.exit(1 if problems else 0)
