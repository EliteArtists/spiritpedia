# Puts the 1 Nov 2026 content run live (owner's OK, 1 Nov 2026).
#
#   python3 docs/content-audits/content-run-2026-11-01-live.py
#
# The IMS hub listing and Sharon Salzberg's founder link are already live.
# This inserts the run's 98 teachers on live in run order (each one's
# .live.inserted.json log makes it rollback-able with ingest.mjs --rollback),
# then adds Joseph Goldstein as co-author of Seeking the Heart of Wisdom
# (content-run-fixes-2026-11-01.mjs, logged). Every plan dry-ran clean on live
# first. Safe to run again: anything already in is skipped.
import json, re, subprocess, sys

plans = json.load(open('docs/content-audits/content-run-2026-11-01.json'))['plans']
shared = []
for i, slug in enumerate(plans, 1):
    out = subprocess.run(['node', 'scripts/ingest.mjs', f'docs/content-audits/{slug}.json', '--env', 'live', '--insert'],
                         capture_output=True, text=True)
    text = out.stdout + out.stderr
    if 'Inserted' not in text:
        print(f'STOPPED at {slug}:\n{text[-800:]}')
        sys.exit(1)
    n = len(re.findall(r'shared link, needs 0031', text))
    if n:
        shared.append(f'{slug} ({n})')
    print(f'{i:>3}/{len(plans)} {slug}')

fix = subprocess.run(['node', 'docs/content-audits/content-run-fixes-2026-11-01.mjs', '--env', 'live', '--apply'],
                     capture_output=True, text=True)
print((fix.stdout + fix.stderr).strip())
print(f'Done: {len(plans)} teachers on live.')
if shared:
    print('Shared offerings left out until migration 0031 runs on live (run this again after it): ' + ', '.join(shared))
