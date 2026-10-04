#!/bin/sh
# Watches the `/start-change` and `/stop-change` gates refuse, and the
# detections the deferred-plan steps rest on.
#
# Why this script exists
# ----------------------
# The two gates are prose instructions to an agent, not executable checks, so
# "watch it fail first" (`openspec-evidence`) cannot mean running them and
# seeing red. What it can mean — and what a prose gate is worth without it —
# is this: every refusal a gate claims to make must rest on a condition that is
# **observable by a command**, and that command must actually say something
# different in the refusing state than in the adjacent permitting one.
#
# A gate whose refusal condition cannot be observed is not a gate. It is a
# sentence. This script builds each refusing state in a throwaway repository,
# runs the exact detection command the command file names, and reports both
# directions of the boundary — because a condition that is "true" in every state
# refuses everything and would be dropped within a week.
#
# `--abandon` gets one observation that is not a refusal, because its whole
# design is a claim about what survives destruction: after both branches are
# deleted, the work is restored from the verified tag in a clone that never had
# the branch. Claiming "recoverable" without restoring it once is the kind of
# green this repository refuses everywhere else.
#
# It needs no network, no `gh`, no `openspec` and no fixtures on disk: every
# refusal covered here is decidable from git and the filesystem alone. The ones
# that are not are listed at the end of the run, out loud, rather than being
# quietly counted as covered.
#
# Run it from anywhere: sh scripts/gates/refusal-cases.sh
set -eu

# The host's git config must not be able to change what this harness observes.
# It already did once: a global `tag.forceSignAnnotated` turned `git tag` into
# "fatal: no tag message?" here, which is a property of this machine and not of
# the gate under test.
GIT_CONFIG_GLOBAL=/dev/null
GIT_CONFIG_SYSTEM=/dev/null
export GIT_CONFIG_GLOBAL GIT_CONFIG_SYSTEM

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT INT TERM

FAILURES=0
BASE=main

# Reports an observation and remembers a miss rather than exiting, so one run
# tells you everything that is wrong instead of only the first thing. Same
# contract as `scripts/check-specs/smoke-bin.sh`.
observe() {
  if [ "$1" = 'ok' ]; then
    printf 'ok   %s\n' "$2"
  else
    printf 'FAIL %s\n' "$2" >&2
    FAILURES=$((FAILURES + 1))
  fi
}

if ! git init -q -b "$BASE" "$WORK/.probe" 2>/dev/null; then
  # `git init -b` landed in 2.28. Rather than branching the whole script on the
  # default branch name, say what is missing: a silently skipped harness is the
  # rubber stamp this repository refuses everywhere else.
  # shellcheck disable=SC2016 # the backticks are prose, not a command substitution
  printf 'FAIL %s\n' 'git is too old for `git init -b`; this harness needs git >= 2.28' >&2
  exit 1
fi
rm -rf "$WORK/.probe"

# A consumer-shaped repository with a real remote, one commit, an `openspec`
# tree and one unrelated file to dirty. Prints the working clone's path.
new_repo() {
  root="$WORK/$1"
  mkdir -p "$root"
  git init -q --bare "$root/origin.git"
  # The bare repository's HEAD follows `init.defaultBranch`, which is the host's
  # setting and not ours. Left alone, a clone of it checks out nothing and the
  # second-clone helpers below fail on a missing working tree — with a warning,
  # not an error, which is how this went unnoticed for one run.
  git -C "$root/origin.git" symbolic-ref HEAD "refs/heads/$BASE"
  git init -q -b "$BASE" "$root/work"
  git -C "$root/work" config user.email 'gates@example.invalid'
  git -C "$root/work" config user.name 'Gate Harness'
  mkdir -p "$root/work/openspec/specs" "$root/work/openspec/changes/archive" "$root/work/src"
  printf 'one\n' >"$root/work/src/app.txt"
  # git tracks files, not directories, and `openspec/changes/archive/` has to
  # exist for the maxdepth searches below to mean what they mean.
  : >"$root/work/openspec/changes/archive/.gitkeep"
  git -C "$root/work" add -A
  git -C "$root/work" commit -qm 'chore: initial commit'
  git -C "$root/work" remote add origin "$root/origin.git"
  git -C "$root/work" push -q -u origin "$BASE" 2>/dev/null
  printf '%s\n' "$root/work"
}

