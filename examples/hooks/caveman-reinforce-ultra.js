#!/usr/bin/env node
// caveman ULTRA per-turn reinforcement — keeps `ultra` strong after /compact.
//
// Problem:
//   The caveman plugin injects its FULL ruleset only on SessionStart. That text
//   lives in the conversation, so /compact (and auto-compact) summarize it away.
//   After compaction the only surviving caveman signal is the plugin's weak
//   one-line UserPromptSubmit reminder, so `ultra` silently drifts to full/lite.
//
// Fix:
//   Re-inject a STRONG ultra ruleset on EVERY user turn (UserPromptSubmit),
//   including the first turn after /compact. Gated on the flag file the plugin
//   writes (~/.claude/.caveman-active), so `/caveman off|lite|full` keep working
//   — this emits nothing unless the active mode is exactly `ultra`.
//
// Output contract:
//   - stdout JSON { hookSpecificOutput: { hookEventName, additionalContext } }
//     when mode == ultra; empty output + exit 0 otherwise.
//   - Must never block a prompt → every failure is swallowed.
//
// Register under hooks.UserPromptSubmit in <HOME>/.claude/settings.json:
//   { "type": "command",
//     "command": "node \"<HOOKS_DIR>\\caveman-reinforce-ultra.js\"",
//     "timeout": 5 }

const fs = require('fs');
const path = require('path');
const os = require('os');

try {
  const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  const flagPath = path.join(claudeDir, '.caveman-active');

  let mode = '';
  try {
    mode = fs.readFileSync(flagPath, 'utf8').trim().toLowerCase();
  } catch (e) {
    process.exit(0); // no flag → caveman off → nothing to reinforce
  }

  if (mode !== 'ultra') process.exit(0); // only ULTRA needs the strong re-anchor

  const rules =
    'CAVEMAN ULTRA ACTIVE — hold this exact level every response (re-anchor after /compact, no drift to full/lite). ' +
    'Rules: drop articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries, hedging. Fragments OK. ' +
    'Abbreviate PROSE words only (DB/auth/config/req/res/fn/impl); causality as arrows (X -> Y); one word when one word enough. ' +
    'NEVER abbreviate code symbols, function/API names, CLI commands, commit-type keywords (feat/fix/...), or error strings — verbatim. ' +
    'No tool-call narration, no decorative tables/emoji, no long raw error-log dumps unless asked. ' +
    "Preserve the user's dominant language — compress the style, not the language. " +
    'Drop caveman ONLY for: security warnings, irreversible-action confirms, order-sensitive multi-step sequences, when the user asks to clarify/repeats — resume after. ' +
    'Code/commits/PRs: write normal.';

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: rules
    }
  }));
} catch (e) {
  process.exit(0); // best-effort — never break a turn
}
