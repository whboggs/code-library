# Top ROAS Keyword Labeler (MCC)

A Google Ads Script that runs at the **manager (MCC) level** and automatically labels keywords whose ROAS (Conv. Value ÷ Cost) **meaningfully** beats the rest of their ad group. Labels are kept current on every run — keywords that fall below the bar lose the label automatically.

Built for agency use: one script, scheduled once, maintains "Top ROAS" labels across every client account in parallel.

## What it does

On each run, for every child account under the MCC:

1. Creates the `Top ROAS` label in the account if it doesn't exist (entity labels are account-owned — same name and color everywhere, but each account has its own label object)
2. Pulls 90 days of ad group and keyword performance
3. Identifies keywords that pass the full qualification test (below)
4. Applies the label to new qualifiers
5. Removes the label from any keyword that no longer qualifies — including labels applied manually or by previous runs

The label is treated as **fully script-owned**. Don't hand-apply `Top ROAS` for your own bookkeeping; use a differently named label for that.

## Qualification test

A keyword must pass **all five gates**:

| # | Gate | Why |
|---|------|-----|
| 1 | ≥ `MIN_CONVERSIONS` conversions (default 30) | Enough sample to judge |
| 2 | Avg value per conversion > `MIN_VALUE_PER_CONV` (default $1) | Filters lead-gen keywords with $0 or placeholder conversion values — ROAS is meaningless there |
| 3 | Benchmark = ROAS of the ad group **excluding the keyword itself** | A dominant keyword shouldn't be compared against an average that's mostly its own data |
| 4 | Uncertainty discount: `adjustedROAS = ROAS × (1 − Z / √conversions)` | Low-volume keywords must show a bigger observed edge; high-volume keywords qualify on a modest one |
| 5 | `adjustedROAS > benchmark × BENCHMARK_MULTIPLIER` | The final comparison |

A keyword that is the **only spender in its ad group** is skipped — there are no peers to beat.

### The uncertainty discount, briefly

Observed ROAS on 30 conversions is a noisy estimate; on 300 it's a solid one. The discount shrinks the observed ROAS toward zero in proportion to `Z / √conversions`, so:

| Conversions | Discount at Z = 1.0 |
|---|---|
| 30 | ~18% |
| 55 | ~13% |
| 100 | ~10% |
| 250 | ~6% |

This means a 30-conversion keyword needs to beat its peers by roughly 22%+ to qualify, while a 250-conversion keyword qualifies at ~7%+. That is the intended definition of *meaningfully* better.

## Configuration

All knobs live in the `CONFIG` block at the top of the script and apply to every child account:

| Key | Default | Notes |
|---|---|---|
| `LABEL_NAME` | `Top ROAS` | Renaming later orphans old labels — remove them manually |
| `LABEL_COLOR` | `#22C55E` | Tailwind green-500. Only used at label creation; recolor existing labels in the UI |
| `LOOKBACK_DAYS` | `90` | Rolling window, ends yesterday (no partial-day data) |
| `MIN_CONVERSIONS` | `30` | Keyword-level floor |
| `CONFIDENCE_Z` | `1.0` | ~68% one-sided confidence. `1.28` ≈ 80% (stricter). `0` disables the discount |
| `BENCHMARK_MULTIPLIER` | `1.0` | Extra margin over peers. `1.25` = must beat by 25% *after* the discount |
| `MIN_VALUE_PER_CONV` | `1` | Raise (e.g. `10`) to also exclude token-value conversions in e-comm accounts |
| `DEBUG` | `true` | Logs the qualification math — see below |

### Tuning cheat sheet

- **Too few labels?** Lower `CONFIDENCE_Z` to `0.84`, or drop `MIN_CONVERSIONS` to 20.
- **Too many marginal labels?** Raise `CONFIDENCE_Z` to `1.28`, or set `BENCHMARK_MULTIPLIER` to `1.1`.
- **Want simple, no statistics?** `CONFIDENCE_Z: 0` + `BENCHMARK_MULTIPLIER: 1.15` = "beat peers by 15%," flat.

