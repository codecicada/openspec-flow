#!/bin/sh
# Validates the plugin half of this repository with Claude Code's own
# validator: the marketplace manifest, plugin.json, and the frontmatter of every
# skill and command.
#
# Why this exists: every other suite here tests the npm package. Nothing read
# the plugin manifests or the skill frontmatter, so a broken one passed CI and
# failed only when a consumer installed the plugin. The rename to
# openspec-steward edited both and was validated by hand.
#
# Run with `--strict`. Without it a skill or command whose frontmatter is
# missing, or a skill with no `description`, is only a warning and exits 0 — and
# such a skill loads with empty metadata, so it never triggers. The plugin
# directory's own advice (a missing icon) stays a warning under `--strict`.
#
# What it does NOT check, even under `--strict`, observed against the pinned
# version: a marketplace `source` pointing at a directory that does not exist,
# and a marketplace entry whose name differs from plugin.json. Both exit 0. A
# green here says nothing about them.
#
# The four observations, in the order they run:
#
#   A  this tree                      -> exit 0           the plugin validates
#   B  plugin.json made invalid JSON  -> exit 1 naming it  the validator has teeth
#   C  skill frontmatter removed      -> exit 1 naming it  --strict is in force
#   D  command frontmatter unparseable -> exit 1 naming it  commands are read too
#
# C fails only under --strict, so it is what proves the flag still reaches the
# validator. B, C and D together hold the pinned CLI to its claim: without them
# a later pin whose validator stopped checking would leave A green forever.
#
# Run with an empty HOME and no ANTHROPIC_API_KEY, here as well as in CI, so
# "needs no credentials" is observed on every run rather than assumed from the
# runner.
#
# Run it from anywhere: sh scripts/plugin/validate.sh
set -eu

# Same reason as in smoke-bin.sh: `npm run` exports the caller's npm config as
# npm_config_* variables, and npm 11 refuses an inherited allow-scripts flag on
# a project-scoped install.
unset npm_config_allow_scripts NPM_CONFIG_ALLOW_SCRIPTS

# Pinned, not floating: an upstream release must not be able to change the
# result of a build that changed nothing here. Bump it in its own commit; B and
# C are the test of the bump.
CLAUDE_CODE_VERSION='@anthropic-ai/claude-code@2.1.310'

REPO=$(cd "$(dirname "$0")/../.." && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT INT TERM

FAILURES=0

# Reports an observation and remembers a miss rather than exiting, so one run
# tells you everything that is wrong instead of only the first thing.
observe() {
  if [ "$1" = 'ok' ]; then
    printf 'ok   %s\n' "$2"
  else
    printf 'FAIL %s\n' "$2" >&2
    FAILURES=$((FAILURES + 1))
  fi
}

printf '\n# installing %s\n' "$CLAUDE_CODE_VERSION"
mkdir -p "$WORK/cli" "$WORK/home"
(cd "$WORK/cli" && npm init -y >/dev/null &&
  npm install --loglevel=error --no-audit --no-fund "$CLAUDE_CODE_VERSION" >/dev/null)
CLAUDE="$WORK/cli/node_modules/.bin/claude"

# Runs the validator on a directory with an empty HOME and no API key,
# capturing output and status without tripping `set -e`.
validate() {
  set +e
  OUT=$(HOME="$WORK/home" ANTHROPIC_API_KEY='' "$CLAUDE" plugin validate --strict "$1" 2>&1)
  STATUS=$?
  set -e
}

# A copy of the committed tree, so a mutation never touches the working copy.
# `git archive` rather than `cp -R`: untracked files are not part of the
# plugin a consumer installs.
copy_tree() {
  rm -rf "$WORK/copy"
  mkdir -p "$WORK/copy"
  (cd "$REPO" && git archive HEAD) | tar -x -C "$WORK/copy"
}

# --- A: this tree validates ---------------------------------------------------
#
# Validates the working tree, not HEAD, so an uncommitted manifest edit is
# checked before it is committed.

validate "$REPO"
if [ "$STATUS" -eq 0 ] && printf '%s' "$OUT" | grep -q 'Validation passed'; then
  observe ok 'this tree passes plugin validate'
else
  observe fail "this tree should pass plugin validate; got status $STATUS and output: $OUT"
fi

# --- B: an invalid plugin.json fails, and is named ----------------------------

copy_tree
printf '{ "name": ' >"$WORK/copy/.claude-plugin/plugin.json"
validate "$WORK/copy"
if [ "$STATUS" -ne 0 ] && printf '%s' "$OUT" | grep -q 'plugin.json'; then
  observe ok 'an invalid plugin.json fails and is named'
else
  observe fail "an invalid plugin.json should fail naming it; got status $STATUS and output: $OUT"
fi

# --- C: a skill without frontmatter fails, and is named ------------------------
#
# The opening `---` is removed, so the skill has no frontmatter at all. Without
# --strict that is a warning and the run passes; at runtime the skill loads with
# empty metadata and never triggers.

copy_tree
SKILL="$WORK/copy/skills/openspec-evidence/SKILL.md"
sed '1d' "$SKILL" >"$WORK/edited.md"
cat "$WORK/edited.md" >"$SKILL"
validate "$WORK/copy"
if [ "$STATUS" -ne 0 ] && printf '%s' "$OUT" | grep -q 'No frontmatter block found'; then
  observe ok 'a skill without frontmatter fails under --strict and is named'
else
  observe fail "a skill without frontmatter should fail under --strict; got status $STATUS and output: $OUT"
fi

# --- D: unparseable command frontmatter fails, and is named --------------------
#
# A tab before a key is a YAML parse error. Proves command files are read, not
# only skills.

copy_tree
COMMAND="$WORK/copy/commands/verify-green.md"
sed '2s/^name:/\tname:/' "$COMMAND" >"$WORK/edited.md"
cat "$WORK/edited.md" >"$COMMAND"
validate "$WORK/copy"
if [ "$STATUS" -ne 0 ] && printf '%s' "$OUT" | grep -q 'failed to parse'; then
  observe ok 'unparseable command frontmatter fails and is named'
else
  observe fail "unparseable command frontmatter should fail naming it; got status $STATUS and output: $OUT"
fi

printf '\n'
if [ "$FAILURES" -ne 0 ]; then
  printf '%s plugin observation(s) failed\n' "$FAILURES" >&2
  exit 1
fi
printf 'plugin validate: every observation held\n'
