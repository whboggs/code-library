/**
 * ROAS Keyword Labeler — MCC VERSION
 * ----------------------------------
 * Version: v1.1.0
 * Last updated: 2026-07-23
 * Runs from a MANAGER (MCC) account and processes ALL child accounts in
 * parallel. Each account gets its own labels (entity labels are account-owned;
 * same name/color everywhere, but separate label objects).
 *
 * Applies TWO labels, based on how a keyword's ROAS (Conv. Value / Cost)
 * compares to the REST of its ad group over the lookback window:
 *
 *   • "Top ROAS" — keyword ROAS MEANINGFULLY BEATS the rest of its ad group
 *   • "Low ROAS" — keyword ROAS MEANINGFULLY TRAILS the rest of its ad group
 *
 * Both sides share the same sample floor and the same uncertainty margin —
 * applied in OPPOSITE directions so each label stays conservative:
 *
 *   Top qualification (all must pass):
 *     1. Keyword has >= MIN_CONVERSIONS conversions
 *     2. Keyword's avg value per conversion > MIN_VALUE_PER_CONV
 *        (filters lead-gen keywords with $0 or placeholder conversion values)
 *     3. Benchmark = ROAS of the ad group EXCLUDING the keyword itself
 *     4. LOWER-bound ROAS = ROAS * (1 - Z / sqrt(conversions))
 *     5. lowerROAS > benchmark * BENCHMARK_MULTIPLIER
 *
 *   Low qualification (all must pass):
 *     1. Keyword has >= MIN_CONVERSIONS conversions
 *     2. The ad group is revenue-tracked: the PEERS' avg value per conversion
 *        > MIN_VALUE_PER_CONV. The gate is on the peers, not the keyword, so a
 *        genuinely near-$0-value keyword still qualifies — but lead-gen ad
 *        groups (no real conversion values anywhere) are excluded.
 *     3. Benchmark = ROAS of the ad group EXCLUDING the keyword itself
 *     4. UPPER-bound ROAS = ROAS * (1 + Z / sqrt(conversions))
 *     5. upperROAS < benchmark / BENCHMARK_MULTIPLIER
 *
 * Using the LOWER bound for "top" and the UPPER bound for "low" means a
 * keyword must clear the bar even under the estimate least favorable to being
 * labeled. Low-volume keywords need a bigger observed gap either way; the two
 * labels are mutually exclusive by construction.
 *
 * Both labels are kept current per account: keywords that no longer qualify
 * have the label removed on each run.
 *
 * Notes:
 *   - executeInParallel supports up to 50 accounts per run; each account
 *     gets its own 30-minute execution limit.
 *   - Schedule daily or weekly at the MCC level.
 */

// ---- Configuration (applies to every child account) ------------------------
const CONFIG = {
  // Top ROAS label — keywords that meaningfully BEAT their ad group
  MANAGE_TOP: true,              // Set false to stop managing the Top ROAS label
  TOP_LABEL_NAME: 'Top ROAS',    // Label to apply/remove
  TOP_LABEL_COLOR: '#22C55E',    // Tailwind green-500 — used only at label creation

  // Low ROAS label — keywords that meaningfully TRAIL their ad group
  MANAGE_LOW: true,              // Set false to stop managing the Low ROAS label
  LOW_LABEL_NAME: 'Low ROAS',    // Label to apply/remove
  LOW_LABEL_COLOR: '#EF4444',    // Tailwind red-500 — used only at label creation

  // Shared knobs (apply to both sides)
  LOOKBACK_DAYS: 90,             // Rolling window for the ROAS comparison
  MIN_CONVERSIONS: 30,           // Keyword must have >= this many conversions
  CONFIDENCE_Z: 1.0,             // Uncertainty margin (~68% one-sided). 0 = off
  BENCHMARK_MULTIPLIER: 1.0,     // Extra margin vs peers (1.25 = beat/trail by 25%)
  MIN_VALUE_PER_CONV: 1,         // Revenue gate: skip when value/conv <= this
                                 // (filters lead-gen: $0 or $1 placeholder values)
  DEBUG: true,                   // Log qualification math — only for keywords
                                 // on the relevant side of their peer average
};

// ---- MCC entry point -------------------------------------------------------

function main() {
  // Select ALL child accounts under this manager (cap: 50 per execution)
  const accountSelector = AdsManagerApp.accounts().withLimit(50);

  // Fan out: processAccount() runs once per account, each in its own thread
  // with its own 30-min limit. reportResults() aggregates when all finish.
  accountSelector.executeInParallel('processAccount', 'reportResults');
}

/**
 * Runs inside each child account's context — every AdsApp call below is
 * automatically scoped to the account being processed.
 * Returns a JSON summary string for the aggregator.
 */