## Installation

1. Open the **manager account** → Tools → Bulk actions → **Scripts** (must be at the MCC level, not a client account)
2. Create a new script, paste in `top-roas-keyword-labeler-mcc.js`
3. **Authorize** when prompted (the script does nothing without this — it will appear to run and label zero keywords)
4. Run **Preview** first and review the logs (see Preview limitations below)
5. Run live once, verify labels in a couple of accounts
6. Schedule **daily** (recommended — keeps labels fresh and removal churn small) or weekly

The script processes up to 50 child accounts per execution via `executeInParallel`; each account gets its own 30-minute execution limit.

## Reading the logs

Each run ends with one line per account plus a totals footer:

```
Client A (123-456-7890) — ad groups: 41, qualifying: 6, added: 2, removed: 1, unchanged: 4
Client B (234-567-8901) — ad groups: 17, qualifying: 0, added: 0, removed: 0, unchanged: 0
----------------------------------------
Done. Accounts processed: 24, failed: 0, labels added: 9, removed: 3.
```

`qualifying: 0` is **normal for lead-gen accounts** — the value-per-conversion gate excludes them by design.

### Debug output

With `DEBUG: true`, the script logs the full math for every keyword *in contention* — i.e., raw ROAS above its peer average:

```
[Client A] PASS  "used tritoon utah" — conv: 112.0, ROAS: 6.90, peerROAS: 3.75, discount: 9%, adjROAS: 6.25 vs bar: 3.75
[Client A] FAIL  "pontoon dealer near me" — conv: 34.0, ROAS: 4.12, peerROAS: 3.80, discount: 17%, adjROAS: 3.42 vs bar: 3.80
```

Because only above-average keywords are logged, every `FAIL` line means exactly: *beat the ad group average, but not by enough to trust given the sample size*. Keywords that sit just under the bar run after run are worth a manual look — they're one good streak away from qualifying.

Debug volume is small enough to leave on permanently.

## Behavior notes & gotchas

- **Preview mode can't show label mutations.** `createLabel` isn't persisted in Preview, so in accounts where the label doesn't exist yet, applying/removing is silently skipped (guarded — it won't error). Preview is still fully useful for the qualifying counts and debug math. The first **live** run creates labels and applies them.
- **First live run may remove labels in bulk** if a previous version of the script (or manual labeling) applied them under looser criteria. That's the reconciliation working as intended.
- **Paused keywords lose the label** on the next run — the sweep isn't status-filtered, but the qualifying query only considers enabled keywords in enabled ad groups/campaigns.
- **Status filters:** only `ENABLED` keyword + ad group + campaign are eligible. Keywords in paused campaigns can never qualify.
- **Labels are per-account.** Each client account owns its own `Top ROAS` label with a distinct label ID. This only matters for cross-account reporting by label resource name.
- **GAQL quirk:** `metrics.conversions` doesn't support `>=` in a WHERE clause, so the conversion floor is enforced in code, not in the query.
- **Mixed-value ad groups:** the peer benchmark uses the ad group's *full* totals. If an ad group mixes revenue-tracked keywords with valueless conversion actions, the valueless conversions drag the benchmark down slightly (making it easier to beat). Rare in practice; fixable if needed by computing benchmarks from value-carrying keywords only.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Runs clean, zero labels everywhere | Script not authorized; or all accounts fail the value gate (lead-gen, no conversion values) |
| `Expected one label named 'Top ROAS' but found 0` | You're running an old version without the Preview guards — update |
| `OPERATOR_FIELD_MISMATCH ... metrics.conversions` | Old version with `>=` in the GAQL — update |
| Fewer labels than expected | Working as designed — check the debug FAIL lines and see the tuning cheat sheet |
| An account shows FAILED in the summary | Its error is logged on its own line; other accounts are unaffected |

## Files

- `top-roas-keyword-labeler-mcc.js` — the MCC script (use this)
- `top-roas-keyword-labeler.js` — single-account version (same logic minus the fan-out; only for accounts outside the MCC). Don't run both against the same account — harmless but redundant.
