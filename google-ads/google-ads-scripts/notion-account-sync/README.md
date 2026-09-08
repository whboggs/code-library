# Notion Account Sync — Google Ads (MCC)

A Google Ads Script that runs at the **manager (MCC) level**, pulls the **last 14 days** of conversions and cost for every child account, and writes two columns back to the matching row in a Notion "Accounts" database:

- **`Google Conv`** — conversions for the window
- **`Google CPA`** — cost ÷ conversions (cleared when there are no conversions)

Companion to the [Meta Ads sync](../../../meta/meta-ads-scripts/notion-account-sync/), which fills `FB Conv` and `Facebook CPA` on the same database.

## What it does

On each run:

1. Queries the Notion Accounts database (paginated) and indexes every row by its `Google CID` and by its title
2. Iterates every child account under the MCC, skipping any CID in `EXCLUDE_CIDS`
3. Matches each account to a row by CID; if none, tries a one-time name match (see *Row matching*)
4. Pulls account-level conversions and cost for the primary 14-day window
5. If the window has **fewer than 2 conversions** (0 or 1), re-pulls a 30-day window instead and notes it in the log
6. PATCHes only `Google Conv` and `Google CPA` on the Notion page
7. Logs one line per account plus a list of accounts with no Notion row

It never touches Last Analysis, Next Analysis Due, FB Conv, Facebook CPA, tCPA, Notes, Tags, or formula columns, and never creates or deletes rows.

## Row matching

Rows are matched on the **`Google CID`** text property, so Notion titles and Ads account names can differ freely.

**Bootstrap.** If an account's CID is not found in any row, the script tries a one-time name match. If the account name equals a row title (case-insensitive) *and* that row's CID cell is empty, the script writes the CID into the row and proceeds. Future runs then match directly.

**Conflicts.** A name match against a row that already holds a *different* CID is logged as a conflict and skipped. The script never overwrites an existing CID.

**Unmatched.** Accounts that match neither way are listed at the end of the log with their CID. Paste each into the `Google CID` cell of its row once and the next run picks it up.

## Prerequisites

### Notion

- A database with a title property named **`Account`**
- A text property named **`Google CID`**
- Number properties named **`Google Conv`** and **`Google CPA`**
- An internal integration (notion.so/my-integrations) shared with the database via the database page's **... → Connections** menu

### Google Ads

- Access to a manager account that links every client account you want synced
- Scripts access on that manager account

## Installation

1. In the **manager account**, go to **Tools → Bulk actions → Scripts** and create a new script
2. Paste the contents of `notion-account-sync.js`
3. Fill in `NOTION_TOKEN` and `NOTION_DATABASE_ID` in `CONFIG`
4. Add any test or churned accounts to `EXCLUDE_CIDS`
5. Authorize the script and run it once with **Preview** to check the log
6. Run it for real, then verify two or three rows in Notion against the Ads UI
7. Schedule it daily (recommended) or weekly

## Configuration

| Key | Default | Purpose |
|---|---|---|
| `CID_PROPERTY` | `Google CID` | Text property that holds each row's customer ID |
| `LOOKBACK_DAYS` | `14` | Primary window (ending yesterday) |
| `FALLBACK_LOOKBACK_DAYS` | `30` | Window used when the primary has too few conversions |
| `FALLBACK_BELOW_CONVERSIONS` | `2` | Fall back when primary conversions are below this |
| `EXCLUDE_CIDS` | `[]` | Accounts to skip entirely — never synced, never listed as unmatched |
| `NOTION_WRITE_DELAY_MS` | `350` | Pause between Notion writes to stay under the rate limit |

## Security

The Notion token sits in plaintext in the script and is readable by anyone with Scripts access on the manager account. Scope the integration to only this database. **Never commit a real token to this repo** — the file in this folder ships with placeholders.

## Troubleshooting

- **`Notion query failed (401)`** — the token is missing, still a placeholder, or the integration was not shared with the database.
- **An account shows up under `ACCOUNTS NOT FOUND IN NOTION`** — its CID is in no row and its name does not match an empty-CID row. Paste the CID into the right row's `Google CID` cell.
- **`CONFLICT` in the log** — a row with the same name already has a different CID. Fix the CID by hand; the script will not overwrite it.
- **CPA looks higher than a single campaign's** — expected. Cost from every campaign in the window is divided by all conversions.
