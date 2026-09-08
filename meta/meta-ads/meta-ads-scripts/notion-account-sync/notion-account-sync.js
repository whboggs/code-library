/**
 * Notion Account Sync — META ADS VERSION
 * --------------------------------------
 * Standalone companion to the Google MCC sync. Pulls the LAST 14 DAYS of
 * Meta Ads spend + conversions for each account listed in the Notion
 * "Accounts" database and updates:
 *
 *   - "FB Conv"       <- conversions (see ACTION TYPES below)
 *   - "Facebook CPA"  <- spend / conversions (null if no conversions)
 *
 * FALLBACK WINDOW: if an account has fewer than 2 conversions (0 or 1) in
 * the primary 14-day window, the script re-pulls using a 30-day window
 * instead. The log notes when the fallback was used. If BOTH windows have
 * 0 conversions, FB Conv is set to 0 and Facebook CPA is cleared.
 *
 * HOW ROWS ARE MATCHED — Notion drives this script (opposite of the
 * Google version): it loops over Notion rows that have a value in the
 * "Meta CID" text property and calls the Meta Marketing API for each.
 * Rows with an empty Meta CID are simply skipped (and listed at the end),
 * so leaving the cell blank IS the ignore list — no separate exclude
 * config needed.
 *
 * ACTION TYPES — IMPORTANT, READ THIS:
 * Meta splits conversion-type events across TWO insight arrays:
 *   - "actions"      -> lead, omni_purchase, link_click, pixel customs, ...
 *   - "conversions"  -> standard-event rollups such as
 *                       submit_application_website, contact_website, ...
 * The script merges both into one lookup and sums the names listed in
 * CONFIG.ACTION_TYPES (or an account's ACTION_TYPE_OVERRIDES entry).
 * Some names are rollups of others (e.g. submit_application_total vs
 * submit_application_website) — never list both or you DOUBLE COUNT.
 * VERIFY the defaults against Ads Manager for 2-3 accounts before
 * trusting the numbers. Use debugActionTypes() below to see exactly what
 * an account reports.
 *
 * CPA IS ACCOUNT-WIDE: spend from every campaign in the window is divided
 * by the summed conversions, so a campaign that spent with no results
 * raises the CPA above any single campaign's "cost per result" row in
 * Ads Manager. Compare against the account-level cost per lead, not a
 * campaign row.
 *
 * It NEVER touches: Google Conv, Google CPA, Last Analysis, Next Analysis
 * Due, tCPA, Notes, Tags, or any formula columns. Never creates/deletes rows.
 *
 * REQUIRES: a text property named "Meta CID" on the Accounts database
 * containing each row's Meta ad account ID. With or without the "act_"
 * prefix — "act_1234567890" and "1234567890" both work.
 *
 * SETUP — see README.md for the Meta System User token walkthrough.
 * Short version:
 *   1. Meta app (developers.facebook.com, Business type)
 *   2. Business Settings -> System Users -> create/generate token with
 *      ads_read, assigned to the client ad accounts, no expiration
 *   3. Paste token into CONFIG.META_ACCESS_TOKEN
 *   4. Add "Meta CID" column in Notion, fill in act IDs
 *   5. Reuse the same Notion integration secret as the Google script
 *
 * SECURITY NOTE: this token grants READ access to client Meta ad
 * accounts and sits in plaintext here. Prefer running this in Google
 * Apps Script (script.google.com) rather than the Ads account's Scripts
 * section — same code works in both, but Apps Script keeps the token
 * out of reach of anyone with Google Ads access. NEVER commit real
 * tokens to this repo — keep the placeholders below and fill them in
 * only inside the Apps Script editor.
 *
 * Schedule: daily (recommended) or weekly.
 */