# Pushes a commit to origin/$BASE from a second clone, so a working repository
# can genuinely fall behind its base.
move_base() {
  root=$(dirname "$1")
  git clone -q "$root/origin.git" "$root/other"
  git -C "$root/other" config user.email 'other@example.invalid'
  git -C "$root/other" config user.name 'Someone Else'
  printf 'base moved\n' >>"$root/other/src/app.txt"
  git -C "$root/other" commit -qam 'feat: something else landed on the base'
  git -C "$root/other" push -q origin "$BASE" 2>/dev/null
}

# Each writes a file, not only a directory: git tracks files, and the merged
# check looks the change directory up in the base's tree.
propose() {
  mkdir -p "$1/openspec/changes/$2/specs/widgets"
  printf '# Proposal\n' >"$1/openspec/changes/$2/proposal.md"
}
archived() {
  mkdir -p "$1/openspec/changes/archive/$2/specs/widgets"
  printf '# Proposal\n' >"$1/openspec/changes/archive/$2/proposal.md"
}

# Merges origin/<branch> into origin/$BASE the way a pull request's merge
# button does, from a second clone, then fetches in the working clone. The
# style is `noff` (a merge commit), `rebase` (each commit replayed under a new
# committer, so new SHAs) or `squash` (one commit, no link to the branch).
merge_into_base() {
  m="$(dirname "$1")/merger"
  if [ -d "$m" ]; then
    git -C "$m" fetch -q origin
    git -C "$m" reset -q --hard "origin/$BASE"
  else
    git clone -q "$(dirname "$1")/origin.git" "$m"
    git -C "$m" config user.email 'merger@example.invalid'
    git -C "$m" config user.name 'Merge Button'
  fi
  case "$3" in
    noff) git -C "$m" merge -q --no-ff -m 'Merge pull request #1' "origin/$2" ;;
    rebase)
      for c in $(git -C "$m" rev-list --reverse "$BASE..origin/$2"); do
        git -C "$m" cherry-pick "$c" >/dev/null
      done
      ;;
    squash)
      git -C "$m" merge -q --squash "origin/$2" >/dev/null
      git -C "$m" commit -qm 'Squash pull request #1'
      ;;
  esac
  git -C "$m" push -q origin "$BASE" 2>/dev/null
  git -C "$1" fetch -q origin
}

# The detection commands, written once so the harness cannot drift from the
# command files by paraphrasing them differently in each case.
detect_dirty() { git -C "$1" status --porcelain; }
detect_behind() { git -C "$1" rev-list --count "HEAD..origin/$BASE"; }
detect_name() { (cd "$1" && find openspec/changes -maxdepth 2 -type d -name "*$2*"); }
detect_open() { (cd "$1" && find openspec/changes -mindepth 1 -maxdepth 1 -type d ! -name archive); }
detect_others() { (cd "$1" && find openspec/changes -mindepth 1 -maxdepth 1 -type d ! -name archive ! -name "$2"); }
# Merged is the change directory in the base's tree, live or archived, whatever
# the merge button did to the commits. Exit 2 means origin/$BASE does not
# resolve: `ls-tree` on a missing ref prints nothing, which must not read as
# "unmerged".
detect_base() { git -C "$1" rev-parse --verify -q "origin/$BASE^{commit}" >/dev/null; }
detect_inversion() {
  detect_base "$1" || return 2
  [ -n "$(git -C "$1" ls-tree -d --name-only "origin/$BASE" -- "openspec/changes/$2")" ]
}
detect_merged() {
  detect_base "$1" || return 2
  detect_inversion "$1" "$2" ||
    git -C "$1" ls-tree -d --name-only "origin/$BASE" -- openspec/changes/archive/ |
    grep -qE "^openspec/changes/archive/[0-9]{4}-[0-9]{2}-[0-9]{2}-$2\$"
}
# Prints the exit code instead of acting on it, so a case can tell "unmerged"
# (1) from "the base does not resolve" (2). Both are false to an `if`.
merged_rc() { if detect_merged "$@"; then echo 0; else echo $?; fi; }
detect_pin() { git -C "$1" ls-remote --tags origin "refs/tags/abandoned/$2"; }
detect_marker() { [ -f "$1/openspec/changes/$2/STOPPED.md" ] && cat "$1/openspec/changes/$2/STOPPED.md"; }
detect_reachable() { git -C "$1" cat-file -e "$2^{commit}" 2>/dev/null; }
detect_plan() { [ -f "$1/todo/$2.md" ]; }
detect_plans() { (cd "$1" && find todo -maxdepth 1 -type f -name '*.md' 2>/dev/null || :); }
remove_plan() { git -C "$1" rm -q --ignore-unmatch -- "todo/$2.md"; }

