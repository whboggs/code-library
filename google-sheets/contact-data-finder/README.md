# GET_CONTACTS

A Google Apps Script custom function that consolidates contact data from every sheet in a Google Spreadsheet (except the active one) into a single, clean list.

Built for situations where contact data is scattered across many tabs — event lead lists, lead capture forms, dealership demo signups, etc. — and you want one consolidated master list with normalized phone numbers and filtered test data.

## Features

- **Pulls from every sheet except the active one** — write the formula in your master tab and it grabs from all the others automatically
- **Flexible header matching** — finds `First Name`, `first`, `FIRST_NAME`, `firstname`, etc. without configuration
- **Auto-detects header row position** — headers don't have to be in row 1
- **Phone number normalization** — outputs E.164 format (`+1XXXXXXXXXX` for US numbers)
- **Test lead filtering** — drops rows where "test" appears in any target field (first, last, phone, email, zip)
- **Skips missing columns gracefully** — if a sheet doesn't have a phone column, those cells stay blank instead of breaking the row
- **Spills dynamically** — uses Google Sheets' native array output, so it grows and shrinks automatically as your source sheets change

## Output columns

| Column | Header keyword matched | Notes |
|---|---|---|
| A | `first` | First name |
| B | `last` | Last name |
| C | `phone` | Normalized to E.164 |
| D | `email` | As-is |
| E | `zip` | As-is |

## Installation

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete any boilerplate code in `Code.gs`
4. Paste in the contents of [`get-contacts.gs`](./get-contacts.gs)
5. Save with `Cmd+S` (Mac) or `Ctrl+S` (Windows)
6. Close the Apps Script tab and return to your sheet

## Usage

1. On your destination sheet, set up your headers in row 1 (e.g., `First`, `Last`, `Phone`, `Email`, `Zip` in columns A–E)
2. In cell **A2**, enter:
   ```
   =GET_CONTACTS()
   ```
3. The function will spill consolidated contacts down from A2

### Important: Format the phone column as plain text

Google Sheets aggressively auto-formats phone numbers, which can convert `+18015551234` back into `(801) 555-1234` for display. To prevent this:

1. Select the phone column (e.g., column C)
2. **Format → Number → Plain text**

## Phone number normalization

The function attempts to normalize any phone-shaped input into E.164 format.

| Input | Output |
|---|---|
| `(605) 261-2446` | `+16052612446` |
| `801-555-1234` | `+18015551234` |
| `8015551234` | `+18015551234` |
| `1-801-555-1234` | `+18015551234` |
| `+1 801 555 1234` | `+18015551234` |
| `+44 20 7946 0958` | `+442079460958` |
| `call me` | *(blank)* |
| `555-1234` (only 7 digits) | *(blank)* |

### Normalization rules

- **10 digits** → assumed US, prefixed with `+1`
- **11 digits starting with 1** → assumed US, prefixed with `+`
- **Already starts with `+`** → passed through (cleaned of formatting)
- **International (non-US) numbers** with `+` prefix → preserved with their country code
- **Anything else** (too short, unrecoverable, or non-numeric) → returns blank, but the rest of the row is kept

## Test lead filtering

Any row where the word "test" appears in **any of the 5 target fields** (first, last, phone, email, zip) is filtered out.

Example: a row with `First Name: Test` is dropped. A row with `First Name: John` and a Notes column saying `"wants to test drive the boat"` is **kept** because the filter only looks at the 5 fields being extracted.

## Header matching

The function does case-insensitive partial matching on header text. As long as the keyword appears somewhere in the cell, it matches:

| Header text | Matched? |
|---|---|
| `First Name` | ✅ (matches "first") |
| `FIRST_NAME` | ✅ |
| `firstname` | ✅ |
| `fname` | ❌ (no "first") |
| `Last` | ✅ (matches "last") |
| `Email Address` | ✅ (matches "email") |
| `Zip Code` | ✅ (matches "zip") |
| `Postal Code` | ❌ (no "zip") |

### Known edge cases

- `last` will match `Last Modified`, `Last Contact`, etc. if those exist as headers
- `first` will match `First Visit`, `First Seen`, etc.

If you have those headers in your source sheets, modify the matching logic to require exact matches.

## Troubleshooting

**The function output doesn't update after I edit the script.**
Custom functions cache aggressively. Force a recalc by editing the cell: change `=GET_CONTACTS()` to something else (like `=1`), press Enter, then change it back.

**Phone numbers show as `(605) 261-2446` instead of `+16052612446`.**
The column is auto-formatting. Set it to plain text: **Format → Number → Plain text**.

**The function returns nothing.**
- Check that "Unsaved changes" no longer appears in the Apps Script editor (i.e., it's actually saved)
- Make sure at least one of your other sheets has a header row containing one of the keywords (`first`, `last`, `phone`, `email`, `zip`)
- Authorize the script if Google prompts you on first run

**I'm getting a `#NAME?` error.**
The script hasn't loaded. Make sure the file is saved in Apps Script and the function name in your formula matches exactly (`GET_CONTACTS`, all caps).

## Customization

### Change which fields are extracted

Edit the `headerKeywords` array at the top of `GET_CONTACTS()`:

```javascript
const headerKeywords = ["first", "last", "phone", "email", "zip"];
```

Add or remove keywords to match your needs. If you change this, also update `PHONE_INDEX` if the phone column moves.

### Change the test filter keyword

In the filter logic, replace `"test"` with your own keyword:

```javascript
const hasTestInTargets = outputRow.some(val => {
  return String(val).toLowerCase().includes("test");
});
```

### Change phone output format

Edit the `normalizePhone()` function. For example, to output `1(XXX)XXX-XXXX` instead of `+1XXXXXXXXXX`:

```javascript
if (digits.length === 10) {
  return `1(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
}
```

## License

MIT — use it however you want.
