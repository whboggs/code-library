# ROAS Keyword Labeler (MCC)

A Google Ads Script that runs at the **manager (MCC) level** and automatically labels keywords by how their ROAS (Conv. Value ÷ Cost) compares to the **rest of their ad group**:

- **`Top ROAS`** — keywords that **meaningfully beat** their ad group
- **`Low ROAS`** — keywords that **meaningfully trail** their ad group

Both labels are kept current on every run — keywords that cross back over the bar gain or lose the label automatically.

Built for agency use: one script, scheduled once, maintains both labels across every client account in parallel.

## What it does

On each run, for every child account under the MCC:

1. Creates the `Top ROAS` and `Low ROAS` labels in the account if they don't exist (entity labels are account-owned — same name and color everywhere, but each account has its own label object)
2. Pulls 90 days of ad group and keyword performance
3. Classifies each keyword as a top performer, an underperformer, or neither (below)
4. Applies each label to new qualifiers
5. Removes each label from any keyword that no longer qualifies — including labels applied manually or by previous runs

Both labels are treated as **fully script-owned**. Don't hand-apply `Top ROAS` or `Low ROAS` for your own bookkeeping; use a differently named label for that.

## Qualification tests

Both sides share the same sample floor (`MIN_CONVERSIONS`) and the same uncertainty margin (`CONFIDENCE_Z`), applied in **opposite directions** so each label stays conservative. The benchmark for both is the ROAS of the ad group **excluding the keyword itself**, so a dominant keyword isn't compared against an average that's mostly its own data. A keyword that is the **only spender in its ad group** is skipped either way — there are no peers to compare against.

The two labels are **mutually exclusive** — no keyword can earn both in the same run.

### Top ROAS — must pass all five gates

| # | Gate | Why |
|---|------|-----|
| 1 | ≥ `MIN_CONVERSIONS` conversions (default 30) | Enough sample to judge |
| 2 | **Keyword's** avg value per conversion > `MIN_VALUE_PER_CONV` (default $1) | A "top performer" with no real conversion value is a lead-gen artifact, not a win |
| 3 | Benchmark = ROAS of the ad group **excluding the keyword itself** | Fair comparison |
| 4 | **Lower-bound** ROAS: `ROAS × (1 − Z / √conversions)` | Discount observed ROAS downward — low-volume keywords must show a bigger observed edge |
| 5 | `lowerROAS > benchmark × BENCHMARK_MULTIPLIER` | The final comparison |

### Low ROAS — must pass all five gates

| # | Gate | Why |
|---|------|-----|
| 1 | ≥ `MIN_CONVERSIONS` conversions (default 30) | Enough sample to judge |
| 2 | **Peers'** avg value per conversion > `MIN_VALUE_PER_CONV` (default $1) | Gate is on the *peers*, not the keyword — a keyword burning spend at near-$0 value is exactly what we want to flag, but only inside an ad group that actually tracks revenue (excludes lead-gen accounts) |
| 3 | Benchmark = ROAS of the ad group **excluding the keyword itself** | Fair comparison |
| 4 | **Upper-bound** ROAS: `ROAS × (1 + Z / √conversions)` | Inflate observed ROAS upward — the benefit of the doubt, so low-volume keywords must trail by a bigger observed margin before we flag them |
| 5 | `upperROAS < benchmark ÷ BENCHMARK_MULTIPLIER` | The final comparison |

### The uncertainty margin, briefly

Observed ROAS on 30 conversions is a noisy estimate; on 300 it's a solid one. The margin nudges the observed ROAS toward the *cautious* side in proportion to `Z / √conversions` — **down** for the top test, **up** for the low test — so a keyword only earns a label if it clears the bar even under the estimate least favorable to being labeled:

| Conversions | Margin at Z = 1.0 |
|---|---|
| 30 | ~18% |
| 55 | ~13% |
| 100 | ~10% |
| 250 | ~6% |