// ---- Configuration ---------------------------------------------------------
const CONFIG = {
  // Notion (same database + integration as the Google sync)
  NOTION_TOKEN: 'PASTE_NOTION_TOKEN',                   // ntn_... integration secret
  NOTION_DATABASE_ID: 'PASTE_NOTION_DATABASE_ID',       // Accounts database ID
  NOTION_VERSION: '2022-06-28',                         // API version header
  NOTION_WRITE_DELAY_MS: 350,                           // Stay under ~3 req/sec
  META_CID_PROPERTY: 'Meta CID',                        // Text property holding the act ID

  // Meta Marketing API
  META_ACCESS_TOKEN: 'PASTE_META_SYSTEM_USER_TOKEN',    // System User token with ads_read
  META_API_VERSION: 'v23.0',                            // Bump as Meta deprecates versions

  // Which action/conversion types count as a "conversion". Summed per account.
  // WARNING: some types are rollups of others — don't mix a rollup with
  // its components or you'll double count. Verify vs Ads Manager!
  ACTION_TYPES: ['lead', 'omni_purchase'],

  // Per-account overrides, keyed by act ID digits (no "act_" prefix).
  // An account listed here uses THIS list instead of ACTION_TYPES.
  // Example — an account whose KPI is the SubmitApplication standard event.
  // Meta reports it in the `conversions` array as submit_application_website,
  // not in `actions`:
  //   '1234567890': ['submit_application_website'],
  ACTION_TYPE_OVERRIDES: {
  },

  // Date windows (rolling, ending yesterday)
  LOOKBACK_DAYS: 14,             // Primary window
  FALLBACK_LOOKBACK_DAYS: 30,    // Used when the primary window has too few conversions
  FALLBACK_BELOW_CONVERSIONS: 2, // Fall back when primary conversions are below this (0 or 1)

  // Timezone for computing the date window. Kept as a config string so the
  // script has no Google Ads dependency and runs in Apps Script unchanged.
  TIMEZONE: 'America/Denver',
};

// ---- Entry point -----------------------------------------------------------

function main() {
  // Fetch all Notion rows once; only rows with a Meta CID get synced
  const rows = fetchNotionRows();
  const withCid = rows.filter((r) => r.metaCid);
  const withoutCid = rows.filter((r) => !r.metaCid);
  Logger.log(`Loaded ${rows.length} rows from Notion (${withCid.length} with a Meta CID).`);

  const primary = getDateRange(CONFIG.LOOKBACK_DAYS);
  const fallback = getDateRange(CONFIG.FALLBACK_LOOKBACK_DAYS);
  Logger.log(`Stats window: ${primary.startDate} to ${primary.endDate} (falling back to ${CONFIG.FALLBACK_LOOKBACK_DAYS}d when fewer than ${CONFIG.FALLBACK_BELOW_CONVERSIONS} conversions).`);

  let updated = 0;
  let failed = 0;

  for (const row of withCid) {
    // Which action types count for this account (override or default)
    const actionTypes = CONFIG.ACTION_TYPE_OVERRIDES[row.metaCid] || CONFIG.ACTION_TYPES;

    // Primary window first; fall back to the longer window when the primary
    // window has too few conversions to give a meaningful CPA (0 or 1)
    let stats = getMetaStats(row.metaCid, primary, actionTypes);
    let windowUsed = CONFIG.LOOKBACK_DAYS;
    if (stats && stats.conversions < CONFIG.FALLBACK_BELOW_CONVERSIONS) {
      stats = getMetaStats(row.metaCid, fallback, actionTypes);
      windowUsed = CONFIG.FALLBACK_LOOKBACK_DAYS;
    }

    if (stats === null) {
      // API error already logged inside getMetaStats — count and move on
      failed++;
      continue;
    }

    // CPA is null when there are no conversions in EITHER window (clears
    // the cell rather than writing a misleading 0)
    const cpa = stats.conversions > 0 ? stats.spend / stats.conversions : null;

    const ok = updateNotionRow(row.pageId, stats.conversions, cpa);
    if (ok) {
      updated++;
      // e.g. Updated values for act_1234567890 The Boat Shop CPA: $42.10, Conversions: 18 (30d window)
      Logger.log(
        `Updated values for act_${row.metaCid} ${row.title} ` +
        `CPA: ${cpa === null ? 'n/a' : '$' + cpa.toFixed(2)}, ` +
        `Conversions: ${stats.conversions.toFixed(1)}` +
        (windowUsed !== CONFIG.LOOKBACK_DAYS ? ` (${windowUsed}d window)` : '')
      );
    } else {
      failed++;
    }

    Utilities.sleep(CONFIG.NOTION_WRITE_DELAY_MS);       // Notion rate limit
  }

  Logger.log('----------------------------------------');
  Logger.log(`Done. Updated: ${updated}, no Meta CID: ${withoutCid.length}, failed: ${failed}.`);

  // Rows skipped for having no Meta CID — fill in the cell to include them
  if (withoutCid.length > 0) {
    Logger.log('');
    Logger.log(`ROWS WITHOUT A META CID (${withoutCid.length}) — skipped:`);
    for (const row of withoutCid) {
      Logger.log(`  ${row.title}`);
    }
    Logger.log(`Add the act ID to each row's "${CONFIG.META_CID_PROPERTY}" cell to sync it.`);
  }
}