# A slash command on any line of a shell-tagged fence. The desktop app puts a
# Run button on those, and a slash command run in a shell fails there
# (`zsh: no such file or directory: /openspec-flow:start-change`). `/usr/bin/x`
# is a path, not a command: the name must end at a space or the line end.
SCAN_SLASH='
    FNR == 1 { shell = 0 }
    /^[ \t]*```[ \t]*(bash|sh|zsh|shell|console)[ \t]*$/ { shell = 1; next }
    /^[ \t]*```/ { shell = 0; next }
    shell && /^[ \t]*\/[A-Za-z][A-Za-z0-9:_-]*([ \t]|$)/ { print FILENAME ":" FNR ": " $0 }
'
scan_slash() { awk "$SCAN_SLASH" "$@"; }

# Commits a plan file the way the skill says to: by explicit path.
defer() {
  mkdir -p "$1/todo"
  printf -- '---\nslug: %s\ntitle: A deferred change\n---\n\n## Why\n\n## What\n\n## Open questions\n' "$2" >"$1/todo/$2.md"
  git -C "$1" add -- "todo/$2.md"
  git -C "$1" commit -qm "chore(todo): defer $2" -- "todo/$2.md"
}

printf '\n# /start-change\n\n'

# --- 1. a dirty tree -------------------------------------------------------

R=$(new_repo dirty)
printf 'uncommitted edit\n' >>"$R/src/app.txt"
if [ -n "$(detect_dirty "$R")" ]; then
  observe ok 'start refuses a dirty tree: git status --porcelain names the path'
else
  observe fail 'start should refuse a dirty tree, but git status --porcelain printed nothing'
fi

git -C "$R" checkout -q -- src/app.txt
if [ -z "$(detect_dirty "$R")" ]; then
  observe ok 'start permits the same repository once the edit is committed or discarded'
else
  observe fail "a restored tree should be clean; git status --porcelain still prints: $(detect_dirty "$R")"
fi

# --- 2. a base that has moved ----------------------------------------------
#
# The refusing state is not exotic: it is any branch cut before someone else
# merged. A delta written here compares against a spec the merge result does not
# have, which the `scenarios` check will happily pass.

R=$(new_repo behind)
move_base "$R"
git -C "$R" fetch -q origin
if [ "$(detect_behind "$R")" -gt 0 ]; then
  observe ok "start refuses a stale base: rev-list --count HEAD..origin/$BASE reports $(detect_behind "$R")"
else
  observe fail 'start should refuse a stale base, but the behind-count was 0'
fi

git -C "$R" merge -q --ff-only "origin/$BASE"
if [ "$(detect_behind "$R")" -eq 0 ]; then
  observe ok 'start permits the same branch once the base is merged in'
else
  observe fail 'after merging the base the behind-count should be 0'
fi

# --- 3. a slug that already went through the flow ---------------------------

R=$(new_repo namecollision)
archived "$R" '2026-01-02-widget-caching'
if [ -n "$(detect_name "$R" 'widget-caching')" ]; then
  observe ok 'start rules out a reused slug: the find hits the archived folder'
else
  observe fail 'start should rule out a slug already in changes/archive, but the find hit nothing'
fi

if [ -z "$(detect_name "$R" 'widget-pagination')" ]; then
  observe ok 'start permits an unused slug in the same repository'
else
  observe fail "an unused slug should hit nothing; the find printed: $(detect_name "$R" 'widget-pagination')"
