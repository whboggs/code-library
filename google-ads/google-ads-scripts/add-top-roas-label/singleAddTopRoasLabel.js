/**
 * Top ROAS Keyword Labeler
 * ------------------------
 * Applies the label "Top ROAS" to keywords whose ROAS (Conv. Value / Cost)
 * beats their ad group's average ROAS over the lookback window, and only
 * when the keyword has at least MIN_CONVERSIONS conversions.
 *
 * The label is kept current: keywords that no longer qualify have the
 * label removed on each run.
 *
 * Runtime: single account. Schedule daily or weekly.
 */

// ---- Configuration ---------------------------------------------------------
const CONFIG = {
  LABEL_NAME: 'Top ROAS',        // Label to apply/remove
  LABEL_COLOR: '#22C55E',        // Tailwind green-500 — used if the label needs to be created
  LOOKBACK_DAYS: 90,             // Rolling window for the ROAS comparison
  MIN_CONVERSIONS: 30,           // Keyword must have >= this many conversions
};

function main() {
  // Make sure the label exists in the account before we try to use it
  ensureLabelExists();

  // Build the rolling date window (ends yesterday to avoid partial-day data)
  const { startDate, endDate } = getDateRange(CONFIG.LOOKBACK_DAYS);

  // Step 1: Ad group ROAS benchmarks (adGroupId -> avg ROAS)
  const adGroupRoas = buildAdGroupRoasMap(startDate, endDate);
  Logger.log(`Computed ROAS benchmarks for ${Object.keys(adGroupRoas).length} ad groups.`);

  // Step 2: Find qualifying keywords (>= 30 conv AND ROAS > ad group avg)
  const qualifying = findQualifyingKeywords(startDate, endDate, adGroupRoas);
  Logger.log(`${qualifying.size} keywords currently qualify for "${CONFIG.LABEL_NAME}".`);

  // Step 3: Sweep currently-labeled keywords; remove label from any that
  // no longer qualify, and record which qualifiers are already labeled
  const alreadyLabeled = removeStaleLabels(qualifying);

  // Step 4: Apply the label to qualifiers that don't have it yet
  const toAdd = [...qualifying].filter((key) => !alreadyLabeled.has(key));
  applyLabel(toAdd);

  Logger.log(`Done. Added: ${toAdd.length}, already labeled: ${alreadyLabeled.size}.`);
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
      'Keyword ROAS beats ad group average (auto-managed by script)',
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
 * Queries ad group totals and returns a map of adGroupId -> average ROAS
 * (total conv value / total cost). Ad groups with zero cost are skipped.
 */
function buildAdGroupRoasMap(startDate, endDate) {
  const roasMap = {};

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
    const cost = Number(row.metrics.costMicros) / 1e6;   // micros -> currency
    const convValue = Number(row.metrics.conversionsValue);
    if (cost > 0) {
      roasMap[String(row.adGroup.id)] = convValue / cost;
    }
  }
  return roasMap;
}

/**
 * Queries keyword-level stats and returns a Set of keys ("adGroupId,criterionId")
 * for keywords that meet the conversion threshold AND beat their ad group ROAS.
 */
function findQualifyingKeywords(startDate, endDate, adGroupRoas) {
  const qualifying = new Set();

  const query = `
    SELECT ad_group.id, ad_group_criterion.criterion_id,
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
    const benchmark = adGroupRoas[adGroupId];
    if (benchmark === undefined) continue;               // no benchmark -> skip

    // GAQL doesn't allow >= on metrics.conversions, so threshold is applied here
    if (Number(row.metrics.conversions) < CONFIG.MIN_CONVERSIONS) continue;

    const cost = Number(row.metrics.costMicros) / 1e6;
    const keywordRoas = Number(row.metrics.conversionsValue) / cost;

    // Strictly greater than the ad group average
    if (keywordRoas > benchmark) {
      qualifying.add(`${adGroupId},${row.adGroupCriterion.criterionId}`);
    }
  }
  return qualifying;
}

// ---- Label application / removal -------------------------------------------

/**
 * Iterates keywords that currently carry the label. Removes the label from
 * any keyword not in the qualifying set. Returns a Set of keys that are
 * qualified AND already labeled (so we don't re-apply).
 */
function removeStaleLabels(qualifying) {
  const alreadyLabeled = new Set();
  let removed = 0;

  const labeledKeywords = AdsApp.keywords()
    .withCondition(`LabelNames CONTAINS_ANY ['${CONFIG.LABEL_NAME}']`)
    .get();

  while (labeledKeywords.hasNext()) {
    const keyword = labeledKeywords.next();
    const key = `${keyword.getAdGroup().getId()},${keyword.getId()}`;

    if (qualifying.has(key)) {
      alreadyLabeled.add(key);                           // still qualifies
    } else {
      keyword.removeLabel(CONFIG.LABEL_NAME);            // fell below average
      removed++;
    }
  }

  Logger.log(`Removed label from ${removed} keywords that no longer qualify.`);
  return alreadyLabeled;
}

/** Applies the label to keywords identified by "adGroupId,criterionId" keys. */
function applyLabel(keys) {
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