function processAccount() {
  const account = AdsApp.currentAccount();

  // Ensure each managed label exists before we try to apply it
  if (CONFIG.MANAGE_TOP) {
    ensureLabelExists(
      CONFIG.TOP_LABEL_NAME,
      CONFIG.TOP_LABEL_COLOR,
      'Keyword ROAS meaningfully beats rest of ad group (auto-managed by MCC script)'
    );
  }
  if (CONFIG.MANAGE_LOW) {
    ensureLabelExists(
      CONFIG.LOW_LABEL_NAME,
      CONFIG.LOW_LABEL_COLOR,
      'Keyword ROAS meaningfully trails rest of ad group (auto-managed by MCC script)'
    );
  }

  // Build the rolling date window (ends yesterday to avoid partial-day data)
  const { startDate, endDate } = getDateRange(CONFIG.LOOKBACK_DAYS);

  // Step 1: Ad group totals used to build per-keyword "rest of ad group" benchmarks
  const adGroupTotals = buildAdGroupTotalsMap(startDate, endDate);

  // Step 2: Classify keywords into top / low sets in a single pass (see header)
  const { top, low } = classifyKeywords(startDate, endDate, adGroupTotals);

  // Step 3: Sync each label — remove it from stale keywords, add it to new
  // qualifiers. A disabled side is left completely untouched.
  const topResult = CONFIG.MANAGE_TOP
    ? syncLabel(top, CONFIG.TOP_LABEL_NAME)
    : { added: 0, removed: 0, unchanged: 0 };
  const lowResult = CONFIG.MANAGE_LOW
    ? syncLabel(low, CONFIG.LOW_LABEL_NAME)
    : { added: 0, removed: 0, unchanged: 0 };

  // Return a per-account summary for reportResults()
  return JSON.stringify({
    accountName: account.getName(),
    customerId: account.getCustomerId(),
    adGroups: Object.keys(adGroupTotals).length,
    topQualifying: top.size,
    lowQualifying: low.size,
    topAdded: topResult.added,
    topRemoved: topResult.removed,
    topUnchanged: topResult.unchanged,
    lowAdded: lowResult.added,
    lowRemoved: lowResult.removed,
    lowUnchanged: lowResult.unchanged,
  });
}

/**
 * Removes a label from keywords that no longer qualify and applies it to new
 * qualifiers. Returns { added, removed, unchanged } for the summary.
 */
function syncLabel(qualifying, labelName) {
  const sweep = removeStaleLabels(qualifying, labelName);
  const toAdd = [...qualifying].filter((key) => !sweep.alreadyLabeled.has(key));
  applyLabel(toAdd, labelName);
  return {
    added: toAdd.length,
    removed: sweep.removed,
    unchanged: sweep.alreadyLabeled.size,
  };
}

/**
 * Aggregator — runs once at the MCC level after all accounts finish.
 * Logs a per-account summary plus any per-account errors.
 */
function reportResults(results) {
  let topAdded = 0;
  let topRemoved = 0;
  let lowAdded = 0;
  let lowRemoved = 0;
  let failures = 0;

  for (const result of results) {
    // Surface per-account failures without killing the whole run
    if (result.getStatus() !== 'OK') {
      failures++;
      Logger.log(`FAILED ${result.getCustomerId()}: ${result.getError()}`);
      continue;
    }

    // Guard: a crashed/odd thread can report OK but return nothing parseable
    const raw = result.getReturnValue();
    let s;
    try {
      s = JSON.parse(raw);
    } catch (e) {
      failures++;
      Logger.log(`FAILED ${result.getCustomerId()}: empty/invalid summary returned.`);
      continue;
    }

    topAdded += s.topAdded;
    topRemoved += s.topRemoved;
    lowAdded += s.lowAdded;
    lowRemoved += s.lowRemoved;
    Logger.log(
      `${s.accountName} (${s.customerId}) — ad groups: ${s.adGroups} | ` +
      `Top: qualifying ${s.topQualifying}, +${s.topAdded}/-${s.topRemoved} (${s.topUnchanged} kept) | ` +
      `Low: qualifying ${s.lowQualifying}, +${s.lowAdded}/-${s.lowRemoved} (${s.lowUnchanged} kept)`
    );
  }

  Logger.log('----------------------------------------');
  Logger.log(
    `Done. Accounts processed: ${results.length - failures}, failed: ${failures}. ` +
    `Top ROAS: +${topAdded}/-${topRemoved}. Low ROAS: +${lowAdded}/-${lowRemoved}.`
  );
}

// ---- Label management ------------------------------------------------------

