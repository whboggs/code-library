# Formulas
## Notes
- Search Lost IS (budget) is a single metric, do not multiply Budget by Search Lost IS.

## Ecommerce
- **ATC Rate:** Adds to cart / Link Clicks

## Google & Bing
- **Total Impressions Eligible For (Search):** Impressions / Search IS
- **Daily Budget Needed to Minimize Search Lost IS (budget):** (Total Impressions Eligible For * Search Lost IS (budget) * CTR * CPC) / days in period
- **Last X Days ROAS**
  - **Last 30 Days ROAS:** Conversion_value_per_cost.date_range(last_30_days)
  - **Last 14 Days ROAS:** Conversion_value_per_cost.date_range(last_14_days)
- **Last C Days Cost/Conv**
  - **Last 30 Days Cost/Conv:** Cost_per_conv.date_range(last_30_days)
  - **Last 14 Days Cost/Conv:** Cost_per_conv.date_range(last_14_days)



## Universal
- **Hook rate:** 3 Second Video Plays / Impressions
- **Hold Rate:** 95% Video Plays / 3 Second Video Plays
- **25% Video Play Rate:** 25% Video Plays / Impressions
- **50% Video Play Rate:** 50% Video Plays / Impressions
- **75% Video Play Rate:** 75% Video Plays / Impressions
- **95% Video Play Rate:** 95% Video Plays / Impressions
- **100% Video Play Rate:** 100% Video Plays / Impressions
- **CRSS Rate:** (Post Comments + Post Reactions + Post Saves + Post Shares) ÷ Impressions
- **Repeat Play Rate:** 50% Video Plays / Reach

## Ad Culling

Statistical cull rule for underperforming ads. Answers the question: *if this ad's true CPA were exactly at goal, how unlikely is the result we're actually seeing?* If the answer is "unlikely enough," the ad is probably not at goal and can be cut.

Uses the **Garwood exact Poisson upper bound** at `2k+2` degrees of freedom, where `k` = observed conversions. This is the standard exact interval and guarantees at least the stated coverage.

### The rule

```
Cull if:  {Actual CPA} > {Goal CPA} × {Multiplier}
```

At 0 conversions CPA is undefined, so the same multiplier is compared against spend instead:

```
Cull if:  {Spend} > {Goal CPA} × {Multiplier}
```

### Underlying formula

```
λ_upper    = ½ · χ²(1−α, 2k+2)
Multiplier = λ_upper / k
```

Where `α` is the false-positive tolerance (α = 0.05 for the 95% table, 0.20 for the 80% table, etc.).

At k=0 the chi-square term collapses to a closed form — no lookup needed:

```
Multiplier (k=0) = ln(1/α)
```

Example: goal CPA $80 at 95% → cull a zero-conversion ad once it passes $240 spend.

### 95% confidence
*Cull ads with a 95% chance of not hitting goal CPA. Most conservative — longest leash before cutting.*

| Conversions | Multiplier |
| --- | --- |
| 0 † | 3.00 |
| 1 | 4.74 |
| 2 | 3.15 |
| 5 | 2.10 |
| 10 | 1.70 |
| 15 | 1.54 |
| 20 | 1.45 |
| 30 | 1.36 |
| 50 | 1.27 |
| 75 | 1.21 |
| 100 | 1.18 |
| 125 | 1.16 |
| 150 | 1.15 |


† Compared against **spend**, not CPA — CPA is undefined at zero conversions.

### 90% confidence

| Conversions | Multiplier |
| --- | --- |
| 0 † | 2.30 |
| 1 | 3.89 |
| 2 | 2.66 |
| 5 | 1.85 |
| 10 | 1.54 |
| 15 | 1.42 |
| 20 | 1.35 |
| 30 | 1.28 |
| 50 | 1.21 |
| 75 | 1.16 |
| 100 | 1.14 |
| 125 | 1.12 |
| 150 | 1.11 |


† Compared against **spend**, not CPA — CPA is undefined at zero conversions.

### 85% confidence

| Conversions | Multiplier |
| --- | --- |
| 0 † | 1.90 |
| 1 | 3.37 |
| 2 | 2.36 |
| 5 | 1.70 |
| 10 | 1.44 |
| 15 | 1.34 |
| 20 | 1.29 |
| 30 | 1.23 |
| 50 | 1.17 |
| 75 | 1.13 |
| 100 | 1.11 |
| 125 | 1.10 |
| 150 | 1.09 |


