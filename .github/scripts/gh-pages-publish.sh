#!/usr/bin/env bash
# Publish built site paths onto orphan branch gh-pages with fast-forward retry.
# Does not force-push the branch. Re-fetches the tip and reapplies only this
# job's paths when push is rejected.
#
# Modes:
#   production <commit-message> <staging-dir>
#     Replaces production root files only. Tags the gh-pages commit only when
#     PAGES_POINT_VERSION is set (point semver the repo tracks). Feature and
#     other commits are never tagged.
#   feature-sha <commit-message> <12-char-sha> <staging-dir>
#     Publishes a full build under feat/<sha>/ only.
#   feature-pr-publish <commit-message> <pr-number> <12-char-sha> <staging-dir>
#     Publishes feat/<sha>/ and replaces feat/<pr>/ with a redirect index.html.
#   feature-pointer-remove <commit-message> <pr-number>
#     Removes feat/<pr>/ only (sha folders stay).
#   production-rollback <commit-message> <prod-version-tag>
#     Copies production root files from the tagged prod commit onto the current
#     gh-pages tip (forward commit). Does not reset the branch; feat/ and
#     prototype/ on the tip stay as they are. Does not create a version tag.
set -euo pipefail

MODE="${1:?mode}"
COMMIT_MSG="${2:?commit message}"
shift 2

GH_PAGES_BRANCH="gh-pages"
REMOTE="https://x-access-token:${GITHUB_TOKEN:?}@github.com/${GITHUB_REPOSITORY:?}.git"
WORKDIR="${RUNNER_TEMP}/gh-pages-work"
STAGING_EXTRACT="${RUNNER_TEMP}/gh-pages-staging-extract"
MAX_ATTEMPTS=10

if ! git ls-remote --exit-code "$REMOTE" "refs/heads/${GH_PAGES_BRANCH}" >/dev/null 2>&1; then
  echo "Branch ${GH_PAGES_BRANCH} is not seeded yet; gh-pages publish skipped until cutover seed (intent/feature-previews/plan.md)."
  exit 0
fi

git_configure() {
  git -C "$WORKDIR" config user.name "github-actions[bot]"
  git -C "$WORKDIR" config user.email "41898282+github-actions[bot]@users.noreply.github.com"
}

fetch_gh_pages_tip() {
  rm -rf "$WORKDIR"
  mkdir -p "$WORKDIR"
  git -C "$WORKDIR" init -q
  git_configure
  git -C "$WORKDIR" remote add origin "$REMOTE"
  git -C "$WORKDIR" fetch origin "${GH_PAGES_BRANCH}" --depth=1 -q
  git -C "$WORKDIR" checkout -B "${GH_PAGES_BRANCH}" FETCH_HEAD -q
}

fetch_tag_into_staging() {
  local version_tag="${1:?prod version tag}"
  local repo_dir="${RUNNER_TEMP}/gh-pages-tag-fetch"
  local name
  rm -rf "$repo_dir" "$STAGING_EXTRACT"
  mkdir -p "$repo_dir" "$STAGING_EXTRACT"
  git -C "$repo_dir" init -q
  git -C "$repo_dir" remote add origin "$REMOTE"
  git -C "$repo_dir" fetch origin "refs/tags/${version_tag}" --depth=1 -q
  local tag_commit
  tag_commit="$(git -C "$repo_dir" rev-parse "FETCH_HEAD")"
  while IFS= read -r name; do
    case "$name" in
      feat | prototype | "") ;;
      *)
        git -C "$repo_dir" archive "$tag_commit" "$name" | tar -x -C "$STAGING_EXTRACT"
        ;;
    esac
  done < <(git -C "$repo_dir" ls-tree --name-only "$tag_commit")
  test -f "${STAGING_EXTRACT}/index.html"
}

touch_nojekyll() {
  touch "${WORKDIR}/.nojekyll"
}

apply_production() {
  local staging="${1:?staging dir with production index.html and assets/}"
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
    rm -rf "${WORKDIR}/${base}"
    cp -a "${entry}" "${WORKDIR}/${base}"
  done
  shopt -u dotglob nullglob
}

apply_feature_sha() {
  local sha_id="${1:?12-char sha}"
  local staging="${2:?staging dir with feat dist contents}"
  mkdir -p "${WORKDIR}/feat"
  rm -rf "${WORKDIR}/feat/${sha_id}"
  mkdir -p "${WORKDIR}/feat/${sha_id}"
  cp -a "${staging}/." "${WORKDIR}/feat/${sha_id}/"
}

