#!/usr/bin/env bash
# workflow_dispatch deploy-gh-pages-branch.yml from main (GITHUB_TOKEN).
set -euo pipefail

if [[ ! -f "${GH_PAGES_PUSH_MARKER:?}" ]]; then
  echo "gh-pages branch unchanged; skip deploy-gh-pages-branch dispatch."
  exit 0
fi

: "${GITHUB_TOKEN:?}"
: "${GITHUB_REPOSITORY:?}"

workflow_id="deploy-gh-pages-branch.yml"
api="https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/${workflow_id}/dispatches"

http_code="$(
  curl -sS -o /tmp/gh-pages-dispatch.json -w '%{http_code}' \
    -X POST \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "${api}" \
    -d '{"ref":"main"}'
)"

if [[ "${http_code}" == "204" ]]; then
  echo "Dispatched ${workflow_id} on main."
  exit 0
fi

echo "Failed to dispatch ${workflow_id} (HTTP ${http_code}):" >&2
cat /tmp/gh-pages-dispatch.json >&2
exit 1
