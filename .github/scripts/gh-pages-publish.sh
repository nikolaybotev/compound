#!/usr/bin/env bash
# Publish built site paths onto orphan branch gh-pages with fast-forward retry.
# Does not force-push the branch. Re-fetches the tip and reapplies only this
# job's paths when push is rejected.
set -euo pipefail

MODE="${1:?mode: production | feature-update | feature-remove}"
TAG="${2:?annotated tag name}"
COMMIT_MSG="${3:?commit message}"
shift 3

GH_PAGES_BRANCH="gh-pages"
REMOTE="https://x-access-token:${GITHUB_TOKEN:?}@github.com/${GITHUB_REPOSITORY:?}.git"
WORKDIR="${RUNNER_TEMP}/gh-pages-work"
MAX_ATTEMPTS=10

if ! git ls-remote --exit-code "$REMOTE" "refs/heads/${GH_PAGES_BRANCH}" >/dev/null 2>&1; then
  echo "Branch ${GH_PAGES_BRANCH} is not seeded yet; gh-pages publish skipped until cutover seed (intent/feature-previews/plan.md)."
  exit 0
fi

git_configure() {
  git -C "$WORKDIR" config user.name "github-actions[bot]"
  git -C "$WORKDIR" config user.email "41898282+github-actions[bot]@users.noreply.github.com"
}

fetch_gh_pages() {
  rm -rf "$WORKDIR"
  mkdir -p "$WORKDIR"
  git -C "$WORKDIR" init -q
  git_configure
  git -C "$WORKDIR" remote add origin "$REMOTE"
  git -C "$WORKDIR" fetch origin "${GH_PAGES_BRANCH}" --depth=1 -q
  git -C "$WORKDIR" checkout -B "${GH_PAGES_BRANCH}" FETCH_HEAD -q
}

touch_nojekyll() {
  touch "${WORKDIR}/.nojekyll"
}

apply_production() {
  local staging="${1:?staging dir with production root and prototype/}"
  local entry base
  cd "${WORKDIR}"
  for entry in * .nojekyll; do
    [[ -e "${entry}" ]] || continue
    case "${entry}" in
      feat | prototype | .git) ;;
      *) rm -rf "${entry}" ;;
    esac
  done
  shopt -s dotglob nullglob
  for entry in "${staging}"/*; do
    base=$(basename "${entry}")
    [[ "${base}" == prototype ]] && continue
    rm -rf "${WORKDIR}/${base}"
    cp -a "${entry}" "${WORKDIR}/${base}"
  done
  rm -rf "${WORKDIR}/prototype"
  cp -a "${staging}/prototype" "${WORKDIR}/prototype"
}

apply_feature_update() {
  local pr_number="${1:?pr number}"
  local staging="${2:?staging dir with feat dist contents}"
  mkdir -p "${WORKDIR}/feat"
  rm -rf "${WORKDIR}/feat/${pr_number}"
  mkdir -p "${WORKDIR}/feat/${pr_number}"
  cp -a "${staging}/." "${WORKDIR}/feat/${pr_number}/"
}

apply_feature_remove() {
  local pr_number="${1:?pr number}"
  rm -rf "${WORKDIR}/feat/${pr_number}"
}

apply_paths() {
  case "${MODE}" in
    production)
      apply_production "${1:?staging}"
      ;;
    feature-update)
      apply_feature_update "${1:?pr}" "${2:?staging}"
      ;;
    feature-remove)
      apply_feature_remove "${1:?pr}"
      ;;
    *)
      echo "unknown mode: ${MODE}" >&2
      exit 1
      ;;
  esac
}

attempt=1
while [[ "${attempt}" -le "${MAX_ATTEMPTS}" ]]; do
  fetch_gh_pages
  apply_paths "$@"
  touch_nojekyll
  cd "${WORKDIR}"
  git add -A
  if git diff --staged --quiet; then
    echo "No changes to publish on ${GH_PAGES_BRANCH}."
    exit 0
  fi
  git commit -m "${COMMIT_MSG}"
  git tag -a "${TAG}" -m "${COMMIT_MSG}"
  push_err="$(mktemp)"
  if git push origin "${GH_PAGES_BRANCH}" 2>"${push_err}"; then
    git push origin "refs/tags/${TAG}"
    echo "Published ${MODE} to ${GH_PAGES_BRANCH} (tag ${TAG})."
    exit 0
  fi
  if grep -qiE 'fetch first|non-fast-forward|rejected' "${push_err}"; then
    echo "Push not fast-forward (attempt ${attempt}/${MAX_ATTEMPTS}); retrying after fetch."
    cat "${push_err}" >&2
    attempt=$((attempt + 1))
    continue
  fi
  cat "${push_err}" >&2
  exit 1
done

echo "Failed to push ${GH_PAGES_BRANCH} after ${MAX_ATTEMPTS} fast-forward retries." >&2
exit 1
