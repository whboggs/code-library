/**
 * Notion Account Sync — MCC VERSION (CID matching)
 * ------------------------------------------------
 * Runs from a MANAGER (MCC) account. For every child account, pulls the
 * LAST 14 DAYS of Google Ads conversions and CPA, then updates the matching
 * row in the Notion "Accounts" database:
 *
 *   - "Google Conv"  <- conversions (last 14 days, ending yesterday)
 *   - "Google CPA"   <- cost / conversions (null if no conversions)
 *
 * FALLBACK WINDOW: if an account has fewer than 2 conversions (0 or 1) in
 * the primary 14-day window, the script re-pulls using a 30-day window
 * instead, so slower accounts still report a meaningful CPA. The log notes
 * when the fallback window was used. If BOTH windows have 0 conversions,
 * Google Conv is set to 0 and Google CPA is cleared.
 *
 * ROW MATCHING (by customer ID, not name):
 *   Rows are matched on the "Google CID" text property, so Notion row
 *   titles and Ads account names can be anything you like.
 *
 *   BOOTSTRAP: if an account's CID isn't found in any row, the script
 *   falls back to a one-time name match — if the account name matches a
 *   row title (case-insensitive) AND that row's CID cell is EMPTY, the
 *   script writes the CID into the row and proceeds. Rows that can't be
 *   matched either way are logged; paste their CID in manually once.
 *
 *   A name match against a row that already has a DIFFERENT CID is
 *   treated as a conflict and skipped (never overwrites an existing CID).
 *
 * It NEVER touches: Last Analysis, Next Analysis Due, FB Conv, Facebook CPA,
 * tCPA, Notes, Tags, or any formula columns. Never creates or deletes rows.
 *
 * REQUIRES: a text property named "Google CID" on the Accounts database
 * (see CONFIG.CID_PROPERTY).
 *
 * Accounts are processed SERIALLY (not executeInParallel) on purpose:
 * stats gathering is one query per account, and serial execution keeps
 * all Notion writes in one thread so the ~3 req/sec rate limit is easy
 * to respect with a simple sleep.
 *
 * SETUP (one time):
 *   1. Create an internal integration at notion.so/my-integrations
 *   2. Share the Accounts database with that integration
 *      (database page -> ... menu -> Connections -> your integration)
 *   3. Add a text property named "Google CID" to the database
 *   4. Paste the integration secret into CONFIG.NOTION_TOKEN below
 *
 * SECURITY NOTE: the token is stored in plaintext in this script and is
 * readable by anyone with Scripts access on this manager account. Scope
 * the integration to ONLY this database. NEVER commit a real token to
 * this repo — keep the placeholders below and fill them in only inside
 * the Google Ads Scripts editor.
 *
 * Schedule: daily (recommended) or weekly.
 */

// ---- Configuration ---------------------------------------------------------
const CONFIG = {
  // Notion
  NOTION_TOKEN: 'PASTE_NOTION_TOKEN',                   // ntn_... integration secret
  NOTION_DATABASE_ID: 'PASTE_NOTION_DATABASE_ID',       // Accounts database ID
  NOTION_VERSION: '2022-06-28',                         // API version header
  NOTION_WRITE_DELAY_MS: 350,                           // Stay under ~3 req/sec
  CID_PROPERTY: 'Google CID',                           // Text property holding the customer ID

  // Google Ads
  LOOKBACK_DAYS: 14,             // Primary rolling window, ends yesterday
  FALLBACK_LOOKBACK_DAYS: 30,    // Used when the primary window has too few conversions
  FALLBACK_BELOW_CONVERSIONS: 2, // Fall back when primary conversions are below this (0 or 1)

  // CIDs to skip entirely — never synced, never shown in the "not found"
  // list. Use for test accounts, churned clients still linked to the MCC,
  // etc. Format doesn't matter: '123-456-7890' and '1234567890' both work.
  EXCLUDE_CIDS: [
    // '123-456-7890',
    // '234-567-8901',
  ],
};