/** Creates a label in the CURRENT child account if it doesn't exist. */
function ensureLabelExists(labelName, labelColor, description) {
  const existing = AdsApp.labels()
    .withCondition(`label.name = '${labelName}'`)
    .get();
  if (!existing.hasNext()) {
    AdsApp.createLabel(labelName, description, labelColor);
  }
}

// ---- Date helpers ----------------------------------------------------------

/** Returns { startDate, endDate } as yyyy-MM-dd strings in account timezone. */
function getDateRange(lookbackDays) {
  const tz = AdsApp.currentAccount().getTimeZone();
  const msPerDay = 24 * 60 * 60 * 1000;

  const end = new Date(Date.now() - 1 * msPerDay);                 // yesterday
  const start = new Date(Date.now() - lookbackDays * msPerDay);    // N days back

  return {
    startDate: Utilities.formatDate(start, tz, 'yyyy-MM-dd'),
    endDate: Utilities.formatDate(end, tz, 'yyyy-MM-dd'),
  };
}

// ---- Data collection -------------------------------------------------------

/**
 * Queries ad group totals and returns a map of
 * adGroupId -> { cost, value, conversions } so each keyword can be benchmarked
 * against the ad group EXCLUDING its own contribution.
 */
function buildAdGroupTotalsMap(startDate, endDate) {
  const totals = {};

  const query = `
    SELECT ad_group.id, metrics.cost_micros, metrics.conversions_value,
           metrics.conversions
    FROM ad_group
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND metrics.cost_micros > 0
      AND ad_group.status = 'ENABLED'
      AND campaign.status = 'ENABLED'`;

  const rows = AdsApp.search(query);
  while (rows.hasNext()) {
    const row = rows.next();
    totals[String(row.adGroup.id)] = {
      cost: Number(row.metrics.costMicros) / 1e6,        // micros -> currency
      value: Number(row.metrics.conversionsValue),
      conversions: Number(row.metrics.conversions),
    };
  }
  return totals;
}

/**
 * Queries keyword-level stats and classifies each keyword against the rest of
 * its ad group. Returns { top, low } — two Sets of keys ("adGroupId,criterionId")
 * for the keywords that pass the top / low qualification tests (see header).
 */
function classifyKeywords(startDate, endDate, adGroupTotals) {
  const top = new Set();
  const low = new Set();

  const query = `
    SELECT ad_group.id, ad_group_criterion.criterion_id,
           ad_group_criterion.keyword.text,
           metrics.conversions, metrics.conversions_value, metrics.cost_micros
    FROM keyword_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND metrics.cost_micros > 0
      AND ad_group_criterion.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND campaign.status = 'ENABLED'`;

  const rows = AdsApp.search(query);
  while (rows.hasNext()) {
    const row = rows.next();
    const adGroupId = String(row.adGroup.id);
    const agTotals = adGroupTotals[adGroupId];
    if (agTotals === undefined) continue;                // no ad group data -> skip

    // GAQL doesn't allow >= on metrics.conversions, so threshold is applied here
    const conversions = Number(row.metrics.conversions);
    if (conversions < CONFIG.MIN_CONVERSIONS) continue;

    const kwText = row.adGroupCriterion.keyword.text;
    const kwCost = Number(row.metrics.costMicros) / 1e6;
    const kwValue = Number(row.metrics.conversionsValue);
    const kwRoas = kwValue / kwCost;
    const key = `${adGroupId},${row.adGroupCriterion.criterionId}`;

    // Benchmark = the ad group EXCLUDING this keyword, so a dominant keyword
    // isn't compared against (mostly) itself. If the keyword is the only
    // spender in the ad group there are no peers to compare against -> skip.
    const peerCost = agTotals.cost - kwCost;
    const peerValue = agTotals.value - kwValue;
    const peerConversions = agTotals.conversions - conversions;
    if (peerCost <= 0) continue;
    const peerRoas = Math.max(peerValue, 0) / peerCost;

    // ---- Top side: keyword conservatively BEATS its peers ----
    // Gate on the keyword's OWN value per conversion — a top performer with no
    // real conversion value is a lead-gen artifact, not a win.
    if (CONFIG.MANAGE_TOP && kwValue / conversions > CONFIG.MIN_VALUE_PER_CONV) {
      // Lower-bound ROAS: shrink observed ROAS toward zero by Z / sqrt(conv).
      // Fewer conversions -> bigger discount -> bigger observed edge required.
      const lowerRoas =
        kwRoas * Math.max(1 - CONFIG.CONFIDENCE_Z / Math.sqrt(conversions), 0);
      const bar = peerRoas * CONFIG.BENCHMARK_MULTIPLIER;
      const passed = lowerRoas > bar;

      // Math trail — only for keywords in contention (raw ROAS above peers)
      if (kwRoas > peerRoas) {
        debugLog(
          `TOP ${passed ? 'PASS' : 'FAIL'} "${kwText}" — conv: ${conversions.toFixed(1)}, ` +
          `ROAS: ${kwRoas.toFixed(2)}, peerROAS: ${peerRoas.toFixed(2)}, ` +
          `lowerROAS: ${lowerRoas.toFixed(2)} vs bar: ${bar.toFixed(2)}`
        );
      }
      if (passed) top.add(key);
    }

    // ---- Low side: keyword conservatively TRAILS its peers ----
    // Gate on the PEERS' value per conversion, not the keyword's own. A keyword
    // burning spend at near-$0 value is exactly what we want to flag, but only
    // inside an ad group that actually tracks revenue (excludes lead-gen).
    if (
      CONFIG.MANAGE_LOW &&
      peerConversions > 0 &&
      peerValue / peerConversions > CONFIG.MIN_VALUE_PER_CONV
    ) {
      // Upper-bound ROAS: inflate observed ROAS by Z / sqrt(conv) — the benefit
      // of the doubt. Fewer conversions -> bigger inflation -> a keyword must
      // trail by a wider observed margin before we flag it as underperforming.
      const upperRoas = kwRoas * (1 + CONFIG.CONFIDENCE_Z / Math.sqrt(conversions));
      const bar =
        CONFIG.BENCHMARK_MULTIPLIER > 0
          ? peerRoas / CONFIG.BENCHMARK_MULTIPLIER
          : peerRoas;
      const passed = upperRoas < bar;

      // Math trail — only for keywords in contention (raw ROAS below peers)
      if (kwRoas < peerRoas) {
        debugLog(
          `LOW ${passed ? 'PASS' : 'FAIL'} "${kwText}" — conv: ${conversions.toFixed(1)}, ` +
          `ROAS: ${kwRoas.toFixed(2)}, peerROAS: ${peerRoas.toFixed(2)}, ` +
          `upperROAS: ${upperRoas.toFixed(2)} vs bar: ${bar.toFixed(2)}`
        );
      }
      if (passed) low.add(key);
    }
  }
  return { top, low };
}

