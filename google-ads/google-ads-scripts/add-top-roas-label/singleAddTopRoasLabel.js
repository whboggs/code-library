/**
 * Top ROAS Keyword Labeler — SINGLE ACCOUNT VERSION
 * -------------------------------------------------
 * Runs inside ONE Google Ads account. For the MCC version that processes
 * all child accounts in parallel, use top-roas-keyword-labeler-mcc.js.
 * Don't run both against the same account (harmless but redundant).
 *
 * Applies the label "Top ROAS" to keywords whose ROAS (Conv. Value / Cost)
 * MEANINGFULLY beats the rest of their ad group over the lookback window.
 *
 * Qualification test (all must pass):
 *   1. Keyword has >= MIN_CONVERSIONS conversions
 *   2. Keyword's avg value per conversion > MIN_VALUE_PER_CONV
 *      (filters lead-gen keywords with $0 or placeholder conversion values)
 *   3. Benchmark = ROAS of the ad group EXCLUDING the keyword itself
 *      (prevents a dominant keyword from being compared against itself)
 *   4. Keyword ROAS is discounted for statistical uncertainty:
 *        adjustedROAS = ROAS * (1 - Z / sqrt(conversions))
 *      Low-volume keywords need a bigger observed edge to qualify.
 *   5. adjustedROAS > benchmark * BENCHMARK_MULTIPLIER
 *
 * The label is kept current: keywords that no longer qualify have the
 * label removed on each run.
 *
 * Note on Preview mode: createLabel isn't persisted in Preview, so if the
 * label doesn't exist yet, apply/remove steps are safely skipped. Preview
 * still shows qualifying counts and debug math. The first LIVE run creates
 * the label and applies it.
 *
 * Schedule daily or weekly.
 */

// ---- Configuration ---------------------------------------------------------
const CONFIG = {
  LABEL_NAME: 'Top ROAS',        // Label to apply/remove
  LABEL_COLOR: '#22C55E',        // Tailwind green-500 — used if the label needs to be created
  LOOKBACK_DAYS: 90,             // Rolling window for the ROAS comparison
  MIN_CONVERSIONS: 30,           // Keyword must have >= this many conversions
  CONFIDENCE_Z: 1.0,             // Uncertainty discount (~68% one-sided). 0 = off
  BENCHMARK_MULTIPLIER: 1.0,     // Extra margin over peers (e.g. 1.25 = beat by 25%)
  MIN_VALUE_PER_CONV: 1,         // Skip keywords with Conv.Value/Conv <= this
                                 // (filters lead-gen: $0 or $1 placeholder values)
  DEBUG: true,                   // Log qualification math — only for keywords
                                 // whose raw ROAS is above their peer average
};

function main() {
  // Make sure the label exists in the account before we try to use it
  ensureLabelExists();

  // Build the rolling date window (ends yesterday to avoid partial-day data)
  const { startDate, endDate } = getDateRange(CONFIG.LOOKBACK_DAYS);

  // Step 1: Ad group totals used to build per-keyword "rest of ad group" benchmarks
  const adGroupTotals = buildAdGroupTotalsMap(startDate, endDate);
  Logger.log(`Collected totals for ${Object.keys(adGroupTotals).length} ad groups.`);

  // Step 2: Find qualifying keywords (see header for the full test)
  const qualifying = findQualifyingKeywords(startDate, endDate, adGroupTotals);
  Logger.log(`${qualifying.size} keywords currently qualify for "${CONFIG.LABEL_NAME}".`);

  // Step 3: Sweep currently-labeled keywords; remove label from any that
  // no longer qualify, and record which qualifiers are already labeled
  const sweep = removeStaleLabels(qualifying);
  Logger.log(`Removed label from ${sweep.removed} keywords that no longer qualify.`);

  // Step 4: Apply the label to qualifiers that don't have it yet
  const toAdd = [...qualifying].filter((key) => !sweep.alreadyLabeled.has(key));
  applyLabel(toAdd);

  Logger.log(`Done. Added: ${toAdd.length}, unchanged: ${sweep.alreadyLabeled.size}.`);
}

// ---- Label management ------------------------------------------------------

