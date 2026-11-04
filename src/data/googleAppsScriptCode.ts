/**
 * Google Apps Script (Code.gs)
 * Copy and paste this code into your Google Sheet's Apps Script editor:
 * Extensions > Apps Script > Paste into Code.gs > Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ============================================================================
 * TULJAI PHATAKA - Google Apps Script Billing Integration (v2.0)
 * Handles automated saving of bills and item breakdowns to Google Sheets.
 * ============================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet in a browser.
 * 2. In the top menu, click Extensions > Apps Script.
 * 3. Replace all code in "Code.gs" with this exact code.
 * 4. Click the blue "Deploy" button (top-right) > "New deployment".
 * 5. Select type: "Web app" (click the gear icon next to Select type).
 * 6. Set Description: "TULJAI PHATAKA Billing API v2".
 * 7. Set "Execute as": "Me" (your email account).
 * 8. Set "Who has access": "Anyone" (CRITICAL: Must be "Anyone" so the app can save bills).
 * 9. Click "Deploy", authorize access with your Google account.
 * 10. Copy the "Web app URL" (ends in /exec) and paste it into the shop admin Settings tab.
 * 
 * NOTE ON UPDATES:
 * Whenever you modify this code, click Deploy > Manage deployments > Edit (pencil icon) > 
 * Version: "New version" > Deploy. Google Apps Script requires a new version to activate changes!
 */

function doGet(e) {
  // 1. GET Save Bill Fallback (for environments where browser POST cross-origin redirect is restricted)
  if (e && e.parameter && e.parameter.action === 'save_bill' && e.parameter.payload) {
    try {
      var fakeEvent = {
        postData: {
          contents: e.parameter.payload
        }
      };
      return doPost(fakeEvent);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "GET fallback save failed: " + err.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 2. Health check / Test connection
  if (e && e.parameter && (e.parameter.format === 'json' || e.parameter.test === '1')) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "TULJAI PHATAKA billing API is running",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput("TULJAI PHATAKA billing API is running")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 30 seconds for concurrent operations to complete safely
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Server busy. Could not acquire lock in 30 seconds."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No POST payload received. Make sure body is transmitted as text/plain JSON."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Invalid JSON received: " + parseErr.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Resolve Spreadsheet
    var ss = null;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (ssErr) {}

    // Fallback: If script was created standalone at script.google.com rather than inside the sheet
    if (!ss && data.spreadsheetId) {
      try {
        ss = SpreadsheetApp.openById(data.spreadsheetId);
      } catch (openErr) {}
    }

    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No active Google Sheet linked! Please create this script from inside your Google Sheet via Extensions > Apps Script."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Get or create "Bills" sheet tab
    var billsSheet = ss.getSheetByName("Bills");
    var billsHeaders = [
      "Bill No",
      "Date",
      "Time",
      "Customer Name",
      "Phone",
      "Items Summary",
      "Subtotal",
      "Discount",
      "Tax",
      "Grand Total",
      "Billed By"
    ];

    if (!billsSheet) {
      billsSheet = ss.insertSheet("Bills");
      billsSheet.appendRow(billsHeaders);
      billsSheet.getRange(1, 1, 1, billsHeaders.length)
        .setFontWeight("bold")
        .setBackground("#F3F4F6")
        .setFontColor("#111827");
      billsSheet.setFrozenRows(1);
    }

    // 2. Get or create "BillItems" sheet tab
    var itemsSheet = ss.getSheetByName("BillItems");
    var itemsHeaders = [
      "Bill No",
      "Date",
      "Item",
      "Category",
      "Qty",
      "Unit Price",
      "Line Total"
    ];

    if (!itemsSheet) {
      itemsSheet = ss.insertSheet("BillItems");
      itemsSheet.appendRow(itemsHeaders);
      itemsSheet.getRange(1, 1, 1, itemsHeaders.length)
        .setFontWeight("bold")
        .setBackground("#F3F4F6")
        .setFontColor("#111827");
      itemsSheet.setFrozenRows(1);
    }

    // 3. Deduplication check: verify if Bill No already exists in "Bills" sheet
    var billNo = String(data.billNo || "").trim();
    if (billNo) {
      var lastRow = billsSheet.getLastRow();
      if (lastRow > 1) {
        var existingBillNos = billsSheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < existingBillNos.length; i++) {
          if (String(existingBillNos[i][0]).trim() === billNo) {
            return ContentService.createTextOutput(JSON.stringify({
              status: "success",
              message: "Bill " + billNo + " already exists in sheet. Duplicate skipped safely.",
              billNo: billNo,
              isDuplicate: true
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
    }

    // 4. Build items summary string for the main Bills row
    var itemsList = data.items || [];
    var summaryParts = [];
    for (var j = 0; j < itemsList.length; j++) {
      var itm = itemsList[j];
      summaryParts.push(itm.name + " (" + (itm.qty || 1) + "x ₹" + (itm.unitPrice || 0) + ")");
    }
    var itemsSummary = summaryParts.join("; ");

    // 5. Append row to "Bills" tab with numerical values for proper sheet math
    var billRow = [
      billNo,
      data.date || "",
      data.time || "",
      data.customerName || "Walk-in Customer",
      data.customerPhone || "-",
      itemsSummary,
      Number(data.subtotal) || 0,
      Number(data.discountAmount) || 0,
      Number(data.taxAmount) || 0,
      Number(data.grandTotal) || 0,
      data.billedBy || "Counter Staff"
    ];
    billsSheet.appendRow(billRow);

    // 6. Append each item row to "BillItems" tab
    var billDate = data.date || "";
    for (var k = 0; k < itemsList.length; k++) {
      var itemLine = itemsList[k];
      var itemRow = [
        billNo,
        billDate,
        itemLine.name || "",
        itemLine.category || "",
        Number(itemLine.qty) || 1,
        Number(itemLine.unitPrice) || 0,
        Number(itemLine.lineTotal) || 0
      ];
      itemsSheet.appendRow(itemRow);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Bill " + billNo + " recorded successfully in Google Sheet",
      billNo: billNo,
      rowsAdded: 1 + itemsList.length
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}
`;
