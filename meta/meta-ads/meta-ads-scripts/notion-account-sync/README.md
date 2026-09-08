# Notion Account Sync — Meta Ads

A Google Apps Script that pulls the **last 14 days** of Meta Ads spend and conversions for every client account listed in a Notion "Accounts" database and writes two columns back:

- **`FB Conv`** — conversions for the window
- **`Facebook CPA`** — spend ÷ conversions (cleared when there are no conversions)

Companion to the Google MCC sync. Notion drives the loop: any row with a value in the **`Meta CID`** text property gets synced, and rows with an empty cell are skipped. That empty cell *is* the ignore list — there is no separate exclude config.

## What it does

On each run:

1. Queries the Notion Accounts database (paginated) and collects every row's `Meta CID`
2. For each row with a CID, calls the Meta Marketing API insights endpoint at account level for the primary 14-day window
3. If the window has **fewer than 2 conversions** (0 or 1), re-pulls a 30-day window instead and notes it in the log
4. Sums the configured action types into a single conversion count, divides spend by it, and PATCHes only `FB Conv` and `Facebook CPA` on the Notion page
5. Logs one line per account plus a list of rows that were skipped for having no CID

It never touches Google Conv, Google CPA, Last Analysis, Next Analysis Due, tCPA, Notes, Tags, or formula columns, and never creates or deletes rows.

## How conversions are counted

Meta's insights response splits conversion-type events across **two arrays**:

| Array | Examples |
|---|---|
| `actions` | `lead`, `omni_purchase`, `link_click`, `offsite_conversion.fb_pixel_lead` |
| `conversions` | `submit_application_website`, `contact_website`, `schedule_website` |

The script merges both into one lookup and sums whatever names are in `CONFIG.ACTION_TYPES` (default `['lead', 'omni_purchase']`). Per-account exceptions go in `CONFIG.ACTION_TYPE_OVERRIDES`, keyed by the act ID digits:

```js
ACTION_TYPE_OVERRIDES: {
  // Account whose KPI is the SubmitApplication standard event
  '1234567890': ['submit_application_website'],
},
```

**Don't list a rollup and its component together** (for example `submit_application_total` *and* `submit_application_website`) — you will double count.

Not sure what an account reports? Set the account ID inside `debugActionTypes()` and run that function on its own from the Apps Script editor. It logs every `actions` and `conversions` entry for the last 30 days and writes nothing to Notion.

## CPA is account-wide

Spend from every campaign in the window is divided by the summed conversions. A campaign that spent money with no results raises the account CPA above any single campaign's "cost per result" row in Ads Manager. When checking the numbers, compare against the **account-level** cost per lead, not a campaign row.

## Prerequisites

### Notion

- A database with a title property named **`Account`**
- A text property named **`Meta CID`** holding each row's Meta ad account ID (`act_1234567890` and `1234567890` both work)
- Number properties named **`FB Conv`** and **`Facebook CPA`**
- An internal integration with access to the database (reuse the one from the Google sync)

### Meta

A **System User** access token with `ads_read` that is assigned to every client ad account:

1. Create a Meta app at developers.facebook.com (Business type)
2. Business Settings → **System Users** → add a system user
3. **Assign Assets** → add each client ad account with at least view access
4. **Generate New Token** → select the app, choose `ads_read`, set expiration to *never*
5. Copy the token into `CONFIG.META_ACCESS_TOKEN`

## Installation

1. Go to [script.google.com](https://script.google.com) and create a new project
2. Paste the contents of `notion-account-sync.js` into `Code.gs`
3. Fill in `NOTION_TOKEN`, `NOTION_DATABASE_ID`, and `META_ACCESS_TOKEN` in `CONFIG`
4. Adjust `ACTION_TYPES`, `ACTION_TYPE_OVERRIDES`, and `TIMEZONE` as needed
5. Run `main` once manually and grant the UrlFetch permission when prompted
6. Check the execution log — verify two or three accounts against Ads Manager
7. Add a time-driven trigger (daily recommended) for `main`

The same code also runs unchanged in the Google Ads Scripts editor, but Apps Script is preferred because it keeps the Meta token out of reach of anyone with Google Ads access.

## Configuration

| Key | Default | Purpose |
|---|---|---|
| `ACTION_TYPES` | `['lead', 'omni_purchase']` | Names summed as conversions for every account |
| `ACTION_TYPE_OVERRIDES` | `{}` | Per-account replacement lists, keyed by act ID digits |
| `LOOKBACK_DAYS` | `14` | Primary window (ending yesterday) |
| `FALLBACK_LOOKBACK_DAYS` | `30` | Window used when the primary has too few conversions |
| `FALLBACK_BELOW_CONVERSIONS` | `2` | Fall back when primary conversions are below this |
| `META_API_VERSION` | `v23.0` | Bump as Meta deprecates versions |
| `TIMEZONE` | `America/Denver` | Timezone for computing the date window |
| `NOTION_WRITE_DELAY_MS` | `350` | Pause between Notion writes to stay under the rate limit |

## Security

The Meta token grants read access to every client ad account and sits in plaintext in the script. **Never commit a real token to this repo** — the file in this folder ships with placeholders, and the real values belong only in your Apps Script project.

## Troubleshooting

- **`Notion query failed (401)`** — the Notion token is missing, still a placeholder, or the integration lost access to the database.
- **`META ERROR (400)`** — usually an expired or under-permissioned token, or an ad account the system user is not assigned to.
- **An account shows 0 conversions but Ads Manager shows results** — the event is reported under a name that is not in `ACTION_TYPES`. Run `debugActionTypes()` for that account and add the correct name to `ACTION_TYPE_OVERRIDES`.
- **CPA is higher than a campaign's cost per result** — expected; see *CPA is account-wide* above.