So a 30-conversion keyword needs to beat (or trail) its peers by roughly 22%+ to be labeled, while a 250-conversion keyword qualifies at ~7%+. That is the intended definition of *meaningfully* better — or worse.

## Configuration

All knobs live in the `CONFIG` block at the top of the script and apply to every child account:

| Key | Default | Notes |
|---|---|---|
| `MANAGE_TOP` | `true` | Set `false` to stop creating/applying/removing the `Top ROAS` label entirely |
| `TOP_LABEL_NAME` | `Top ROAS` | Renaming later orphans old labels — remove them manually |
| `TOP_LABEL_COLOR` | `#22C55E` | Tailwind green-500. Only used at label creation; recolor existing labels in the UI |
| `MANAGE_LOW` | `true` | Set `false` to stop creating/applying/removing the `Low ROAS` label entirely |
| `LOW_LABEL_NAME` | `Low ROAS` | Renaming later orphans old labels — remove them manually |
| `LOW_LABEL_COLOR` | `#EF4444` | Tailwind red-500. Only used at label creation; recolor existing labels in the UI |
| `LOOKBACK_DAYS` | `90` | Rolling window, ends yesterday (no partial-day data) |
| `MIN_CONVERSIONS` | `30` | Keyword-level floor (both sides) |
| `CONFIDENCE_Z` | `1.0` | ~68% one-sided confidence. `1.28` ≈ 80% (stricter). `0` disables the margin |
| `BENCHMARK_MULTIPLIER` | `1.0` | Extra margin over/under peers. `1.25` = must beat by 25% (top) *or* trail by 25% (low), *after* the uncertainty margin |
| `MIN_VALUE_PER_CONV` | `1` | Revenue gate. Raise (e.g. `10`) to exclude token-value conversions in e-comm accounts |
| `DEBUG` | `true` | Logs the qualification math — see below |

### Tuning cheat sheet

- **Too few labels?** Lower `CONFIDENCE_Z` to `0.84`, or drop `MIN_CONVERSIONS` to 20.
- **Too many marginal labels?** Raise `CONFIDENCE_Z` to `1.28`, or set `BENCHMARK_MULTIPLIER` to `1.1`.
- **Want simple, no statistics?** `CONFIDENCE_Z: 0` + `BENCHMARK_MULTIPLIER: 1.15` = "beat/trail peers by 15%," flat.
- **Only want one label?** Set `MANAGE_TOP: false` or `MANAGE_LOW: false`. The disabled side is left completely untouched — existing labels are neither created nor removed.

`BENCHMARK_MULTIPLIER` widens both bars symmetrically: the top bar moves up (`× multiplier`) and the low bar moves down (`÷ multiplier`), so a raise makes *both* labels harder to earn and leaves a wider "unremarkable" middle band untouched.

## Installation

1. Open the **manager account** → Tools → Bulk actions → **Scripts** (must be at the MCC level, not a client account)
2. Create a new script, paste in `agencyAddTopROASLabel.js`
3. **Authorize** when prompted (the script does nothing without this — it will appear to run and label zero keywords)
4. Run **Preview** first and review the logs (see Preview limitations below)
5. Run live once, verify labels in a couple of accounts
6. Schedule **daily** (recommended — keeps labels fresh and removal churn small) or weekly

The script processes up to 50 child accounts per execution via `executeInParallel`; each account gets its own 30-minute execution limit.

## Reading the logs

Each run ends with one line per account plus a totals footer:

```
Client A (123-456-7890) — ad groups: 41 | Top: qualifying 6, +2/-1 (4 kept) | Low: qualifying 3, +1/-0 (2 kept)
Client B (234-567-8901) — ad groups: 17 | Top: qualifying 0, +0/-0 (0 kept) | Low: qualifying 0, +0/-0 (0 kept)
----------------------------------------
Done. Accounts processed: 24, failed: 0. Top ROAS: +9/-3. Low ROAS: +4/-1.
```

