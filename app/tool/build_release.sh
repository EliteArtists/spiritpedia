#!/bin/bash
# Release builds for the stores (owner, 10 Nov 2026): the only way to make
# one. It refuses to build unless config/prod.json is there and complete, and
# always passes it, so a store build can never ship without the live database
# or without the Amazon tags (an untagged build earns nothing and says
# nothing: the links still work, so nobody would notice).
#
#   tool/build_release.sh ios       # build/ios/ipa/Spiritpedia.ipa
#   tool/build_release.sh android   # build/app/outputs/bundle/release/app-release.aab
#
# Run from app/. Values are checked, never printed.
set -euo pipefail
cd "$(dirname "$0")/.."

CONFIG=config/prod.json
case "${1:-}" in
  ios) TARGET=ipa ;;
  android) TARGET=appbundle ;;
  *) echo "Usage: tool/build_release.sh ios|android" >&2; exit 64 ;;
esac

if [ ! -f "$CONFIG" ]; then
  echo "Refusing to build: $CONFIG is missing." >&2
  exit 1
fi

# Every key the release needs, non-empty, and APP_ENV must be prod.
python3 - "$CONFIG" <<'PY'
import json, sys
path = sys.argv[1]
try:
    cfg = json.load(open(path))
except Exception as e:
    sys.exit(f"Refusing to build: {path} is not valid JSON ({e.__class__.__name__}).")
need = ["APP_ENV", "SUPABASE_URL", "SUPABASE_ANON_KEY", "API_BASE_URL",
        "AMAZON_TAG_US", "AMAZON_TAG_UK", "AMAZON_TAG_CA", "AMAZON_TAG_ES", "AMAZON_TAG_AU"]
missing = [k for k in need if not str(cfg.get(k, "")).strip()]
if missing:
    sys.exit(f"Refusing to build: {path} has no value for {', '.join(missing)}.")
if cfg["APP_ENV"] != "prod":
    sys.exit(f"Refusing to build: APP_ENV in {path} is not prod.")
PY

flutter build "$TARGET" --release --dart-define-from-file="$CONFIG"