apply_feature_pointer() {
  local pr_number="${1:?pr number}"
  local sha_id="${2:?12-char sha}"
  local target="/compound/feat/${sha_id}/"
  mkdir -p "${WORKDIR}/feat"
  rm -rf "${WORKDIR}/feat/${pr_number}"
  mkdir -p "${WORKDIR}/feat/${pr_number}"
  cat >"${WORKDIR}/feat/${pr_number}/index.html" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${target}">
  <link rel="canonical" href="${target}">
  <title>Feature preview redirect</title>
</head>
<body>
  <p><a href="${target}">Continue to feature preview</a></p>
</body>
</html>
EOF
}

apply_feature_pointer_remove() {
  local pr_number="${1:?pr number}"
  rm -rf "${WORKDIR}/feat/${pr_number}"
}

apply_paths() {
  case "${MODE}" in
    production)
      apply_production "${1:?staging}"
      ;;
    production-rollback)
      apply_production "${STAGING_EXTRACT}"
      ;;
    feature-sha)
      apply_feature_sha "${1:?sha}" "${2:?staging}"
      ;;
    feature-pr-publish)
      apply_feature_sha "${2:?sha}" "${3:?staging}"
      apply_feature_pointer "${1:?pr}" "${2:?sha}"
      ;;
    feature-pointer-remove)
      apply_feature_pointer_remove "${1:?pr}"
      ;;
    *)
      echo "unknown mode: ${MODE}" >&2
      exit 1
      ;;
  esac
}

prepare_rollback_staging() {
  local version_tag="${1:?prod version tag}"
  fetch_tag_into_staging "${version_tag}"
}

maybe_tag_production_commit() {
  if [[ "${MODE}" != production ]]; then
    return 0
  fi
  if [[ -z "${PAGES_POINT_VERSION:-}" ]]; then
    echo "PAGES_POINT_VERSION unset; gh-pages commit left untagged until the point version for this main publish is identified (intent/feature-previews/plan.md)."
    return 0
  fi
  if git ls-remote --exit-code origin "refs/tags/${PAGES_POINT_VERSION}" >/dev/null 2>&1; then
    echo "Tag ${PAGES_POINT_VERSION} already exists; this publish stays on the existing tag (branch push succeeded, tag not moved)."
    return 0
  fi
  git tag -a "${PAGES_POINT_VERSION}" -m "${COMMIT_MSG}"
  git push origin "refs/tags/${PAGES_POINT_VERSION}"
  echo "Tagged production gh-pages commit ${PAGES_POINT_VERSION}."
}

ROLLBACK_TAG=""
if [[ "${MODE}" == production-rollback ]]; then
  ROLLBACK_TAG="${1:?prod version tag}"
  shift
  prepare_rollback_staging "${ROLLBACK_TAG}"
fi

attempt=1
while [[ "${attempt}" -le "${MAX_ATTEMPTS}" ]]; do
  fetch_gh_pages_tip
  if [[ "${MODE}" == production-rollback ]]; then
    apply_paths
  else
    apply_paths "$@"
  fi
  touch_nojekyll
  cd "${WORKDIR}"
  git add -A
  if git diff --staged --quiet; then
    echo "No changes to publish on ${GH_PAGES_BRANCH}."
    exit 0
  fi
  git commit -m "${COMMIT_MSG}"
  push_err="$(mktemp)"
  if git push origin "${GH_PAGES_BRANCH}" 2>"${push_err}"; then
    maybe_tag_production_commit
    echo "Published ${MODE} to ${GH_PAGES_BRANCH}."
    exit 0
  fi
  if grep -qiE 'fetch first|non-fast-forward|rejected' "${push_err}"; then
    echo "Push not fast-forward (attempt ${attempt}/${MAX_ATTEMPTS}); retrying after fetch."
    cat "${push_err}" >&2
    if [[ "${MODE}" == production-rollback ]]; then
      prepare_rollback_staging "${ROLLBACK_TAG}"
    fi
    attempt=$((attempt + 1))
    continue
  fi
  cat "${push_err}" >&2
  exit 1
done

echo "Failed to push ${GH_PAGES_BRANCH} after ${MAX_ATTEMPTS} fast-forward retries." >&2
exit 1