// ---- Helpers ---------------------------------------------------------------

/** Strips the act_ prefix and any non-digits: "act_123-456" -> "123456". */
function normalizeActId(id) {
  return String(id || '').replace(/\D/g, '');
}

/** Returns { startDate, endDate } as yyyy-MM-dd strings in CONFIG.TIMEZONE. */
function getDateRange(lookbackDays) {
  const msPerDay = 24 * 60 * 60 * 1000;

  const end = new Date(Date.now() - 1 * msPerDay);                 // yesterday
  const start = new Date(Date.now() - lookbackDays * msPerDay);    // N days back

  return {
    startDate: Utilities.formatDate(start, CONFIG.TIMEZONE, 'yyyy-MM-dd'),
    endDate: Utilities.formatDate(end, CONFIG.TIMEZONE, 'yyyy-MM-dd'),
  };
}

// ---- Meta Marketing API ----------------------------------------------------

/**
 * Pulls account-level spend + conversions for one ad account and window.
 * Meta splits conversion-type events across TWO arrays: `actions` (lead,
 * omni_purchase, link_click, ...) and `conversions` (standard-event
 * rollups like submit_application_website, contact_website, ...). Both
 * are merged into one name -> value map, and "conversions" = sum of the
 * entries whose name is in actionTypes.
 * Returns { spend, conversions }, or null on API error (already logged).
 */
function getMetaStats(actDigits, range, actionTypes) {
  // time_range is a JSON object passed as a URL parameter
  const timeRange = encodeURIComponent(JSON.stringify({
    since: range.startDate,
    until: range.endDate,
  }));

  const url = `https://graph.facebook.com/${CONFIG.META_API_VERSION}` +
    `/act_${actDigits}/insights` +
    `?level=account&fields=spend,actions,conversions` +
    `&time_range=${timeRange}` +
    `&access_token=${encodeURIComponent(CONFIG.META_ACCESS_TOKEN)}`;

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

  if (response.getResponseCode() !== 200) {
    Logger.log(`META ERROR (${response.getResponseCode()}) for act_${actDigits}: ${response.getContentText()}`);
    return null;
  }

  const data = JSON.parse(response.getContentText());

  // No delivery in the window -> Meta returns an empty data array
  if (!data.data || data.data.length === 0) {
    return { spend: 0, conversions: 0 };
  }

  const insights = data.data[0];
  const spend = Number(insights.spend || 0);

  // Merge both arrays into one lookup: action_type -> value. If a name ever
  // appears in both, the `conversions` entry wins (no double count).
  const byType = {};
  for (const entry of (insights.actions || []).concat(insights.conversions || [])) {
    byType[entry.action_type] = Number(entry.value || 0);
  }

  // Sum only the configured types
  let conversions = 0;
  for (const type of actionTypes) {
    conversions += byType[type] || 0;
  }

  return { spend, conversions };
}