† Compared against **spend**, not CPA — CPA is undefined at zero conversions.

### 80% confidence
*Most aggressive — cuts fastest, highest false-positive rate. Roughly 1 in 5 culled ads would have hit goal given more data.*

| Conversions | Multiplier |
| --- | --- |
| 0 † | 1.61 |
| 1 | 2.99 |
| 2 | 2.14 |
| 5 | 1.58 |
| 10 | 1.37 |
| 15 | 1.28 |
| 20 | 1.24 |
| 30 | 1.19 |
| 50 | 1.14 |
| 75 | 1.11 |
| 100 | 1.09 |
| 125 | 1.08 |
| 150 | 1.07 |


† Compared against **spend**, not CPA — CPA is undefined at zero conversions.

### Worked example

Goal CPA = $80, ad has spent $520 with 5 conversions → actual CPA $104.

At 95%: `$80 × 2.10 = $168`. Actual CPA of $104 is below it → **keep**.
At 80%: `$80 × 1.58 = $126`. Actual CPA of $104 is still below it → **keep**.

Same ad at 5 conversions on $900 spend → actual CPA $180, above both → **cull**.

### Notes and guardrails

- **Interpolate conservatively.** For conversion counts between table rows, round *down* to the nearest listed row (e.g. k=7 uses the k=5 multiplier). This errs toward keeping ads.
- **Attribution lag.** The zero- and low-conversion cases are the most exposed to conversions that haven't landed yet. Gate the rule behind a minimum ad age (7–14 days depending on the account's click window) or exclude the most recent N days of spend from the calculation. Without this, the rule will cull ads whose conversions are still in flight.
- **Learning phase.** On Meta, a $80 goal CPA triggers a cull at $240 spend under the 95% zero-conversion rule — which can land inside or barely past learning. Consider pinning the zero-conversion rule at 95% even when running 80% or 85% elsewhere, since a false positive costs the most when there's no signal at all.
- **This is a one-sided test.** It only asks whether the ad is worse than goal. It says nothing about whether one ad beats another — for that, use a proper two-sample comparison.
- **Interval convention.** These tables use `2k+2` degrees of freedom. This is a deliberate choice tied to how evaluation is triggered — see *Why 2k+2* below before changing it or porting it to code.

### Why 2k+2

`2k` and `2k+2` are not competing approximations of the same quantity. Each is the *exact* answer to a different sampling design, and the right one depends entirely on what triggers the evaluation.

**Fixed-window sampling** — an ad is inspected at an arbitrary moment (a scheduled script reading current cost and conversions). Spend is fixed by the calendar; conversion count is the random variable. This is Poisson, and the exact bound is **2k+2**.

**Inverse sampling** — evaluation fires the instant an ad records its k-th conversion, and the question is how much spend it took to get there. Conversion count is fixed by the trigger; spend is the random variable. This is Gamma/Erlang, and the exact bound is **2k**.

**This reference uses 2k+2** because evaluation is scheduled, not tier-triggered: the Google Ads Script runs on a cadence and reads whatever cost and conversions each entity currently has. If the trigger is ever changed so that evaluation fires only on tier crossings, `2k` becomes the correct convention and these tables should be regenerated.

The zero-conversion rule is necessarily fixed-window regardless — there is no "0th conversion" to wait for — which is why it is always `ln(1/α)`. An earlier version of this framework used `2k` for the conversion tiers while pairing it with the fixed-window zero rule; the resulting k=0 / k=1 threshold collision was a symptom of mixing two sampling frames in one table, not an error in the `2k` math itself.

**Alternatives considered and rejected:**

- **Wald normal approximation** (`Multiplier = 1 + z/√k`). Rejected. Returns 0 at k=0, so it culls zero-conversion ads at any spend, and it undercovers badly at low `k` — precisely where the decision is hardest. Do not use, even though the closed form is tempting for scripting.
- **Jeffreys / gamma credible interval** (`2k+1`). Rejected on cost-benefit, not correctness. It has the best average coverage of the three, but differs from `2k+2` by less than 0.05 at k≥10, and being a credible rather than confidence interval it carries an interpretation burden every time the number has to be explained.

**Porting note:** the Gamma(k, 1/k) relative-CPL formulation used in the CPL Reliability Suite and cull-rule generator is the `2k` convention. Any tooling built on that formulation predates this decision and will produce different multipliers than the tables above.