fi

# The third state this check has to tell apart, and the one that must NOT be a
# refusal: a change already proposed and not yet archived is resumed, not
# rejected. The two states differ by path, which is why the search is run with
# maxdepth 2 over the whole tree rather than against one directory.
R=$(new_repo nameresume)
propose "$R" '2026-01-03-widget-caching'
HIT=$(detect_name "$R" 'widget-caching')
case "$HIT" in
  *changes/archive/*) observe fail "a proposed-but-unarchived change must not read as archived; got: $HIT" ;;
  openspec/changes/*) observe ok 'start distinguishes resume from reuse: the hit is outside changes/archive/' ;;
  *) observe fail "a proposed change should be found; the find printed: $HIT" ;;
esac

# --- 4. a second concurrent change ------------------------------------------

R=$(new_repo concurrent)
propose "$R" '2026-01-04-already-open'
if [ -n "$(detect_open "$R")" ]; then
  observe ok 'start refuses a second concurrent change: an active change folder is already there'
else
  observe fail 'start should refuse a second change, but no active change folder was found'
fi

# A resume must not refuse itself. The change being resumed is an active change
# folder, so the "is another change open?" search has to exclude its own name —
# the one place where the same command means something different on the two
# ways in.
if [ -z "$(detect_others "$R" '2026-01-04-already-open')" ]; then
  observe ok 'resume does not count itself as the second open change'
else
  observe fail "resuming a change should exclude its own name; got: $(detect_others "$R" '2026-01-04-already-open')"
fi

rm -rf "$R/openspec/changes/2026-01-04-already-open"
if [ -z "$(detect_open "$R")" ]; then
  observe ok 'start permits the first change: with none active the search prints nothing'
else
  observe fail "with no active change the search should print nothing; got: $(detect_open "$R")"
fi

# --- 4a. a plan the description may match --------------------------------
#
# Step 0 lists `todo/*.md` beside the active changes. It has to print the plan
# when there is one, and print nothing, without failing, when there is no
# `todo/` at all: most repositories never have one.

R=$(new_repo pickup)
if [ -z "$(detect_plans "$R")" ]; then
  observe ok 'start finds no plan in a repository without todo/, and does not fail'
else
  observe fail "with no todo/ the plan search should print nothing; got: $(detect_plans "$R")"
fi

defer "$R" 'add-widget-caching'
if [ "$(detect_plans "$R")" = 'todo/add-widget-caching.md' ]; then
  observe ok 'start lists a committed plan as a pickup candidate'
else
  observe fail "the plan search should list todo/add-widget-caching.md; got: $(detect_plans "$R")"
fi

printf '\n# /stop-change\n\n'

# --- 5. stopping: suspend, close, and the one state that is a defect --------
#
# A stop just stops, so an unarchived change with an open PR is NOT refused —
# that is ordinary unfinished work. What is refused is a clean close over the
# inversion that produced this command: merged first, archived after.

R=$(new_repo stopping)
propose "$R" 'widget-limits'
git -C "$R" checkout -q -b feat/widget-limits
printf 'limits\n' >>"$R/src/app.txt"
git -C "$R" add -A && git -C "$R" commit -qm 'feat: widget limits'

# Unmerged and unarchived: suspend, do not refuse.
if [ "$(merged_rc "$R" 'widget-limits')" = 1 ] && [ -n "$(detect_open "$R")" ]; then
  observe ok 'stop suspends unfinished work rather than refusing it: unmerged and unarchived'
else
  observe fail 'an unmerged, unarchived change should be suspendable'
fi

# The marker is what a resume reads, so its absence and its presence have to be
# distinguishable before either side of the resume can be trusted.
if [ -z "$(detect_marker "$R" 'widget-limits')" ]; then
  observe ok 'start sees no resume point before a stop has written one'
else
  observe fail 'no STOPPED.md should exist before the stop runs'
fi

HEAD_SHA=$(git -C "$R" rev-parse HEAD)
cat >"$R/openspec/changes/widget-limits/STOPPED.md" <<EOF
# Stopped

- **stopped**: 2026-01-05
- **reason**: parked for review capacity
- **head**: $HEAD_SHA
- **branch**: feat/widget-limits
- **pr**: none
- **next step**: open a PR and watch CI
EOF
git -C "$R" add -A && git -C "$R" commit -qm 'chore(openspec): stop widget-limits'
if detect_marker "$R" 'widget-limits' | grep -q '^- \*\*next step\*\*:'; then
  observe ok 'the suspended change carries a resume point naming the next step'
else
  observe fail 'STOPPED.md should record the next step for the resume to restate'
fi

# Resume: the recorded head must still resolve. A marker pointing at a commit no
# ref reaches means the work was deleted or never left another machine, and
# reopening on top of it would silently resume a different state.
if detect_reachable "$R" "$HEAD_SHA"; then
  observe ok 'resume permits a recorded head that still resolves'
else
  observe fail 'the recorded head should resolve in the repository that wrote it'
fi

if ! detect_reachable "$R" '0000000000000000000000000000000000000000'; then
  observe ok 'resume refuses a recorded head no ref reaches: the resume point is gone'
else
  observe fail 'an unreachable SHA must not read as resolvable'
fi

# The marker is consumed by the resume. Left behind on a branch that is moving
# again it says the opposite of the truth.
git -C "$R" rm -q -- 'openspec/changes/widget-limits/STOPPED.md'
git -C "$R" commit -qm 'chore(openspec): resume widget-limits'
if [ -z "$(detect_marker "$R" 'widget-limits')" ] && [ -n "$(detect_open "$R")" ]; then
  observe ok 'the resume consumes the marker and leaves the change itself in place'
else
  observe fail 'after resuming, STOPPED.md should be gone and the change directory should remain'
fi

# The defect: merged into the base while the delta is still unapplied.
git -C "$R" push -q -u origin feat/widget-limits 2>/dev/null
merge_into_base "$R" feat/widget-limits noff
if detect_inversion "$R" 'widget-limits'; then
  observe ok 'stop refuses a clean close over the inversion: merged, and the delta still unapplied'
else
  observe fail 'merged-with-unapplied-delta should be detectable as the inversion'
fi

rm -rf "$R/openspec/changes/widget-limits"
archived "$R" '2026-01-05-widget-limits'
git -C "$R" add -A && git -C "$R" commit -qm 'chore(openspec): archive widget-limits'
if [ -z "$(detect_open "$R")" ] && [ -n "$(detect_name "$R" 'widget-limits')" ]; then
  observe ok 'stop closes for good once the change is merged and under changes/archive/'
else
  observe fail 'after archiving, the change should be found under changes/archive/ and nowhere else'
fi

# The remedy committed is not the remedy merged. The inversion is a property of
# the base, so an archive that exists only on the branch leaves it in place.
if detect_inversion "$R" 'widget-limits'; then
  observe ok 'stop still reports the inversion while the archive is only on the branch'
else
  observe fail 'an archive not yet in the base should not clear the inversion'
fi

git -C "$R" push -q origin feat/widget-limits 2>/dev/null
merge_into_base "$R" feat/widget-limits noff
if ! detect_inversion "$R" 'widget-limits' && detect_merged "$R" 'widget-limits'; then
  observe ok 'stop closes once the base carries the change only under changes/archive/'
else
  observe fail 'with the archive merged, the base should carry the change as archived and not as live'
fi

# --- 6. abandoning work that is not pinned anywhere but this machine --------
#
# `--abandon` destroys: branch, code, proposal, pull request. The single thing
# standing between that and the `rescue/full-spike-work` failure mode — six
# commits, no remote, no PR, no tag — is a tag that is verified to exist on the
# remote BEFORE any delete runs. So the refusal is not "is there an upstream"
# but "does ls-remote print the tag's SHA", and an unverified push has to read
# the same as no push at all.

R=$(new_repo unpinned)
git -C "$R" checkout -q -b spike/full-work
printf 'spike\n' >>"$R/src/app.txt"
git -C "$R" commit -qam 'feat: spike work nobody else can see'
printf 'loose\n' >>"$R/src/app.txt"

if [ -n "$(detect_dirty "$R")" ]; then
  observe ok 'abandon refuses while work is loose: it cannot be tagged, and the delete would take it'
else
  observe fail 'abandon should refuse uncommitted work, but git status --porcelain printed nothing'
fi

git -C "$R" commit -qam 'wip: work in progress at abandon'
if [ -z "$(detect_dirty "$R")" ]; then
  observe ok 'abandon permits once the loose work is committed onto the branch being pinned'
else
  observe fail 'after committing, the tree should be clean'
fi

# The tag exists locally but was never pushed. This is the state that reads as
# "pinned" to anything that checks the wrong thing, and it is exactly the
# failure mode: a tag name on top of commits only this machine can reach.
git -C "$R" tag -a -m 'Abandoned: superseded' 'abandoned/spike-full-work'
if [ -z "$(detect_pin "$R" 'spike-full-work')" ]; then
  observe ok 'abandon refuses a local-only tag: ls-remote prints nothing, so nothing is destroyed'
else
  observe fail 'an unpushed tag must not read as pinned on the remote'
fi

git -C "$R" push -q origin 'refs/tags/abandoned/spike-full-work' 2>/dev/null
PIN=$(detect_pin "$R" 'spike-full-work')
if [ -n "$PIN" ]; then
  observe ok 'abandon permits destruction once ls-remote prints the tag SHA'
else
  observe fail 'a pushed tag should be visible to ls-remote'
fi

# And the property the whole ordering exists to produce: after the destroy runs
# — both branches deleted, the code gone from the checkout — the commits are
# still reachable. Verified from a clone that never saw the branch, because
# reachability on the machine that did the work proves nothing.
git -C "$R" push -q -u origin spike/full-work 2>/dev/null
git -C "$R" checkout -q "$BASE"
git -C "$R" branch -qD spike/full-work
git -C "$R" push -q origin --delete spike/full-work 2>/dev/null

ROOT=$(dirname "$R")
git clone -q "$ROOT/origin.git" "$ROOT/recovery"
# The checkout is inside the condition, not above it: a tag that was never
# pushed makes it fail, and under `set -e` that would kill the run instead of
# reporting the observation. Found by mutating the tag push away and getting one
# failure and no summary.
if git -C "$ROOT/recovery" checkout -q -b recovered 'abandoned/spike-full-work' 2>/dev/null &&
  grep -q '^spike$' "$ROOT/recovery/src/app.txt" &&
  grep -q '^loose$' "$ROOT/recovery/src/app.txt"; then
  observe ok 'the destroyed branch is recoverable from the tag in a clone that never had it'
else
  observe fail 'after destroying both branches, the tag should still restore the work in a fresh clone'
fi

if [ -z "$(git -C "$R" ls-remote --heads origin spike/full-work)" ]; then
  observe ok 'abandon really destroys: the remote branch is gone, only the tag remains'
else
  observe fail 'the abandoned remote branch should have been deleted'
fi

# --- 7. abandoning work that already shipped --------------------------------

R=$(new_repo alreadymerged)
git -C "$R" checkout -q -b feat/shipped
propose "$R" 'shipped'
printf 'shipped\n' >>"$R/src/app.txt"
git -C "$R" add -A && git -C "$R" commit -qm 'feat: shipped behaviour'
git -C "$R" push -q -u origin feat/shipped 2>/dev/null
if [ "$(merged_rc "$R" shipped)" != 1 ]; then
  observe fail 'an unmerged branch must not read as merged into the base'
else
  observe ok 'abandon permits an unmerged branch: the base tree has no shipped change directory'
fi

merge_into_base "$R" feat/shipped noff
if detect_merged "$R" shipped; then
  observe ok 'abandon refuses work already merged into the base: the base tree carries its change directory'
else
  observe fail 'merged work should be found in the base tree, but the check said no'
fi

# --- 7a. merged by any button, and only when it really is ---------------------
#
# A rebase merge replays the branch under new SHAs and a squash merge folds it
# into one commit, so the branch head is never in the base's history even
# though everything on it shipped. yannicklescure/openspec-flow#14 was
# rebase-merged and an ancestry check said "not merged".

# A pushed branch proposing change $2, with two commits so a squash is not the
# same patch as either of them. Prints the working clone's path.
shipping_branch() {
  r=$(new_repo "$1")
  git -C "$r" checkout -q -b "feat/$2"
  propose "$r" "$2"
  git -C "$r" add -A && git -C "$r" commit -qm "docs(openspec): propose $2"
  printf 'limit: 10\n' >>"$r/src/app.txt"
  git -C "$r" commit -qam "feat: $2"
  git -C "$r" push -q -u origin "feat/$2" 2>/dev/null
  printf '%s\n' "$r"
}

R=$(shipping_branch rebasemerged widget-quotas)
merge_into_base "$R" feat/widget-quotas rebase
if detect_merged "$R" widget-quotas; then
  observe ok 'a rebase-merged change reads as merged'
else
  observe fail 'a rebase-merged change should read as merged, but the check said no'
fi

R=$(shipping_branch squashmerged widget-quotas)
merge_into_base "$R" feat/widget-quotas squash
if detect_merged "$R" widget-quotas; then
  observe ok 'a squash-merged change reads as merged'
else
  observe fail 'a squash-merged change should read as merged, but the check said no'
fi

# Later work on the base rewrites the very line the change added. Any check that
# compares content would now read "unmerged"; the change directory is untouched.
M="$(dirname "$R")/merger"
sed 's/^limit: 10$/limit: 20/' "$M/src/app.txt" >"$M/src/app.txt.new"
mv "$M/src/app.txt.new" "$M/src/app.txt"
git -C "$M" commit -qam 'feat: raise the widget quota'
git -C "$M" push -q origin "$BASE" 2>/dev/null
git -C "$R" fetch -q origin
if detect_merged "$R" widget-quotas; then
  observe ok 'a merged change still reads as merged after later base work edits its lines'
else
  observe fail 'later base work on the same lines should not make a merged change read as unmerged'
fi

# The branch moves after the merge, as it does when the archive is committed
# late. Its head is now in no merge at all, and the change still shipped.
R=$(shipping_branch movedafter widget-quotas)
merge_into_base "$R" feat/widget-quotas rebase
printf 'after\n' >>"$R/src/app.txt"
git -C "$R" commit -qam 'fix: after the merge'
if detect_merged "$R" widget-quotas; then
  observe ok 'a merged change reads as merged after its branch gains a commit'
else
  observe fail 'a commit on the branch after the merge should not unmerge the change'
fi

# Unmerged while the base moves underneath: the other direction of every case
# above, and the one an over-eager check would get wrong.
R=$(shipping_branch basemoved widget-quotas)
move_base "$R"
git -C "$R" fetch -q origin
if [ "$(merged_rc "$R" widget-quotas)" = 1 ]; then
  observe ok 'abandon permits an unmerged change while other work lands on the base'
else
  observe fail 'an unmerged change should read as unmerged however far the base moves'
fi

# A reverted merge took the change directory back out with the code. The code
# is no longer in the base, so abandon may proceed.
R=$(shipping_branch reverted widget-quotas)
merge_into_base "$R" feat/widget-quotas noff
M="$(dirname "$R")/merger"
git -C "$M" revert -m 1 --no-edit HEAD >/dev/null
git -C "$M" push -q origin "$BASE" 2>/dev/null
git -C "$R" fetch -q origin
if [ "$(merged_rc "$R" widget-quotas)" = 1 ]; then
  observe ok 'abandon permits a change whose merge was reverted on the base'
else
  observe fail 'a reverted merge should read as unmerged'
fi

# An unfetched or misspelled base. `ls-tree` on it prints nothing, which would
# read as "unmerged" and permit abandoning shipped work.
git -C "$R" update-ref -d "refs/remotes/origin/$BASE"
if [ "$(merged_rc "$R" widget-quotas)" = 2 ]; then
  observe ok 'the merged check stops on an unresolvable base rather than reading it as unmerged'
else
  observe fail "an unresolvable origin/$BASE should stop the check; got exit $(merged_rc "$R" widget-quotas)"
fi

printf '\n# deferred plans\n\n'

# --- 8. a plan is found by its slug, and only by its slug -------------------

R=$(new_repo plan)
defer "$R" 'add-widget-caching'
if detect_plan "$R" 'add-widget-caching'; then
  observe ok 'a deferred change is on disk at todo/<slug>.md'
else
  observe fail 'todo/add-widget-caching.md should exist after the plan is committed'
fi

if detect_plan "$R" 'widget-caching'; then
  observe fail 'a plan must be found by its exact slug, not by a fragment of it'
else
  observe ok 'a different slug finds no plan: the match is exact'
fi

if [ -z "$(detect_open "$R")" ]; then
  observe ok 'a plan is not a proposal: nothing appears under openspec/changes/'
else
  observe fail "writing a plan should create no change folder; got: $(detect_open "$R")"
fi

# --- 9. the archive commit removes the plan, or proceeds without one --------

R=$(new_repo unplan)
defer "$R" 'add-widget-caching'
remove_plan "$R" 'add-widget-caching'
if [ "$(git -C "$R" diff --cached --name-only)" = 'todo/add-widget-caching.md' ]; then
  observe ok 'archive stages the plan deletion for its own commit'
else
  observe fail "archive should stage todo/add-widget-caching.md; staged: $(git -C "$R" diff --cached --name-only)"
fi

R=$(new_repo noplan)
if remove_plan "$R" 'add-widget-caching' && [ -z "$(git -C "$R" diff --cached --name-only)" ]; then
  observe ok 'archive of a change with no plan exits 0 and stages nothing'
else
  observe fail 'with no plan, the removal should exit 0 and stage nothing'
fi

printf '\n# suggested slash commands\n\n'

# --- 10. a slash command never sits in a shell fence ------------------------
#
# Both directions on throwaway files first, so a scan that prints nothing for
# the repository means "clean" and not "cannot see".

R=$(new_repo fences)
printf '```bash\n/start-change add-widget-caching\n```\n' >"$R/bad.md"
printf '```\n/start-change add-widget-caching\n```\n\n```bash\n/usr/bin/env git status\n```\n' >"$R/good.md"
if [ -n "$(scan_slash "$R/bad.md")" ]; then
  observe ok 'the scan reports a slash command in a bash fence'
else
  observe fail 'a slash command in a bash fence should be reported, but the scan printed nothing'
fi

if [ -z "$(scan_slash "$R/good.md")" ]; then
  observe ok 'the scan permits an untagged fence and a path in a bash fence'
else
  observe fail "an untagged fence and a path should pass; got: $(scan_slash "$R/good.md")"
fi

REPO=$(cd "$(dirname "$0")/../.." && pwd)
# `-exec ... +` rather than a word-split list: the checkout path may hold spaces.
HITS=$(find "$REPO/README.md" "$REPO/commands" "$REPO/skills" "$REPO/docs" \
  -type f -name '*.md' -exec awk "$SCAN_SLASH" {} +)
if [ -z "$HITS" ]; then
  observe ok 'this repository suggests no slash command in a shell fence'
else
  observe fail "slash commands in shell fences: $HITS"
fi

# --- what this harness does not demonstrate ---------------------------------
#
# Stated in the run itself, not only in the docs, so nobody reads the passing
# observations as "the gates are verified".

cat <<'NOTE'

# not demonstrated here, and not claimed:
#   - "does this deserve a change?" — a judgement. No command decides it, so the
#     start gate's own substance cannot be shown refusing anything. It is a
#     prompt to a person, and it is worth exactly what that person answers.
#   - the pull-request states (open PR at close, gh pr close at abandon). They
#     need a live GitHub; `/verify-green` already covers reading check state.
#   - reverting code that reached the base. It is an ordinary `git revert` and
#     the refusal above it — already-merged work cannot be abandoned — is what
#     this harness covers instead.
#   - that an agent obeys a refusal. Observability is necessary, not sufficient.
#   - that an agent writes a plan at the right moment. "This should be its own
#     change" is a judgement, and no command observes it being made.
NOTE

printf '\n'
if [ "$FAILURES" -ne 0 ]; then
  printf '%s refusal observation(s) failed\n' "$FAILURES" >&2
  exit 1
fi
printf 'gate refusals: every observation held\n'