/**
 * DEBUG ONLY — run this by itself from the Apps Script editor. Logs every
 * `actions` and `conversions` entry Meta reports for one account over the
 * last 30 days so you can find the exact name to put in ACTION_TYPES or
 * ACTION_TYPE_OVERRIDES. Writes nothing to Notion.
 */
function debugActionTypes() {
  const actDigits = '1234567890';                          // account to inspect (digits only)
  const range = getDateRange(30);
  const timeRange = encodeURIComponent(JSON.stringify({ since: range.startDate, until: range.endDate }));
  const url = `https://graph.facebook.com/${CONFIG.META_API_VERSION}/act_${actDigits}/insights` +
    `?level=account&fields=spend,actions,conversions&time_range=${timeRange}` +
    `&access_token=${encodeURIComponent(CONFIG.META_ACCESS_TOKEN)}`;
  const data = JSON.parse(UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText());
  const row = (data.data && data.data[0]) || {};
  Logger.log(`spend = ${row.spend || 0}`);
  Logger.log('--- actions ---');
  for (const a of row.actions || []) Logger.log(`${a.action_type} = ${a.value}`);       // one line per action type
  Logger.log('--- conversions ---');
  for (const c of row.conversions || []) Logger.log(`${c.action_type} = ${c.value}`);   // one line per conversion type
}

// ---- Notion API ------------------------------------------------------------

/** Shared headers for all Notion requests. */
function notionHeaders() {
  return {
    'Authorization': `Bearer ${CONFIG.NOTION_TOKEN}`,
    'Notion-Version': CONFIG.NOTION_VERSION,
  };
}

/** Concatenates a Notion rich_text/title array into a plain string. */
function plainText(parts) {
  return (parts || []).map((t) => t.plain_text).join('').trim();
}

/**
 * Queries the full Accounts database (paginated) and returns an array of
 * { pageId, title, metaCid } — metaCid is digits-only, '' when empty.
 */
function fetchNotionRows() {
  const rows = [];
  let cursor = null;

  do {
    const payload = { page_size: 100 };
    if (cursor) payload.start_cursor = cursor;

    const response = UrlFetchApp.fetch(
      `https://api.notion.com/v1/databases/${CONFIG.NOTION_DATABASE_ID}/query`,
      {
        method: 'post',
        contentType: 'application/json',
        headers: notionHeaders(),
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      }
    );

    if (response.getResponseCode() !== 200) {
      // Hard stop: without the row list nothing downstream can work
      throw new Error(`Notion query failed (${response.getResponseCode()}): ${response.getContentText()}`);
    }

    const data = JSON.parse(response.getContentText());

    for (const page of data.results) {
      // Title property is named "Account"
      const title = plainText(page.properties['Account'].title);

      // Meta CID property may not exist on older rows -> guard the access
      const cidProp = page.properties[CONFIG.META_CID_PROPERTY];
      const metaCid = normalizeActId(cidProp ? plainText(cidProp.rich_text) : '');

      rows.push({ pageId: page.id, title, metaCid });
    }

    cursor = data.has_more ? data.next_cursor : null;
    if (cursor) Utilities.sleep(CONFIG.NOTION_WRITE_DELAY_MS);
  } while (cursor);

  return rows;
}

/**
 * PATCHes ONLY "FB Conv" and "Facebook CPA" on the given Notion page.
 * All other properties are untouched. Returns true on success.
 */
function updateNotionRow(pageId, conversions, cpa) {
  const response = UrlFetchApp.fetch(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      method: 'patch',
      contentType: 'application/json',
      headers: notionHeaders(),
      payload: JSON.stringify({
        properties: {
          'FB Conv': { number: Math.round(conversions * 10) / 10 },
          'Facebook CPA': { number: cpa === null ? null : Math.round(cpa * 100) / 100 },
        },
      }),
      muteHttpExceptions: true,
    }
  );

  if (response.getResponseCode() !== 200) {
    Logger.log(`NOTION ERROR (${response.getResponseCode()}) updating page ${pageId}: ${response.getContentText()}`);
    return false;
  }
  return true;
}