/** Logs only when CONFIG.DEBUG is on. */
function debugLog(message) {
  if (CONFIG.DEBUG) {
    Logger.log(`[${AdsApp.currentAccount().getName()}] ${message}`);
  }
}

// ---- Label application / removal -------------------------------------------

/**
 * Iterates keywords that currently carry `labelName` in this account. Removes
 * the label from any keyword not in the qualifying set. Returns:
 *   { alreadyLabeled: Set of qualified+labeled keys, removed: count }
 */
function removeStaleLabels(qualifying, labelName) {
  const alreadyLabeled = new Set();
  let removed = 0;

  // The LabelNames selector THROWS if the label doesn't exist in this account
  // (e.g. first run, or Preview mode where createLabel isn't persisted).
  // No label = nothing can be labeled yet, so skip the sweep entirely.
  const labelCheck = AdsApp.labels()
    .withCondition(`label.name = '${labelName}'`)
    .get();
  if (!labelCheck.hasNext()) {
    return { alreadyLabeled, removed };
  }

  const labeledKeywords = AdsApp.keywords()
    .withCondition(`LabelNames CONTAINS_ANY ['${labelName}']`)
    .get();

  while (labeledKeywords.hasNext()) {
    const keyword = labeledKeywords.next();
    const key = `${keyword.getAdGroup().getId()},${keyword.getId()}`;

    if (qualifying.has(key)) {
      alreadyLabeled.add(key);                           // still qualifies
    } else {
      keyword.removeLabel(labelName);                    // no longer qualifies
      removed++;
    }
  }

  return { alreadyLabeled, removed };
}

/** Applies `labelName` to keywords identified by "adGroupId,criterionId" keys. */
function applyLabel(keys, labelName) {
  if (keys.length === 0) return;

  // Same guard as the sweep: in Preview mode the label was never persisted,
  // so applyLabel-by-name would throw. Skip (Preview still logs the counts).
  const labelCheck = AdsApp.labels()
    .withCondition(`label.name = '${labelName}'`)
    .get();
  if (!labelCheck.hasNext()) return;

  // withIds() accepts up to 10,000 [adGroupId, criterionId] pairs per selector
  const CHUNK_SIZE = 10000;

  for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
    const idPairs = keys
      .slice(i, i + CHUNK_SIZE)
      .map((key) => key.split(',').map(Number));         // -> [adGroupId, critId]

    const keywords = AdsApp.keywords().withIds(idPairs).get();
    while (keywords.hasNext()) {
      keywords.next().applyLabel(labelName);
    }
  }
}