// ---- Entry point -----------------------------------------------------------

function main() {
  // Fetch all Notion rows once up front, indexed by CID and by title
  const rows = fetchNotionRows();
  Logger.log(`Loaded ${rows.all.length} rows from Notion (${Object.keys(rows.byCid).length} with a CID).`);

  const primary = getDateRange(CONFIG.LOOKBACK_DAYS);
  const fallback = getDateRange(CONFIG.FALLBACK_LOOKBACK_DAYS);
  Logger.log(`Stats window: ${primary.startDate} to ${primary.endDate} (falling back to ${CONFIG.FALLBACK_LOOKBACK_DAYS}d when fewer than ${CONFIG.FALLBACK_BELOW_CONVERSIONS} conversions).`);

  let updated = 0;
  let bootstrapped = 0;
  let excluded = 0;
  let failed = 0;
  const unmatchedAccounts = [];                          // collected for end-of-run list

  // Normalize the exclude list once for digits-only comparison
  const excludeSet = new Set(CONFIG.EXCLUDE_CIDS.map(normalizeCid));

  // Process child accounts one at a time
  const accounts = AdsManagerApp.accounts().get();
  while (accounts.hasNext()) {
    const account = accounts.next();

    const adsName = account.getName();
    const cid = normalizeCid(account.getCustomerId());   // "123-456-7890" -> "1234567890"

    // Ignore list: skip entirely — no sync, no "not found" entry
    if (excludeSet.has(cid)) {
      excluded++;
      continue;
    }

    AdsManagerApp.select(account);                       // switch context

    // Primary match: by CID
    let row = rows.byCid[cid];

    // Bootstrap fallback: name match against a row with an EMPTY CID cell
    if (!row) {
      const nameMatch = rows.byName[adsName.trim().toLowerCase()];
      if (nameMatch && !nameMatch.cid) {
        // Write the CID into the row so future runs match directly
        const wrote = writeCidToRow(nameMatch.pageId, account.getCustomerId());
        if (wrote) {
          Logger.log(`BOOTSTRAPPED: wrote CID ${account.getCustomerId()} to row "${nameMatch.title}".`);
          bootstrapped++;
          row = nameMatch;
        }
        Utilities.sleep(CONFIG.NOTION_WRITE_DELAY_MS);
      } else if (nameMatch && nameMatch.cid) {
        // Same name, different CID already present — never overwrite
        Logger.log(`CONFLICT: "${adsName}" name-matches row "${nameMatch.title}" but that row has CID ${nameMatch.cid}. Skipped.`);
      }
    }

    if (!row) {
      // No CID match and no usable name match — collect for the end-of-run list
      unmatchedAccounts.push({ name: adsName, cid: account.getCustomerId() });
      continue;
    }

    // Primary window first; fall back to the longer window when the primary
    // window has too few conversions to give a meaningful CPA (0 or 1)
    let stats = getAccountStats(primary.startDate, primary.endDate);
    let windowUsed = CONFIG.LOOKBACK_DAYS;
    if (stats.conversions < CONFIG.FALLBACK_BELOW_CONVERSIONS) {
      stats = getAccountStats(fallback.startDate, fallback.endDate);
      windowUsed = CONFIG.FALLBACK_LOOKBACK_DAYS;
    }

    // CPA is null when there are no conversions in EITHER window (clears the
    // cell in Notion rather than writing a misleading 0)
    const cpa = stats.conversions > 0 ? stats.cost / stats.conversions : null;

    const ok = updateNotionRow(row.pageId, stats.conversions, cpa);
    if (ok) {
      updated++;
      // e.g. Updated values for 123-456-7890 The Boat Shop CPA: $42.10, Conversions: 18.5 (30d window)
      Logger.log(
        `Updated values for ${account.getCustomerId()} ${adsName} ` +
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
  Logger.log(`Done. Updated: ${updated}, CIDs bootstrapped: ${bootstrapped}, unmatched: ${unmatchedAccounts.length}, excluded: ${excluded}, failed: ${failed}.`);

  // End-of-run list of every account with no Notion row — paste each CID
  // into the "Google CID" cell of its row (or create the row) to fix
  if (unmatchedAccounts.length > 0) {
    Logger.log('');
    Logger.log(`ACCOUNTS NOT FOUND IN NOTION (${unmatchedAccounts.length}):`);
    for (const acct of unmatchedAccounts) {
      Logger.log(`  ${acct.cid}  ${acct.name}`);
    }
    Logger.log(`Paste each CID into the "${CONFIG.CID_PROPERTY}" cell of its Notion row.`);
  }
}

// ---- Helpers ---------------------------------------------------------------

/** Strips everything but digits: "123-456-7890" -> "1234567890". */
function normalizeCid(cid) {
  return String(cid || '').replace(/\D/g, '');
}

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

// ---- Google Ads data -------------------------------------------------------

/** Pulls account-level conversions and cost for the CURRENT child account. */
function getAccountStats(startDate, endDate) {
  const query = `
    SELECT metrics.conversions, metrics.cost_micros
    FROM customer
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'`;

  let conversions = 0;
  let cost = 0;

  const rows = AdsApp.search(query);
  while (rows.hasNext()) {
    const row = rows.next();
    conversions += Number(row.metrics.conversions);
    cost += Number(row.metrics.costMicros) / 1e6;        // micros -> currency
  }
  return { conversions, cost };
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
 * Queries the full Accounts database (paginated) and returns:
 *   {
 *     all:    [{ pageId, title, cid }],
 *     byCid:  { normalizedCid -> row },
 *     byName: { lowercaseTitle -> row },
 *   }
 */
function fetchNotionRows() {
  const all = [];
  const byCid = {};
  const byName = {};
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
      // Hard stop: without the row map nothing downstream can work
      throw new Error(`Notion query failed (${response.getResponseCode()}): ${response.getContentText()}`);
    }

    const data = JSON.parse(response.getContentText());

    for (const page of data.results) {
      // Title property is named "Account"
      const title = plainText(page.properties['Account'].title);

      // CID property may not exist yet on older rows -> guard the access
      const cidProp = page.properties[CONFIG.CID_PROPERTY];
      const cid = normalizeCid(cidProp ? plainText(cidProp.rich_text) : '');

      const row = { pageId: page.id, title, cid };
      all.push(row);
      if (cid) byCid[cid] = row;
      if (title) byName[title.toLowerCase()] = row;
    }

    cursor = data.has_more ? data.next_cursor : null;
    if (cursor) Utilities.sleep(CONFIG.NOTION_WRITE_DELAY_MS);
  } while (cursor);

  return { all, byCid, byName };
}

/** Writes the customer ID (formatted "123-456-7890") into a row's CID cell. */
function writeCidToRow(pageId, formattedCid) {
  const response = UrlFetchApp.fetch(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      method: 'patch',
      contentType: 'application/json',
      headers: notionHeaders(),
      payload: JSON.stringify({
        properties: {
          [CONFIG.CID_PROPERTY]: {
            rich_text: [{ text: { content: String(formattedCid) } }],
          },
        },
      }),
      muteHttpExceptions: true,
    }
  );

  if (response.getResponseCode() !== 200) {
    Logger.log(`NOTION ERROR (${response.getResponseCode()}) writing CID to page ${pageId}: ${response.getContentText()}`);
    return false;
  }
  return true;
}

/**
 * PATCHes ONLY "Google Conv" and "Google CPA" on the given Notion page.
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
          'Google Conv': { number: Math.round(conversions * 10) / 10 },
          'Google CPA': { number: cpa === null ? null : Math.round(cpa * 100) / 100 },
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
