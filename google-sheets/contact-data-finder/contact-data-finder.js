/**
 * Marketing Toolkit — Contact Data Finder (GET_CONTACTS)
 * Version: v1.0.0
 * Last updated: 2026-05-18
 * https://github.com/whboggs/marketing-toolkit
 *
 * Consolidates contact data from every sheet except the active one.
 * Matches headers flexibly: "first", "last", "phone", "email", "zip"
 * (case-insensitive, partial match — so "First Name" matches "first").
 *
 * Returns columns in this order: First, Last, Phone, Email, Zip
 * Missing columns on a sheet are left blank.
 * Rows where "test" appears in any of the 5 target fields are filtered out.
 * Phone numbers are normalized to E.164 format (+1XXXXXXXXXX for US).
 *
 * Usage in a cell: =GET_CONTACTS()
 * Place in A2 so it spills down under your headers in row 1.
 */
function GET_CONTACTS() {
  // Get all sheets and the active sheet name (to skip it)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const activeSheetName = ss.getActiveSheet().getName();
  
  // Define the header keywords we're looking for, in output order
  const headerKeywords = ["first", "last", "phone", "email", "zip"];
  
  // Index of the phone column in our output (used for normalization)
  const PHONE_INDEX = 2;
  
  const results = [];
  
  // Loop through every sheet
  for (const sheet of sheets) {
    // Skip the sheet the formula is being called from
    if (sheet.getName() === activeSheetName) continue;
    
    // Grab all values from the sheet as a 2D array
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) continue;
    
    // Find the header row — the first row that contains at least one of our keywords
    let headerRowIndex = -1;
    for (let row = 0; row < data.length; row++) {
      const hasKeyword = data[row].some(cell => {
        const text = String(cell).toLowerCase();
        return headerKeywords.some(kw => text.includes(kw));
      });
      if (hasKeyword) {
        headerRowIndex = row;
        break;
      }
    }
    
    // If no header row found, skip this sheet entirely
    if (headerRowIndex === -1) continue;
    
    // Map each keyword to its column index on this sheet
    const headerRow = data[headerRowIndex];
    const columnMap = headerKeywords.map(keyword => {
      for (let col = 0; col < headerRow.length; col++) {
        const headerText = String(headerRow[col]).toLowerCase();
        if (headerText.includes(keyword)) return col;
      }
      return -1;
    });
    
    // Pull all data rows below the header
    for (let row = headerRowIndex + 1; row < data.length; row++) {
      // Build the output row by pulling each mapped column
      const outputRow = columnMap.map(sourceCol => {
        if (sourceCol === -1) return "";
        return data[row][sourceCol] || "";
      });
      
      // Normalize the phone number in place
      outputRow[PHONE_INDEX] = normalizePhone(outputRow[PHONE_INDEX]);
      
      // Filter: skip this row if "test" appears in any of the 5 target fields
      const hasTestInTargets = outputRow.some(val => {
        return String(val).toLowerCase().includes("test");
      });
      if (hasTestInTargets) continue;
      
      // Skip completely empty rows
      const hasAnyData = outputRow.some(val => String(val).trim() !== "");
      if (hasAnyData) results.push(outputRow);
    }
  }
  
  // If nothing found, return a single empty row so the formula doesn't error
  if (results.length === 0) return [["", "", "", "", ""]];
  
  return results;
}

/**
 * Normalizes a phone number to E.164 format (+1XXXXXXXXXX for US numbers).
 * - 10 digits: assumed US, prefixed with +1
 * - 11 digits starting with 1: assumed US, prefixed with +
 * - Already starts with +: passed through (cleaned of non-digits after the +)
 * - Anything else (too short, unrecoverable): returns empty string
 */
function normalizePhone(value) {
  // Handle empty/null input
  if (value === null || value === undefined || value === "") return "";
  
  // Convert to string and trim whitespace
  const raw = String(value).trim();
  if (raw === "") return "";
  
  // Check if it already starts with + (international format)
  const hasPlus = raw.startsWith("+");
  
  // Strip everything except digits
  const digits = raw.replace(/\D/g, "");
  
  // If the original had a + and it's not a US number, preserve the country code
  // Anything 11+ digits that started with + but isn't +1 is non-US international
  if (hasPlus && !(digits.length === 11 && digits.startsWith("1"))) {
    // Pass through international numbers as +<digits>
    // Require at least 8 digits to be considered valid (shortest realistic intl number)
    if (digits.length >= 8) return "+" + digits;
    return "";
  }
  
  // Handle US numbers
  // 10 digits = US number without country code
  if (digits.length === 10) return "+1" + digits;
  
  // 11 digits starting with 1 = US number with country code
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  
  // Unrecoverable: too short, too long, or doesn't match a pattern we can fix
  return "";
}