`qualifying 0` on both sides is **normal for lead-gen accounts** — the value-per-conversion gate excludes them by design.

### Debug output

With `DEBUG: true`, the script logs the full math for every keyword *in contention* — i.e., raw ROAS above its peer average (`TOP` lines) or below it (`LOW` lines):

```
[Client A] TOP PASS "used tritoon utah" — conv: 112.0, ROAS: 6.90, peerROAS: 3.75, lowerROAS: 6.25 vs bar: 3.75
[Client A] TOP FAIL "pontoon dealer near me" — conv: 34.0, ROAS: 4.12, peerROAS: 3.80, lowerROAS: 3.42 vs bar: 3.80
[Client A] LOW PASS "cheap boat rental" — conv: 61.0, ROAS: 1.10, peerROAS: 3.80, upperROAS: 1.24 vs bar: 3.80
[Client A] LOW FAIL "boat trailer parts" — conv: 33.0, ROAS: 3.40, peerROAS: 3.80, upperROAS: 4.06 vs bar: 3.80
```

Because only keywords on the relevant side of the average are logged, every `TOP FAIL` means *beat the ad group average, but not by enough to trust given the sample size*, and every `LOW FAIL` means *trailed the average, but not by enough to trust*. Keywords that sit just under (or over) the bar run after run are worth a manual look — they're one streak away from being labeled.

Debug volume is small enough to leave on permanently.

## Behavior notes & gotchas

- **Preview mode can't show label mutations.** `createLabel` isn't persisted in Preview, so in accounts where a label doesn't exist yet, applying/removing is silently skipped (guarded — it won't error). Preview is still fully useful for the qualifying counts and debug math. The first **live** run creates labels and applies them.
- **First live run may remove labels in bulk** if a previous version of the script (or manual labeling) applied them under looser criteria. That's the reconciliation working as intended.
- **Paused keywords lose their labels** on the next run — the sweep isn't status-filtered, but the qualifying query only considers enabled keywords in enabled ad groups/campaigns.
- **Status filters:** only `ENABLED` keyword + ad group + campaign are eligible. Keywords in paused campaigns can never qualify.
- **Labels are per-account.** Each client account owns its own `Top ROAS` / `Low ROAS` labels with distinct label IDs. This only matters for cross-account reporting by label resource name.
- **GAQL quirk:** `metrics.conversions` doesn't support `>=` in a WHERE clause, so the conversion floor is enforced in code, not in the query.
- **Mixed-value ad groups:** the peer benchmark uses the ad group's *full* totals. If an ad group mixes revenue-tracked keywords with valueless conversion actions, the valueless conversions drag the benchmark down slightly (making `Top ROAS` easier to earn and `Low ROAS` harder). Rare in practice; fixable if needed by computing benchmarks from value-carrying keywords only.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Runs clean, zero labels everywhere | Script not authorized; or all accounts fail the value gate (lead-gen, no conversion values) |
| `Low ROAS` labels nothing but `Top ROAS` works | Peers-value gate: the ad groups may not track enough conversion value on the *non*-keyword traffic. Check `MIN_VALUE_PER_CONV` |
| `Expected one label named '...' but found 0` | You're running an old version without the Preview guards — update |
| `OPERATOR_FIELD_MISMATCH ... metrics.conversions` | Old version with `>=` in the GAQL — update |
| Fewer labels than expected | Working as designed — check the debug FAIL lines and see the tuning cheat sheet |
| An account shows FAILED in the summary | Its error is logged on its own line; other accounts are unaffected |

## Files

- `agencyAddTopROASLabel.js` — the MCC script that fans out across all child accounts (use this for agency/manager setups)
- `singleAddTopRoasLabel.js` — single-account version (same logic; for an account outside an MCC). Don't run both against the same account — harmless but redundant.