/** Creates the label if it doesn't already exist in the account. */
function ensureLabelExists() {
  const existing = AdsApp.labels()
    .withCondition(`label.name = '${CONFIG.LABEL_NAME}'`)
    .get();
  if (!existing.hasNext()) {
    AdsApp.createLabel(
      CONFIG.LABEL_NAME,
      'Keyword ROAS meaningfully beats rest of ad group (auto-managed by script)',
      CONFIG.LABEL_COLOR
    );
    Logger.log(`Created label "${CONFIG.LABEL_NAME}".`);
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
 * adGroupId -> { cost, value } so each keyword can be benchmarked against
 * the ad group EXCLUDING its own contribution.
 */
function buildAdGroupTotalsMap(startDate, endDate) {
  const totals = {};

  const query = `
    SELECT ad_group.id, metrics.cost_micros, metrics.conversions_value
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
    };
  }
  return totals;
}

/**
 * Queries keyword-level stats and returns a Set of keys ("adGroupId,criterionId")
 * for keywords that pass the full qualification test (see header).
 */
function findQualifyingKeywords(startDate, endDate, adGroupTotals) {
  const qualifying = new Set();

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

    // Real-revenue gate: average value per conversion must exceed the floor.
    // Lead-gen conversions with no value (0) or placeholder values ($1)
    // don't have meaningful ROAS, so skip them entirely.
    if (kwValue / conversions <= CONFIG.MIN_VALUE_PER_CONV) continue;

    const kwRoas = kwValue / kwCost;

    // Benchmark = ROAS of the ad group EXCLUDING this keyword, so a dominant
    // keyword isn't compared against (mostly) itself. If the keyword is the
    // only spender in the ad group there are no peers to beat -> skip.
    const peerCost = agTotals.cost - kwCost;
    const peerValue = agTotals.value - kwValue;
    if (peerCost <= 0) continue;
    const peerRoas = Math.max(peerValue, 0) / peerCost;

    // Uncertainty discount: shrink observed ROAS toward zero based on sample
    // size. Fewer conversions -> bigger discount -> bigger edge required.
    //   adjustedROAS = ROAS * (1 - Z / sqrt(conversions))
    const discount = 1 - CONFIG.CONFIDENCE_Z / Math.sqrt(conversions);
    const adjustedRoas = kwRoas * Math.max(discount, 0);

    const bar = peerRoas * CONFIG.BENCHMARK_MULTIPLIER;
    const passed = adjustedRoas > bar;

    // Math trail — only for keywords in contention (raw ROAS above peers),
    // so FAILs here always mean "beat the average but not meaningfully"
    if (kwRoas > peerRoas) {
      debugLog(
        `${passed ? 'PASS ' : 'FAIL '} "${kwText}" — conv: ${conversions.toFixed(1)}, ` +
        `ROAS: ${kwRoas.toFixed(2)}, peerROAS: ${peerRoas.toFixed(2)}, ` +
        `discount: ${((1 - Math.max(discount, 0)) * 100).toFixed(0)}%, ` +
        `adjROAS: ${adjustedRoas.toFixed(2)} vs bar: ${bar.toFixed(2)}`
      );
    }

    // Final test: conservative estimate must clear peers by the multiplier
    if (passed) {
      qualifying.add(`${adGroupId},${row.adGroupCriterion.criterionId}`);
    }
  }
  return qualifying;
}

// ---- Label application / removal -------------------------------------------

/**
 * Iterates keywords that currently carry the label. Removes the label from
 * any keyword not in the qualifying set. Returns:
 *   { alreadyLabeled: Set of qualified+labeled keys, removed: count }
 */
function removeStaleLabels(qualifying) {
  const alreadyLabeled = new Set();
  let removed = 0;

  // The LabelNames selector THROWS if the label doesn't exist in this account
  // (e.g. first run, or Preview mode where createLabel isn't persisted).
  // No label = nothing can be labeled yet, so skip the sweep entirely.
  const labelCheck = AdsApp.labels()
    .withCondition(`label.name = '${CONFIG.LABEL_NAME}'`)
    .get();
  if (!labelCheck.hasNext()) {
    return { alreadyLabeled, removed };
  }

  const labeledKeywords = AdsApp.keywords()
    .withCondition(`LabelNames CONTAINS_ANY ['${CONFIG.LABEL_NAME}']`)
    .get();

  while (labeledKeywords.hasNext()) {
    const keyword = labeledKeywords.next();
    const key = `${keyword.getAdGroup().getId()},${keyword.getId()}`;

    if (qualifying.has(key)) {
      alreadyLabeled.add(key);                           // still qualifies
    } else {
      keyword.removeLabel(CONFIG.LABEL_NAME);            // no longer qualifies
      removed++;
    }
  }

  return { alreadyLabeled, removed };
}

/** Applies the label to keywords identified by "adGroupId,criterionId" keys. */
function applyLabel(keys) {
  if (keys.length === 0) return;

  // Same guard as the sweep: in Preview mode the label was never persisted,
  // so applyLabel-by-name would throw. Skip (Preview still logs the counts).
  const labelCheck = AdsApp.labels()
    .withCondition(`label.name = '${CONFIG.LABEL_NAME}'`)
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
      keywords.next().applyLabel(CONFIG.LABEL_NAME);
    }
  }
}

/** Logs only when CONFIG.DEBUG is on. */
function debugLog(message) {
  if (CONFIG.DEBUG) {
    Logger.log(message);
  }
}
