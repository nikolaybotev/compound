#!/usr/bin/env bash
# Create or update a repository ruleset that blocks gh-pages deletion and force-push.
# Exits 0 when the ruleset is saved or already present; exits 0 on HTTP 403 with a
# message so rollout can continue (record settings in intent/feature-previews/plan.md).
set -euo pipefail

: "${GITHUB_REPOSITORY:?}"

owner="${GITHUB_REPOSITORY%%/*}"
repo="${GITHUB_REPOSITORY##*/}"
api_base="https://api.github.com/repos/${owner}/${repo}"

ruleset_name="Protect gh-pages branch"
payload="$(cat <<'JSON'
{
  "name": "Protect gh-pages branch",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/gh-pages"],
      "exclude": []
    }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" }
  ]
}
JSON
)"

list_code="$(
  curl -sS -o /tmp/gh-pages-rulesets.json -w '%{http_code}' \
    -H "Authorization: Bearer ${GITHUB_TOKEN:?}" \
    -H "Accept: application/vnd.github+json" \
    "${api_base}/rulesets"
)"

if [[ "${list_code}" == "403" ]]; then
  echo "ruleset_api_forbidden=1"
  echo "Could not list rulesets (HTTP 403). Apply manually: branch gh-pages — block force-push and branch deletion; only publish workflows push."
  exit 0
fi

if [[ "${list_code}" != "200" ]]; then
  echo "Failed to list rulesets (HTTP ${list_code}):" >&2
  cat /tmp/gh-pages-rulesets.json >&2
  exit 1
fi

existing_id="$(jq -r --arg n "${ruleset_name}" '.[] | select(.name == $n) | .id' /tmp/gh-pages-rulesets.json | head -1)"

if [[ -n "${existing_id}" ]]; then
  http_code="$(
    curl -sS -o /tmp/gh-pages-ruleset-out.json -w '%{http_code}' \
      -X PUT \
      -H "Authorization: Bearer ${GITHUB_TOKEN}" \
      -H "Accept: application/vnd.github+json" \
      "${api_base}/rulesets/${existing_id}" \
      -d "${payload}"
  )"
else
  http_code="$(
    curl -sS -o /tmp/gh-pages-ruleset-out.json -w '%{http_code}' \
      -X POST \
      -H "Authorization: Bearer ${GITHUB_TOKEN}" \
      -H "Accept: application/vnd.github+json" \
      "${api_base}/rulesets" \
      -d "${payload}"
  )"
fi

if [[ "${http_code}" == "403" ]]; then
  echo "ruleset_api_forbidden=1"
  echo "Could not save ruleset (HTTP 403). Apply manually: branch gh-pages — block force-push and branch deletion; only publish workflows push."
  exit 0
fi

if [[ "${http_code}" =~ ^20 ]]; then
  echo "ruleset_saved=1"
  cat /tmp/gh-pages-ruleset-out.json
  exit 0
fi

echo "Failed to save ruleset (HTTP ${http_code}):" >&2
cat /tmp/gh-pages-ruleset-out.json >&2
exit 1
