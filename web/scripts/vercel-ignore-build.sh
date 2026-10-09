#!/bin/bash
# Vercel "Ignored Build Step" for the website (wired up in web/vercel.json).
#
# WHY. This repository holds the website (web/) and the Flutter app (app/).
# Without this, every push to main rebuilds and redeploys the website — even a
# commit that only touches the app or the README.
#
# HOW. Vercel runs this from the Root Directory (web/) before building:
#   exit 1 → build and deploy as normal
#   exit 0 → skip; the deployment shows as "Canceled" and the live site is
#            left exactly as it was
#
# It compares against VERCEL_GIT_PREVIOUS_SHA — the last SUCCESSFUL deployment
# — not HEAD^. A push carrying several commits is judged as a whole, so a
# website change in an earlier commit is never skipped because the last commit
# happened to be app-only. Skipped (canceled) deployments do not move that SHA.
#
# IF IN DOUBT, BUILD. No previous SHA (a branch's first deploy), a SHA missing
# from Vercel's shallow clone, or any git error → exit 1. Wrongly skipping a
# website change is the failure that matters; an unnecessary build costs only a
# minute.
#
# Watched paths: everything under web/ — which includes the shared crisis
# phrase list once it moves to web/shared/ in Phase 1a, so a change to it
# always redeploys the website.

prev="${VERCEL_GIT_PREVIOUS_SHA:-}"

if [ -z "$prev" ]; then
  echo "▶ Building: no previous successful deployment to compare against."
  exit 1
fi

if ! git cat-file -e "${prev}^{commit}" 2>/dev/null; then
  echo "▶ Building: previous deployment ${prev:0:7} is not in this clone's history."
  exit 1
fi

git diff --quiet "$prev" HEAD -- .
status=$?

if [ "$status" -eq 0 ]; then
  echo "⏭  Skipping: nothing under web/ changed since ${prev:0:7}."
  exit 0
fi

if [ "$status" -eq 1 ]; then
  echo "▶ Building: web/ changed since ${prev:0:7}:"
  git diff --stat "$prev" HEAD -- . | tail -n 15
  exit 1
fi

echo "▶ Building: git diff failed (status $status), building to be safe."
exit 1
