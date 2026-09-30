// ============================================================
//  CRM Google Apps Script v2
//  Columns: Task ID, Client/Company, Type of Service, Status,
//           Priority, Owner, Notes, Start Date, End Date,
//           Follow Update, Expected End, Amount, Paid, Balance, Reward, Contact Details
// ============================================================

// ---------- CONFIGURATION ----------
const SHEET_NAME = "CRM";
const HEADER_ROW = 1;
const DATA_START_ROW = 2;

// Column indices (1-based)
const COL = {
  TASK_ID:        1,
  CLIENT:         2,
  SERVICE_TYPE:   3,
  STATUS:         4,
  PRIORITY:       5,
  OWNER:          6,
  NOTES:          7,
  START_DATE:     8,
  END_DATE:       9,
  FOLLOW_UPDATE:  10,
  EXPECTED_END:   11,
  AMOUNT:         12,
  PAID:           13,
  BALANCE:        14,
  REWARD:         15,
  CONTACT:        16,
  DOCUMENT:       17  // ← NEW
};
const DATE_COLUMNS = [COL.START_DATE, COL.END_DATE, COL.FOLLOW_UPDATE, COL.EXPECTED_END];



// ---------- DROPDOWN OPTIONS ----------
const SERVICE_TYPES = [
"Visa",





];

const STATUSES = [
  "Intake",
  "Documents Pending",
  "Processing",
  "Under Review",
  "Submitted",
  "Awaiting Approval",
  "Completed",
  "On Hold",
  "On Risk",
  "Processing Document",
  "Follow Done",
  "Reject",      
  "Canceled"      
];

const PRIORITIES = [
  "Easy Close",
  "Work Needed",
  "Complex",
  "Risk Line",
  "Complete"
];

const OWNERS = [
  "Mr"
];

// ============================================================
//  DEADLINE EMAIL NOTIFICATIONS — CONFIG
//  Replace every "REPLACE_ME_..." value below with a real email.
// ============================================================

const DIRECTOR_EMAIL = "example123@gmail.com";
const ADMIN_EMAIL    = "example455@gmail.com";

const OWNER_EMAILS = {
  "Mr.":  "example12@gmail.com",
  "Ms.": "exampleintern60@gmail.com",
  "Mr.": "example455@gmail.com",
  "Ms.": "examplehr5@gmail.com",
  "H":    "example116@gmail.com",
  "s":   "examplee@gmail.com",
  "Mr":   "example444@gmail.com"
};

// How many day(s) before the deadline the email should fire
const NOTIFY_DAYS_BEFORE = 1;

// ============================================================
//  DEADLINE EMAIL NOTIFICATIONS
//  Sends an email to the Director + the task Owner when a task's
//  End Date is NOTIFY_DAYS_BEFORE day(s) away. Skips Completed/
//  Complete tasks. Runs fresh every time — no dedupe/skip logic,
//  so running it twice in the same day sends the email twice.
// ============================================================

// ── Styled HTML email template (design only — matches the rest of the CRM's navy/gold branding) ──
function buildDeadlineEmailHTML(task) {
  const priorityColors = {
    "Easy Close":  "#0f9d58",
    "Work Needed": "#f29900",
    "Complex":     "#e37400",
    "Risk Line":   "#d93025",
    "Complete":    "#1a73e8"
  };
  const badgeColor = priorityColors[task.priority] || "#9aa0a6";
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "EEEE, d MMMM yyyy");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.10);">

  <tr><td style="background:${DASH.NAVY};padding:20px 24px 14px;">
    <div style="color:${DASH.GOLD};font-size:18px;font-weight:700;letter-spacing:0.5px;">♦ ${COMPANY_NAME} ♦</div>
    <div style="color:#ffffff;font-size:12px;opacity:0.85;margin-top:4px;">Task Deadline Alert · ${dateStr}</div>
  </td></tr>

  <tr><td style="background:#fdf1e3;padding:10px 24px;">
    <span style="color:#c05a0a;font-size:13px;font-weight:600;">⏰ This task needs your attention</span>
  </td></tr>

  <tr><td style="background:#fdecec;padding:8px 24px;border-top:1px solid #f1c3c0;">
    <span style="color:#a6121f;font-size:12px;font-weight:700;letter-spacing:0.3px;">🔔 DUE TOMORROW</span>
  </td></tr>

  <tr><td style="padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr style="background:${DASH.NAVY};">
        <td style="padding:8px 12px;color:${DASH.GOLD};font-size:11px;font-weight:700;">Task</td>
        <td style="padding:8px 12px;color:${DASH.GOLD};font-size:11px;font-weight:700;">Service</td>
        <td style="padding:8px 12px;color:${DASH.GOLD};font-size:11px;font-weight:700;">Assigned To</td>
        <td style="padding:8px 12px;color:${DASH.GOLD};font-size:11px;font-weight:700;">Deadline</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f3f4;vertical-align:top;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${badgeColor};margin-right:6px;"></span>
          <span style="font-size:12px;color:#202124;font-weight:600;">${task.taskId || "—"}</span><br>
          <span style="font-size:11px;color:#5f6368;margin-left:14px;">${task.client || "—"}</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f3f4;font-size:12px;color:#5f6368;vertical-align:top;">${task.service || "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f3f4;font-size:12px;color:#202124;vertical-align:top;">${task.owner || "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f3f4;font-size:12px;color:#a6121f;font-weight:600;vertical-align:top;">${task.deadlineStr}</td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="background:#f8f9fa;padding:10px 24px;">
    <span style="font-size:10px;color:#9aa0a6;">◆ ${COMPANY_NAME} Task Management System</span>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

function sendDeadlineNotifications() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return;

  const data  = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, COL.CONTACT).getValues();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  let sentCount = 0;

  data.forEach(row => {
    const taskId  = row[COL.TASK_ID - 1];
    const client  = row[COL.CLIENT - 1];
    const service = row[COL.SERVICE_TYPE - 1];
    const status  = row[COL.STATUS - 1];
    const owner   = row[COL.OWNER - 1];
    const endDate = row[COL.END_DATE - 1];

    if (!taskId && !client) return;
    if (["Completed", "Complete"].includes(status)) return;
    if (!(endDate instanceof Date) || isNaN(endDate)) return;

    const due      = new Date(endDate); due.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((due - today) / 86400000);
    if (daysLeft !== NOTIFY_DAYS_BEFORE) return;

    const priority     = row[COL.PRIORITY - 1];
    const deadlineStr  = Utilities.formatDate(due, Session.getScriptTimeZone(), "dd MMM yyyy");

    const ownerEmail = OWNER_EMAILS[owner];
    const recipients = [DIRECTOR_EMAIL, ADMIN_EMAIL];
    if (ownerEmail) recipients.push(ownerEmail);

    const subject = `⏰ Deadline Tomorrow — ${taskId || "—"} (${client || "—"})`;
    const plainBody =
      `Task ID: ${taskId || "—"}\n` +
      `Client / Company: ${client || "—"}\n` +
      `Service: ${service || "—"}\n` +
      `Status: ${status || "—"}\n` +
      `Owner: ${owner || "—"}\n` +
      `Deadline: ${deadlineStr} (due in ${daysLeft} day)\n\n` +
      `This is an automated reminder from the ${COMPANY_NAME} CRM.`;
    const htmlBody = buildDeadlineEmailHTML({
      taskId, client, service, owner, priority, deadlineStr
    });

    try {
      MailApp.sendEmail({ to: recipients.join(","), subject: subject, body: plainBody, htmlBody: htmlBody });
      sentCount++;
    } catch(err) {
      console.log("sendDeadlineNotifications email error for " + taskId + ": " + err.message);
    }
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(
    sentCount > 0 ? `✅ Sent ${sentCount} deadline notification(s).` : "ℹ️ No tasks due in " + NOTIFY_DAYS_BEFORE + " day(s) right now.",
    "Deadline Notifications",
    5
  );
}

// Run this ONCE (menu: CRM Tools → ⏰ Setup Daily Deadline Notification Trigger)
// to have sendDeadlineNotifications() run automatically every day.
function createDailyDeadlineTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "sendDeadlineNotifications") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("sendDeadlineNotifications")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
  SpreadsheetApp.getUi().alert("✅ Daily deadline notification trigger created!\n\nsendDeadlineNotifications() will now run automatically every day around 9 AM.");
}

// ============================================================
//  SERVICE SHEETS CONFIG
//  Replace Service1-6 with your actual service names
//  Must match EXACTLY what you typed in SERVICE_TYPES
// ============================================================
const SERVICE_SHEETS = [
  "Visa",

];

// ============================================================
//  SERVICE AUTO-FILL CONFIG
//  Format: "Service Name": { amount: 0, days: 0 }
//  days = timeline duration (End Date = Start Date + days)
// ============================================================
const SERVICE_CONFIG = {
  "Visa":                { amount: 7300, days: 14, currency: "RM" },
  



 


};


// ============================================================
//  MANAGE DROPDOWNS
// ============================================================
function manageDropdowns() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "⚙️ Manage Dropdowns",
    "Type: SERVICE or OWNER\nThen a colon, then the value to add.\n\nExamples:\n  SERVICE: Visa Application\n  OWNER: ",
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;

  const input = response.getResponseText().trim();
  const [typeRaw, ...valueParts] = input.split(":");
  const type  = typeRaw.trim().toUpperCase();
  const value = valueParts.join(":").trim();

  if (!value) { ui.alert("❌ No value entered."); return; }

  const props = PropertiesService.getScriptProperties();

  if (type === "SERVICE") {
    const existing = JSON.parse(props.getProperty("SERVICE_TYPES") || "[]");
    if (existing.includes(value)) { ui.alert(`"${value}" already exists in services.`); return; }
    existing.push(value);
    props.setProperty("SERVICE_TYPES", JSON.stringify(existing));
    refreshDropdowns();
    ui.alert(`✅ Service added: "${value}"\nDropdown updated!`);

  } else if (type === "OWNER") {
    const existing = JSON.parse(props.getProperty("OWNERS") || "[]");
    if (existing.includes(value)) { ui.alert(`"${value}" already exists in owners.`); return; }
    existing.push(value);
    props.setProperty("OWNERS", JSON.stringify(existing));
    refreshDropdowns();
    ui.alert(`✅ Owner added: "${value}"\nDropdown updated!`);

  } else {
    ui.alert('❌ Unknown type. Please type SERVICE or OWNER before the colon.');
  }
}

function getServiceTypes() {
  const stored = PropertiesService.getScriptProperties().getProperty("SERVICE_TYPES");
  const custom = stored ? JSON.parse(stored) : [];
  return custom.length > 0 ? custom : SERVICE_TYPES;
}

function getOwners() {
  const stored = PropertiesService.getScriptProperties().getProperty("OWNERS");
  const custom = stored ? JSON.parse(stored) : [];
  return custom.length > 0 ? custom : OWNERS;
}


// ============================================================
//  1. SETUP
// ============================================================
function setupCRM() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  const headers = [
    "Task ID", "Client / Company", "Type of Service", "Status",
    "Priority", "Owner", "Notes", "Start Date", "End Date",
    "Follow Update", "Expected End", "Amount", "Paid", "Balance", "Reward", "Contact Details",
    "Documents"  // ← NEW
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setBackground("#ffffff")
    .setFontColor("#000000")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 36);

  const widths = [110, 180, 160, 155, 120, 130, 200, 110, 110, 120, 120, 100, 90, 90, 90, 210, 250];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);

  refreshDropdowns(sheet);

  // Date formatting
  DATE_COLUMNS.forEach(col => {
    sheet.getRange(DATA_START_ROW, col, 999).setNumberFormat("dd/MM/yyyy");
  });

  // Currency formatting — now includes AMOUNT
  [COL.AMOUNT, COL.PAID, COL.BALANCE, COL.REWARD].forEach(col => {
    sheet.getRange(DATA_START_ROW, col, 999).setNumberFormat('"RM "#,##0.00');
  });
  fixAllCurrencyFormats(sheet, true);

  // Contact Details column = plain text
  sheet.getRange(DATA_START_ROW, COL.CONTACT, 999).setNumberFormat("@");

  // Row banding
  try {
    sheet.getBandings().forEach(b => b.remove());
  } catch(e) {}
  sheet.getRange(DATA_START_ROW, 1, 999, headers.length)
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY)
    .setHeaderRowColor("#ffffff");

  SpreadsheetApp.getUi().alert(
    "✅ CRM Sheet Ready!\n\n" +
    "Triggers needed (Extensions → Apps Script → Triggers):\n" +
    "   • onOpen → On open\n" +
    "   • onEdit → On edit\n\n" +
    "Add services & owners via:\n" +
    "   📋 CRM Tools → ⚙️ Manage Dropdowns"
  );
}

function refreshDropdowns(sheetArg) {
  const sheet = sheetArg || SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const makeRule = (list) =>
    SpreadsheetApp.newDataValidation().requireValueInList(list, true).build();

  sheet.getRange(DATA_START_ROW, COL.SERVICE_TYPE, 999).setDataValidation(makeRule(getServiceTypes()));
  sheet.getRange(DATA_START_ROW, COL.STATUS,       999).setDataValidation(makeRule(STATUSES));
  sheet.getRange(DATA_START_ROW, COL.PRIORITY,     999).setDataValidation(makeRule(PRIORITIES));
  sheet.getRange(DATA_START_ROW, COL.OWNER,        999).setDataValidation(makeRule(getOwners()));
}


// ============================================================
//  2. ON OPEN
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi().createMenu("📋 CRM Tools")
    .addItem("🔔 Show Pending Tasks", "showPendingTasks")
    .addItem("📎 Upload Document (selected row)", "openDocumentUploader")
    .addItem("📧 Send Documents to Client", "openSendDocuments")
    .addItem("📅 Monthly Report", "generateMonthlyReport")
    .addItem("🔍 Search by Service", "searchByService")
    .addItem("🔍 Search by Company", "searchByCompany")
    .addItem("🔍 Search by Owner", "searchByOwner")
    .addItem("📊 Build Dashboard (reset layout)", "buildDashboardLayout")
    //We are not using it anymore
    .addSeparator()
    .addItem("📅 Pick Start Date (selected row)", "openStartDate")
    .addItem("📅 Pick End Date (selected row)", "openEndDate")
    .addItem("📅 Pick Follow Update (selected row)", "openFollowDate")
    .addItem("📅 Pick Expected End (selected row)", "openExpectedDate")
    .addSeparator()
    .addItem("⚙️ Manage Dropdowns (Services & Owners)", "manageDropdowns")
    .addItem("🎨 Highlight Rows by Status", "highlightByStatus")
    .addItem("💱 Fix Currency Formats (all rows)", "fixAllCurrencyFormats")
    .addItem("📁 Create CRM Drive Folders", "createCRMFolders")
    
    .addItem("✅ Mark Follow Done & Set Next", "markFollowDone")
    .addSeparator()
    .addItem("📂 Create Service Sheets", "createServiceSheets")
    .addItem("🔄 Refresh Service Sheets", "refreshServiceSheets")
    .addSeparator()
    .addItem("📧 Send Deadline Notifications Now", "sendDeadlineNotifications")
    .addItem("⏰ Setup Daily Deadline Notification Trigger", "createDailyDeadlineTrigger")
    .addSeparator()
    .addItem("🔧 Setup / Refresh CRM Sheet", "setupCRM")

    .addToUi();

  showPendingTasks();
}

function openStartDate()    { openPickerForColumn(COL.START_DATE); }
function openEndDate()      { openPickerForColumn(COL.END_DATE); }
function openFollowDate()   { openPickerForColumn(COL.FOLLOW_UPDATE); }
function openExpectedDate() { openPickerForColumn(COL.EXPECTED_END); }

function openPickerForColumn(targetCol) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;
  const row = sheet.getActiveCell().getRow();
  if (row <= HEADER_ROW) {
    SpreadsheetApp.getUi().alert("Please click on a data row first (not the header row).");
    return;
  }
  PropertiesService.getScriptProperties().setProperties({
    "PICKER_ROW": String(row),
    "PICKER_COL": String(targetCol)
  });
  showDatePicker(row, targetCol);
}


// ============================================================
//  3. REMINDER POPUP
// ============================================================
function showPendingTasks() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) {
    SpreadsheetApp.getUi().alert("📋 No CRM data found yet.");
    return;
  }

  const data  = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 16).getValues();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const overdue = [], dueSoon = [], followToday = [], followSoon = [], noDate = [];

data.forEach((row, i) => {
    const taskId      = row[COL.TASK_ID - 1];
    const client      = row[COL.CLIENT - 1];
    const status      = row[COL.STATUS - 1];
    const priority    = row[COL.PRIORITY - 1];
    const owner       = row[COL.OWNER - 1];
    const serviceType = row[COL.SERVICE_TYPE - 1] || "—"; 
    const endDate     = row[COL.END_DATE - 1];
    const expEnd      = row[COL.EXPECTED_END - 1];
    const followDate  = row[COL.FOLLOW_UPDATE - 1];

    if (!taskId && !client) return;
    if (["Completed", "Complete"].includes(status)) return;

    const label      = taskId || "—";
    const clientName = client || "—";
    const ownerName  = owner  || "—";
    const rowNum     = DATA_START_ROW + i;

    const dateRef = endDate instanceof Date && !isNaN(endDate) ? endDate
                  : expEnd  instanceof Date && !isNaN(expEnd)  ? expEnd : null;

    if (dateRef) {
      const due      = new Date(dateRef); due.setHours(0,0,0,0);
      const diffDays = Math.round((due - today) / 86400000);
      if (diffDays < 0) {
        overdue.push({ taskId: label, client: clientName, owner: ownerName, service: serviceType, priority, info: `${Math.abs(diffDays)} days overdue`, row: rowNum });
      } else if (diffDays <= 3) {
        dueSoon.push({ taskId: label, client: clientName, owner: ownerName, service: serviceType, priority, info: `Due in ${diffDays} day(s)`, row: rowNum });
      }
    } else if (!["On Hold"].includes(status)) {
      noDate.push({ taskId: label, client: clientName, owner: ownerName, service: serviceType, priority, info: "No end date set", row: rowNum });
    }

    if (followDate instanceof Date && !isNaN(followDate)) {
      const follow   = new Date(followDate); follow.setHours(0,0,0,0);
      const diffDays = Math.round((follow - today) / 86400000);
      if (diffDays === 0) {
        followToday.push({ taskId: label, client: clientName, owner: ownerName, service: serviceType, priority, info: "Follow up TODAY", row: rowNum });
      } else if (diffDays > 0 && diffDays <= 3) {
        followSoon.push({ taskId: label, client: clientName, owner: ownerName, service: serviceType, priority, info: `Follow up in ${diffDays} day(s)`, row: rowNum });
      } else if (diffDays < 0) {
        followToday.push({ taskId: label, client: clientName, owner: ownerName, service: serviceType, priority, info: `Follow up MISSED by ${Math.abs(diffDays)} day(s)`, row: rowNum });
      }
    }
  });

  const total = overdue.length + dueSoon.length + followToday.length + followSoon.length + noDate.length;

  if (total === 0) {
    SpreadsheetApp.getUi().alert("✅ All tasks are on track!\nNo overdue or urgent items.");
    return;
  }

  const html = buildReminderHTML(overdue, dueSoon, followToday, followSoon, noDate);
  SpreadsheetApp.getUi().showSidebar(
    HtmlService.createHtmlOutput(html)
      .setTitle("📋 CRM Task Reminders")
      .setWidth(380)
  );
}


// ============================================================
//  3b. BUILD REMINDER HTML
// ============================================================
function buildReminderHTML(overdue, dueSoon, followToday, followSoon, noDate) {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const total = overdue.length + dueSoon.length + followToday.length + followSoon.length + noDate.length;

  const priorityColor = {
    "Easy Close": "#0f9d58",
    "Work Needed": "#f29900",
    "Complex":     "#e37400",
    "Risk Line":   "#d93025",
    "Complete":    "#1a73e8"
  };

 const buildCards = (items) => items.map(item => `
    <div class="card">
      <div class="card-top">
        <span class="task-id">${item.taskId}</span>
        <span class="priority" style="background:${priorityColor[item.priority] || '#9aa0a6'}">${item.priority || "—"}</span>
      </div>
      <div class="client">🏢 ${item.client}</div>
      <div class="service">🔧 ${item.service || "—"}</div>
      <div class="card-bottom">
        <span class="owner">👤 ${item.owner}</span>
        <span class="info">${item.info}</span>
      </div>
    </div>
  `).join("");

  const buildSection = (title, color, icon, items) => {
    if (!items.length) return "";
    return `
      <div class="section">
        <div class="section-header" style="background:${color}">
          <span>${icon} ${title}</span>
          <span class="badge">${items.length}</span>
        </div>
        <div class="cards">${buildCards(items)}</div>
      </div>
    `;
  };

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #f1f3f4;
    padding: 0;
    font-size: 12px;
    color: #202124;
  }

  /* ── Header ── */
  .header {
    background: #1a73e8;
    color: #fff;
    padding: 14px 16px 10px;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .header h1 { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .header .date { font-size: 10px; opacity: 0.85; margin-bottom: 6px; }
  .header .summary {
    background: rgba(255,255,255,0.18);
    border-radius: 20px;
    padding: 3px 10px;
    font-size: 11px;
    display: inline-block;
  }

  /* ── Sections ── */
  .section { margin: 10px 10px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
  .section:last-child { margin-bottom: 10px; }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 12px;
    color: #fff;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.3px;
  }
  .badge {
    background: rgba(255,255,255,0.3);
    border-radius: 10px;
    padding: 1px 8px;
    font-size: 11px;
    font-weight: 700;
  }

  /* ── Cards ── */
  .cards { background: #fff; }
  .card {
    padding: 8px 12px;
    border-bottom: 1px solid #f1f3f4;
  }
  .card:last-child { border-bottom: none; }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3px;
  }
  .task-id {
    font-weight: 700;
    font-size: 12px;
    color: #1a73e8;
  }
  .priority {
    font-size: 9px;
    font-weight: 700;
    color: #fff;
    padding: 2px 7px;
    border-radius: 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .client {
    font-size: 12px;
    font-weight: 600;
    color: #202124;
    margin-bottom: 4px;
  }

  .service {
    font-size: 11px;
    color: #5f6368;
    margin-bottom: 4px;
  }
  .card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .owner {
    font-size: 11px;
    color: #5f6368;
    background: #f1f3f4;
    padding: 2px 8px;
    border-radius: 10px;
  }
  .info {
    font-size: 10px;
    font-weight: 600;
    color: #d93025;
  }
</style>
</head><body>

<div class="header">
  <h1>📋 CRM Task Reminders</h1>
  <div class="date">${dateStr}</div>
  <div class="summary">⚠️ ${total} item${total > 1 ? "s" : ""} need attention</div>
</div>

${buildSection("OVERDUE",               "#d93025", "🔴", overdue)}
${buildSection("DUE SOON — within 3 days", "#e37400", "🟡", dueSoon)}
${buildSection("FOLLOW UP — TODAY / MISSED", "#c5221f", "📅", followToday)}
${buildSection("FOLLOW UP COMING",      "#1a73e8", "🔔", followSoon)}
${buildSection("NO END DATE SET",       "#9aa0a6", "⚪", noDate)}

</body></html>`;
}

// ============================================================
//  CURRENCY HELPERS
// ============================================================
const CURRENCY_FORMATS = {
  "RM":  '"RM "#,##0.00',
  "USD": '"USD $"#,##0.00',
  "CNY": '"CNY ¥"#,##0.00',
  "SGD": '"SGD $"#,##0.00',
  "IDR": '"IDR Rp"#,##0',
  "THB": '"THB ฿"#,##0.00'
};

const CURRENCY_LABELS = {
  "RM": "RM ", "USD": "USD $", "CNY": "CNY ¥",
  "SGD": "SGD $", "IDR": "IDR Rp", "THB": "THB ฿"
};

function getCurrencyFormat(currency) {
  return CURRENCY_FORMATS[currency] || CURRENCY_FORMATS["RM"];
}

// Tolerant SERVICE_CONFIG lookup — survives stray spaces in the key
function getServiceConfig(serviceName) {
  if (!serviceName) return null;
  const key = String(serviceName).trim();
  if (SERVICE_CONFIG[key]) return SERVICE_CONFIG[key];
  const match = Object.keys(SERVICE_CONFIG).find(k => k.trim() === key);
  return match ? SERVICE_CONFIG[match] : null;
}

function getServiceCurrency(serviceName) {
  const cfg = getServiceConfig(serviceName);
  return (cfg && cfg.currency) ? cfg.currency : "RM";
}

// The number format a row should use, read from its Type of Service
function getRowCurrencyFormat(sheet, row) {
  return getCurrencyFormat(getServiceCurrency(sheet.getRange(row, COL.SERVICE_TYPE).getValue()));
}

// ============================================================
//  WORKING DAYS CALCULATOR (skips Saturday & Sunday)
// ============================================================
function addWorkingDays(startDate, days) {
  if (!days || days <= 0) return new Date(startDate);
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++; // skip Sunday(0) and Saturday(6)
  }
  return result;
}


// ============================================================
//  4. ON EDIT  (replace your existing onEdit function)
// ============================================================
function onEdit(e) {
  try {
    const sheet = e.range.getSheet();
    // ── If editing a service sheet, sync back to CRM ────────
    if (SERVICE_SHEETS.includes(sheet.getName())) {
      syncServiceSheetToCRM(e);
      return;
    }
    if (sheet.getName() !== SHEET_NAME) return;

    const col = e.range.getColumn();
    const row = e.range.getRow();

    if (row <= HEADER_ROW) return;

    // ── Auto-generate Task ID ────────────────────────────────
    const taskIdCell  = sheet.getRange(row, COL.TASK_ID);
    const clientValue = sheet.getRange(row, COL.CLIENT).getValue();

    if (!taskIdCell.getValue() && clientValue) {
      // Only generate if Client column is not empty
      const lastRow = sheet.getLastRow();
      let maxNum = 0;
      for (let r = DATA_START_ROW; r <= lastRow; r++) {
        const existing = sheet.getRange(r, COL.TASK_ID).getValue();
        if (typeof existing === "string" && existing.startsWith("TASK-")) {
          const num = parseInt(existing.replace("TASK-", ""));
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
      const nextId = "TASK-" + String(maxNum + 1).padStart(3, "0");
      taskIdCell.setValue(nextId);

    } else if (!clientValue && !sheet.getRange(row, COL.SERVICE_TYPE).getValue()) {
      // If client AND service type are both empty = row is blank, clear Task ID
      taskIdCell.clearContent();
    }

    // ── Auto-fill Amount & Dates when Service Type selected ──
    // ── Auto-fill Amount & Dates when Service Type selected ──
    if (col === COL.SERVICE_TYPE) {
      const serviceVal = e.range.getValue();
      const config     = getServiceConfig(serviceVal);
      if (config) {
        const today   = new Date(); today.setHours(0, 0, 0, 0);
        const fmt     = getCurrencyFormat(config.currency);

        // Calculate End Date using working days only
        const endDate = addWorkingDays(today, config.days);

        // Set Start Date = today
        sheet.getRange(row, COL.START_DATE)
             .setValue(today)
             .setNumberFormat("dd/MM/yyyy");

        // Set End Date = today + working days
        sheet.getRange(row, COL.END_DATE)
             .setValue(endDate)
             .setNumberFormat("dd/MM/yyyy");

        // Set Expected End = same as End Date
        sheet.getRange(row, COL.EXPECTED_END)
             .setValue(endDate)
             .setNumberFormat("dd/MM/yyyy");

        // Set Follow Update = half of working days timeline
        const followDays = Math.round(config.days / 2);
        const followDate = addWorkingDays(today, followDays);
        sheet.getRange(row, COL.FOLLOW_UPDATE)
             .setValue(followDate)
             .setNumberFormat("dd/MM/yyyy");

        // Set Amount, Paid, Balance, Reward with correct currency format
        const existingAmount = sheet.getRange(row, COL.AMOUNT).getValue();
        if (!existingAmount) {
          sheet.getRange(row, COL.AMOUNT).setValue(config.amount).setNumberFormat(fmt);
        } else {
          sheet.getRange(row, COL.AMOUNT).setNumberFormat(fmt);
        }
        sheet.getRange(row, COL.PAID).setNumberFormat(fmt);
        sheet.getRange(row, COL.BALANCE).setNumberFormat(fmt);
        sheet.getRange(row, COL.REWARD).setNumberFormat(fmt);

        // Store currency in script properties for this row
        const props = PropertiesService.getScriptProperties();
        props.setProperty("CURRENCY_ROW_" + row, config.currency);
      }
    }

    // ── Auto-calculate Balance = Amount - Paid ──────────────
    if (col === COL.AMOUNT || col === COL.PAID) {
      const amountVal = sheet.getRange(row, COL.AMOUNT).getValue();
      const paidVal   = sheet.getRange(row, COL.PAID).getValue();
      const amount    = (typeof amountVal === "number" && !isNaN(amountVal)) ? amountVal : 0;
      const paid      = (typeof paidVal   === "number" && !isNaN(paidVal))   ? paidVal   : 0;
      const balanceCell = sheet.getRange(row, COL.BALANCE);
      if (amount === 0 && paid === 0) {
        balanceCell.clearContent();
      } else {
        balanceCell
          .setValue(amount - paid)
          .setNumberFormat(getRowCurrencyFormat(sheet, row));
      }
      applyFollowUpdateAlert(sheet, row); 
    }

    if (col === COL.START_DATE) {
      const startVal = e.range.getValue();
      if (startVal instanceof Date && !isNaN(startVal)) {
        const serviceVal   = sheet.getRange(row, COL.SERVICE_TYPE).getValue();
        const config       = getServiceConfig(serviceVal);
        const timelineDays = config ? config.days : 28;
        const followDays   = Math.round(timelineDays / 2);
        // Use working days for follow update
        const followDate   = addWorkingDays(startVal, followDays);
        sheet.getRange(row, COL.FOLLOW_UPDATE)
             .setValue(followDate)
             .setNumberFormat("dd/MM/yyyy");
      } else {
        sheet.getRange(row, COL.FOLLOW_UPDATE).clearContent();
      }
    }

    // ── Re-check row alert colour whenever relevant cols change
    if ([COL.STATUS, COL.BALANCE, COL.PAID, COL.AMOUNT].includes(col)) {
      applyFollowUpdateAlert(sheet, row);
    }

    // ── Show date picker when editing a date column ──────────
    if (DATE_COLUMNS.includes(col)) {
      if (e.range.getNumRows() > 1 || e.range.getNumColumns() > 1) return;
      PropertiesService.getScriptProperties().setProperties({
        "PICKER_ROW": String(row),
        "PICKER_COL": String(col)
      });
      showDatePicker(row, col);
    }

    // ── Keep Dashboard numbers live ──────────────────────────
    if (sheet.getName() === SHEET_NAME || SERVICE_SHEETS.includes(sheet.getName())) {
      refreshDashboardData();
    }

  } catch(err) {
    console.log("onEdit error: " + err.message);
  }
}


// ============================================================
//  4b. FOLLOW-UPDATE ALERT COLOURING  (add this new function)
//  Rule: if Status ≠ Completed/Complete  AND  Balance ≠ 0
//        → Follow Update cell = red background, white font
//        Otherwise → clear back to default
// ============================================================
function applyFollowUpdateAlert(sheet, row) {
  const status     = sheet.getRange(row, COL.STATUS).getValue();
  const balanceVal = sheet.getRange(row, COL.BALANCE).getValue();
  const balance    = (typeof balanceVal === "number" && !isNaN(balanceVal)) ? balanceVal : 0;

  const isComplete = ["Completed", "Complete"].includes(status);
  const hasBalance = balance > 0;

  const fmt = getRowCurrencyFormat(sheet, row);   // ← currency-aware now

  // ── Balance cell: red if balance > 0, regardless of status ──
  const balanceCell = sheet.getRange(row, COL.BALANCE);
  if (hasBalance) {
    balanceCell.setBackground("#d93025").setFontColor("#ffffff").setNumberFormat(fmt);
  } else {
    balanceCell.setBackground(null).setFontColor(null).setNumberFormat(fmt);
  }

  // ── Follow Update cell: red only if ALSO not complete ──
  const followCell = sheet.getRange(row, COL.FOLLOW_UPDATE);
  if (!isComplete && hasBalance) {
    followCell.setBackground("#d93025").setFontColor("#ffffff");
  } else {
    followCell.setBackground(null).setFontColor(null);
  }
}


// ============================================================
//  5. DATE PICKER
// ============================================================
function showDatePicker(row, col) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  let currentDate = new Date();
  if (sheet && row && col) {
    const val = sheet.getRange(row, col).getValue();
    if (val instanceof Date && !isNaN(val)) currentDate = val;
  }

  const colNames = {
    [COL.START_DATE]:    "Start Date",
    [COL.END_DATE]:      "End Date",
    [COL.FOLLOW_UPDATE]: "Follow Update",
    [COL.EXPECTED_END]:  "Expected End"
  };
  const colName = colNames[parseInt(col)] || "Date";

  const html = buildCalendarHTML(
    currentDate.getFullYear(), currentDate.getMonth(),
    currentDate.getDate(), row, col, colName
  );

  SpreadsheetApp.getUi().showSidebar(
    HtmlService.createHtmlOutput(html).setTitle("📅 " + colName).setWidth(300)
  );
}

function buildCalendarHTML(year, month, selectedDay, row, col, colName) {
  const monthNames = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];
  const today    = new Date();
  const todayD   = today.getDate(), todayM = today.getMonth(), todayY = today.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let cells = "", dayCount = 1;
  for (let w = 0; w < 6; w++) {
    cells += "<tr>";
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      if (idx < firstDay || dayCount > daysInMonth) {
        cells += "<td class='empty'></td>";
      } else {
        const isToday    = dayCount === todayD && month === todayM && year === todayY;
        const isSelected = dayCount === selectedDay;
        const isPast     = new Date(year, month, dayCount) < new Date(todayY, todayM, todayD);
        const cls = isSelected ? "selected" : isToday ? "today" : isPast ? "past" : "";
        cells += `<td class="${cls}" onclick="pickDate(${year},${month+1},${dayCount})">${dayCount}</td>`;
        dayCount++;
      }
    }
    cells += "</tr>";
    if (dayCount > daysInMonth) break;
  }

  const pM = month === 0  ? 11 : month - 1, pY = month === 0  ? year - 1 : year;
  const nM = month === 11 ? 0  : month + 1, nY = month === 11 ? year + 1 : year;

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; padding: 10px; user-select: none; }
  .col-label { text-align:center; font-size:11px; color:#1a73e8; font-weight:bold; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px; }
  .nav { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
  .nav button { background:#1a73e8; color:#fff; border:none; border-radius:6px; width:28px; height:28px; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .nav button:hover { background:#1557b0; }
  .nav h3 { font-size:13px; color:#202124; font-weight:600; }
  table { width:100%; border-collapse:separate; border-spacing:2px; }
  th { font-size:11px; color:#5f6368; font-weight:600; text-align:center; padding:4px 0; }
  td { text-align:center; padding:5px 2px; cursor:pointer; border-radius:50%; font-size:12px; color:#202124; width:14.28%; }
  td:not(.empty):hover { background:#e8f0fe; color:#1a73e8; }
  td.today { color:#1a73e8; font-weight:bold; border: 1.5px solid #1a73e8; }
  td.selected { background:#1a73e8 !important; color:#fff !important; font-weight:bold; }
  td.past { color:#bbb; }
  td.empty { cursor:default; }
  .today-btn { width:100%; margin-top:8px; padding:6px; background:#e8f0fe; border:none; border-radius:6px; cursor:pointer; font-size:12px; color:#1a73e8; font-weight:600; }
  .today-btn:hover { background:#d2e3fc; }
  .clear-btn { width:100%; margin-top:4px; padding:6px; background:#fce8e6; border:none; border-radius:6px; cursor:pointer; font-size:12px; color:#d93025; font-weight:600; }
  .clear-btn:hover { background:#f4c7c3; }
  .selected-display { text-align:center; font-size:11px; color:#5f6368; margin-top:8px; min-height:16px; }
</style>
</head><body>
<div class="col-label">📅 ${colName || "Date"}</div>
<div class="nav">
  <button onclick="navigate(${pY},${pM})">&#8249;</button>
  <h3>${monthNames[month]} ${year}</h3>
  <button onclick="navigate(${nY},${nM})">&#8250;</button>
</div>
<table>
  <tr><th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th></tr>
  ${cells}
</table>
<button class="today-btn" onclick="goToday()">Today</button>
<button class="clear-btn" onclick="clearDate()">✕ Clear Date</button>
<div class="selected-display" id="selDisplay">${selectedDay ? selectedDay + ' ' + monthNames[month] + ' ' + year : 'No date selected'}</div>
<script>
  function pickDate(y,m,d){
    document.getElementById('selDisplay').textContent = d+' ${monthNames[month]} '+y;
    const pad = n => String(n).padStart(2,'0');
    google.script.run.withSuccessHandler(()=>google.script.host.close()).setDateInCell(y+'-'+pad(m)+'-'+pad(d), ${row}, ${col});
  }
  function navigate(y,m){
    google.script.run.withSuccessHandler(html=>{document.open();document.write(html);document.close();}).getCalendarHTML(y,m,0,${row},${col},"${colName}");
  }
  function goToday(){
    const t=new Date(); navigate(t.getFullYear(), t.getMonth());
  }
  function clearDate(){
    google.script.run.withSuccessHandler(()=>google.script.host.close()).clearDateInCell(${row},${col});
  }
</script>
</body></html>`;
}

function getCalendarHTML(year, month, day, row, col, colName) {
  return buildCalendarHTML(year, month, day, row, col, colName);
}

function setDateInCell(dateStr, row, col) {
  if (!row || !col) return;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;
  sheet.getRange(parseInt(row), parseInt(col))
       .setValue(new Date(dateStr))
       .setNumberFormat("dd/MM/yyyy");
}

function clearDateInCell(row, col) {
  if (!row || !col) return;
  SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SHEET_NAME)
    ?.getRange(parseInt(row), parseInt(col))
    .clearContent();
}


// ============================================================
//  6. ROW HIGHLIGHTING BY STATUS
// ============================================================
function highlightByStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return;

  const colors = {
    "Intake":               "#e8f0fe",
    "Documents Pending":    "#fff8e1",
    "Processing":           "#fff3e0",
    "Processing Document":  "#fff3e0",
    "Under Review":         "#f3e5f5",
    "Submitted":            "#e3f2fd",
    "Awaiting Approval":    "#fce4ec",
    "Completed":            "#e8f5e9",
    "On Hold":              "#f5f5f5",
    "On Risk":              "#ffebee",
    "Reject":               "#fce8e6", 
    "Consult":              "#e8f0fe",   
  };

  for (let r = DATA_START_ROW; r <= lastRow; r++) {
    const status = sheet.getRange(r, COL.STATUS).getValue();
    const color  = colors[status] || "#ffffff";
    sheet.getRange(r, 1, 1, 17).setBackground(color); // updated to 16 columns
  }

  SpreadsheetApp.getUi().alert("✅ Rows highlighted by status!");
}

function applyFollowUpdateAlertAllRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  for (let r = DATA_START_ROW; r <= lastRow; r++) {
    applyFollowUpdateAlert(sheet, r);
  }
  SpreadsheetApp.getUi().alert("✅ Balance alert colours applied to all rows!");
}
// ============================================================
//  REPAIR — re-apply the correct currency to every CRM row
// ============================================================
function fixAllCurrencyFormats(sheetArg, silent) {
  // menu calls pass no real sheet — guard against it
  if (sheetArg && typeof sheetArg.getRange !== "function") sheetArg = null;

  const sheet = sheetArg || SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return;

  const n        = lastRow - DATA_START_ROW + 1;
  const services = sheet.getRange(DATA_START_ROW, COL.SERVICE_TYPE, n, 1).getValues();

  // Amount(12) Paid(13) Balance(14) Reward(15) are contiguous — one batch write
  const formats = services.map(s => {
    const f = getCurrencyFormat(getServiceCurrency(s[0]));
    return [f, f, f, f];
  });
  sheet.getRange(DATA_START_ROW, COL.AMOUNT, n, 4).setNumberFormats(formats);

  if (!silent) {
    SpreadsheetApp.getUi().alert("✅ Currency formats re-applied to " + n + " row(s).");
  }
}

// ============================================================
//  DASHBOARD CONFIGURATION
// ============================================================
const COMPANY_NAME = "Example SDN BHD";

const DASH = {
  PAGE:   "#EEF2F7",   // light grey canvas
  CARD:   "#FFFFFF",   // white cards
  NAVY:   "#102B4D",
  TILE:   "#102B4D",
  GOLD:   "#E1B555",
  TEXT:   "#2B3A52",
  MUTED:  "#6B7A90",
  WHITE:  "#FFFFFF"
};

const DROW = {
  TITLE: 1,
  DATE: 3,
  TILE1_LABEL: 5, TILE1_VALUE: 6,
  TILE2_LABEL: 8, TILE2_VALUE: 9,
  SECTION_HDR: 11,
  TABLE_HDR: 12,
  SERVICE_START: 13,
  PRIORITY_START: 13
};

// ============================================================
//  1. BUILD DASHBOARD LAYOUT (ONE-TIME RESET)
// ============================================================
function buildDashboardLayout() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let dash = ss.getSheetByName("Dashboard");
  if (dash) {
    try { dash.protect().remove(); } catch(e) {}
    ss.deleteSheet(dash);
  }
  dash = ss.insertSheet("Dashboard", 0);
  dash.setTabColor(DASH.NAVY);

  dash.getRange(1, 1, 150, 14).setBackground(DASH.PAGE);

  // Column widths — wider right side so tiles/values aren't clipped
  dash.setColumnWidths(1, 7, 90);
  dash.setColumnWidth(8, 20);
  dash.setColumnWidths(9, 5, 100);
  dash.setColumnWidth(14, 60);

  // ---- Masthead Banner ----
  dash.setRowHeight(1, 34); dash.setRowHeight(2, 20); dash.setRowHeight(3, 20);
  dash.getRange(1, 1, 3, 14).setBackground(DASH.NAVY);
  dash.getRange(1, 1, 2, 14).merge()
    .setValue("♦  Example SDN BHD  ♦")
    .setFontSize(20).setFontWeight("bold").setFontColor(DASH.GOLD)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");

  dash.getRange(3, 1, 1, 7).merge()
    .setFormula('="  📅  "&UPPER(TEXT(TODAY(),"DDDD, DD MMMM YYYY"))')
    .setFontColor(DASH.WHITE).setFontSize(10);
  dash.getRange(3, 8, 1, 7).merge()
    .setFormula('="🏆 COMPLETION RATE:  "&TEXT(IFERROR(COUNTIF(\'' + SHEET_NAME + '\'!D2:D5000,"Completed")/COUNTA(\'' + SHEET_NAME + '\'!A2:A5000),0),"0.0%")&"  "')
    .setFontColor(DASH.GOLD).setFontSize(10).setHorizontalAlignment("right");

  dash.setRowHeight(4, 10);

  // ---- KPI Tile Row 1 (Solid colors) ----
  const row1Tiles = [
    { label: "📁 TOTAL TASKS",    cols: [1, 2],   bg: "#102B4D", text: "#FFFFFF", labelColor: "#E1B555" },
    { label: "🔄 NOT COMPLETE",   cols: [3, 4],   bg: "#0F57B0", text: "#FFFFFF", labelColor: "#FFFFFF" },
    { label: "✅ COMPLETED",      cols: [5, 7],   bg: "#0C7B43", text: "#FFFFFF", labelColor: "#FFFFFF" },
    { label: "⚠️ ON RISK",        cols: [9, 10],  bg: "#A6121F", text: "#FFFFFF", labelColor: "#FFFFFF" },
    { label: "⏸ ON HOLD",         cols: [11, 12], bg: "#3D5266", text: "#FFFFFF", labelColor: "#FFFFFF" },
    { label: "💸 UNPAID BALANCE", cols: [13, 14], bg: "#C05A0A", text: "#FFFFFF", labelColor: "#FFFFFF" }
  ];
  buildTileRow(dash, DROW.TILE1_LABEL, DROW.TILE1_VALUE, row1Tiles);

  dash.setRowHeight(7, 10);

  // ---- KPI Tile Row 2 (Soft tints) ----
  const row2Tiles = [
    { label: "🔴 OVERDUE",       cols: [1, 2],   bg: "#FDECEC", text: "#A6121F", labelColor: "#A6121F" },
    { label: "🔥 DUE TODAY",     cols: [3, 4],   bg: "#FDF1E3", text: "#C05A0A", labelColor: "#C05A0A" },
    { label: "⚠️ DUE TOMORROW",  cols: [5, 7],   bg: "#FEF8E6", text: "#8A6D10", labelColor: "#8A6D10" },
    { label: "💰 FULLY PAID",    cols: [9, 10],  bg: "#E6F4EC", text: "#0C7B43", labelColor: "#0C7B43" },
    { label: "📌 EASY CLOSE",    cols: [11, 12], bg: "#E9F0FB", text: "#0F57B0", labelColor: "#0F57B0" },
    { label: "📈 % COMPLETE",    cols: [13, 14], bg: "#E9F0FB", text: "#0F57B0", labelColor: "#0F57B0" }
  ];
  buildTileRow(dash, DROW.TILE2_LABEL, DROW.TILE2_VALUE, row2Tiles);

  dash.setRowHeight(10, 16);

  // Make Dashboard Sheet Protected (read-only)
  try {
    const protect = dash.protect().setDescription("Read-only Dashboard");
    protect.removeEditors(protect.getEditors());
    if (protect.canDomainEdit()) protect.setDomainEdit(false);
  } catch(e) {
    console.log("Failed to set dashboard protection: " + e.message);
  }

  refreshDashboardData();
}

function buildTileRow(dash, labelRow, valueRow, tiles) {
  dash.setRowHeight(labelRow, 18);
  dash.setRowHeight(valueRow, 32);

  tiles.forEach(t => {
    const colStart = t.cols[0];
    const colEnd = t.cols[1] || t.cols[0];
    const numCols = colEnd - colStart + 1;

    dash.getRange(labelRow, colStart, 1, numCols).merge()
      .setValue(t.label)
      .setBackground(t.bg)
      .setFontColor(t.labelColor || "#FFFFFF")
      .setFontSize(8)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    dash.getRange(valueRow, colStart, 1, numCols).merge()
      .setBackground(t.bg)
      .setFontColor(t.text)
      .setFontSize(16)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    dash.getRange(labelRow, colStart, 2, numCols)
      .setBorder(true, true, true, true, false, false, DASH.GOLD, SpreadsheetApp.BorderStyle.SOLID);
  });
}

// ============================================================
//  2. DYNAMICALLY REFRESH DATA (AUTO ON EDIT)
// ============================================================
function refreshDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dash = ss.getSheetByName("Dashboard");
  if (!dash) return;
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return;

  const data = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, COL.DOCUMENT).getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // KPI counters
  let totalTasks = 0;
  let notComplete = 0;
  let completed = 0;
  let onRisk = 0;
  let onHold = 0;
  let rejected = 0;   // ← ADD THIS
  let consulted = 0;  // ← ADD THIS
  let unpaidRM = 0;
  let unpaidUSD = 0;
  const unpaidByCurrency = {};

  let overdue = 0;
  let dueToday = 0;
  let dueTomorrow = 0;
  let fullyPaid = 0;
  let easyClose = 0;

  const serviceStats = {};
  const priorityStats = {
    "Easy Close": { total: 0, active: 0, done: 0 },
    "Work Needed": { total: 0, active: 0, done: 0 },
    "Complex": { total: 0, active: 0, done: 0 },
    "Risk Line": { total: 0, active: 0, done: 0 },
    "Complete": { total: 0, active: 0, done: 0 },
    "Reject": { total: 0, active: 0, done: 0 },
    "Canceled": { total: 0, active: 0, done: 0 },
  };
  const ownerStats = {};
  const deadlineAlertsList = [];

  data.forEach(row => {
    const taskId = row[COL.TASK_ID - 1];
    const client = row[COL.CLIENT - 1];
    const serviceType = row[COL.SERVICE_TYPE - 1];
    const status = row[COL.STATUS - 1];
    const priority = row[COL.PRIORITY - 1];
    const owner = row[COL.OWNER - 1];
    const endDate = row[COL.END_DATE - 1];
    const expEnd = row[COL.EXPECTED_END - 1];
    const balanceVal = row[COL.BALANCE - 1];

    if (!taskId && !client) return;

    totalTasks++;

    const isDone = ["Completed", "Complete"].includes(status);
    if (isDone) completed++;
    else notComplete++;

    if (status === "On Risk") onRisk++;
    if (status === "On Hold") onHold++;
    if (status === "Reject") rejected++;    // ← ADD THIS
    if (status === "Canceled") consulted++;  // ← ADD THIS

    const balance = (typeof balanceVal === "number" && !isNaN(balanceVal)) ? balanceVal : 0;

    if (balance > 0) {
      const cur = getServiceCurrency(serviceType);
      unpaidByCurrency[cur] = (unpaidByCurrency[cur] || 0) + balance;
    } else {
      fullyPaid++;
    }

    if (priority === "Easy Close" && !isDone) {
      easyClose++;
    }

    const dateRef = endDate instanceof Date && !isNaN(endDate) ? endDate
                  : expEnd instanceof Date && !isNaN(expEnd) ? expEnd : null;

    let daysLeft = null;
    if (dateRef) {
      const due = new Date(dateRef);
      due.setHours(0, 0, 0, 0);
      daysLeft = Math.round((due - today) / 86400000);
      if (!isDone) {
        if (daysLeft < 0) overdue++;
        else if (daysLeft === 0) dueToday++;
        else if (daysLeft === 1) dueTomorrow++;
      }
    }

    if (serviceType) {
      if (!serviceStats[serviceType]) {
        serviceStats[serviceType] = { total: 0, active: 0, done: 0, balanceOwed: 0 };
      }
      serviceStats[serviceType].total++;
      if (isDone) serviceStats[serviceType].done++;
      else serviceStats[serviceType].active++;
      serviceStats[serviceType].balanceOwed += balance;
    }

    if (priority && priorityStats[priority]) {
      priorityStats[priority].total++;
      if (isDone) priorityStats[priority].done++;
      else priorityStats[priority].active++;
    }

    // Count Reject/Canceled by status into priority-like rows
    if (status === "Reject" && priorityStats["Reject"]) {
      priorityStats["Reject"].total++;
      priorityStats["Reject"].active++;
    }
    if (status === "Canceled" && priorityStats["Canceled"]) {
      priorityStats["Canceled"].total++;
      priorityStats["Canceled"].active++;
    }

    if (owner) {
      if (!ownerStats[owner]) {
        ownerStats[owner] = { total: 0, active: 0, done: 0 };
      }
      ownerStats[owner].total++;
      if (isDone) ownerStats[owner].done++;
      else ownerStats[owner].active++;
    }

    // Only alert on tasks due within 3 days (or already overdue)
    if (!isDone && dateRef && daysLeft !== null && daysLeft <= 3) {
      deadlineAlertsList.push({
        taskId: taskId || "—",
        client: client || "—",
        service: serviceType || "—",
        owner: owner || "—",
        status: status || "—",
        deadline: dateRef,
        daysLeft: daysLeft
      });
    }
  });

  const percentComplete = totalTasks > 0 ? completed / totalTasks : 0;

  // Temporarily bypass protection warnings to execute writes
  let protect = null;
  try {
    protect = dash.getProtections(SpreadsheetApp.ProtectionType.SHEET)[0];
    if (protect) protect.setWarningOnly(true);
  } catch(e) {}

  // ── A. Clear Everything Below Row 10 ──
  const maxRows = dash.getMaxRows();
  if (maxRows > 10) {
    try {
      dash.getRange(11, 1, maxRows - 10, 14).breakApart();
    } catch(e) {}
    dash.getRange(11, 1, maxRows - 10, 14)
      .clearContent()
      .setBackground(DASH.PAGE)
      .setFontColor(DASH.TEXT)
      .setFontWeight("normal")
      .setFontStyle("normal")
      .setFontSize(9)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setBorder(false, false, false, false, false, false);
  }

  // ── B. Update KPI Tiles (correct merge-anchor columns: 9, 11, 13) ──
  dash.getRange(DROW.TILE1_VALUE, 1).setValue(totalTasks);
  dash.getRange(DROW.TILE1_VALUE, 3).setValue(notComplete);
  dash.getRange(DROW.TILE1_VALUE, 5).setValue(completed);
  dash.getRange(DROW.TILE1_VALUE, 9).setValue(onRisk);
  dash.getRange(DROW.TILE1_VALUE, 11).setValue(onHold);

  const unpaidKeys = Object.keys(unpaidByCurrency).sort();
  const unpaidStr = unpaidKeys.length
    ? unpaidKeys.map(c =>
        (CURRENCY_LABELS[c] || (c + " ")) +
        unpaidByCurrency[c].toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2})
      ).join("\n")
    : "RM 0.00";

  dash.getRange(DROW.TILE1_VALUE, 13)
    .setValue(unpaidStr)
    .setNumberFormat("@")
    .setFontSize(11)
    .setWrap(true)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  dash.setRowHeight(DROW.TILE1_VALUE, Math.max(42, 14 * Math.max(1, unpaidKeys.length) + 14));

  dash.getRange(DROW.TILE2_VALUE, 1).setValue(overdue);
  dash.getRange(DROW.TILE2_VALUE, 3).setValue(dueToday);
  dash.getRange(DROW.TILE2_VALUE, 5).setValue(dueTomorrow);
  dash.getRange(DROW.TILE2_VALUE, 9).setValue(fullyPaid);
  dash.getRange(DROW.TILE2_VALUE, 11).setValue(easyClose);
  dash.getRange(DROW.TILE2_VALUE, 13).setValue(percentComplete).setNumberFormat("0.0%");

  const border = (r1, c1, numRows, numCols) =>
    dash.getRange(r1, c1, numRows, numCols)
      .setBorder(true, true, true, true, false, false, DASH.GOLD, SpreadsheetApp.BorderStyle.SOLID);
  const panel = (r1, c1, numRows, numCols) =>
    dash.getRange(r1, c1, numRows, numCols).setBackground(DASH.CARD);

  // ── C. Services Table (Left, Columns 1-7) ──
  const sortedServices = Object.keys(serviceStats).map(name => ({
    name: name, stats: serviceStats[name]
  })).sort((a, b) => b.stats.total - a.stats.total);

  const leftBottom = DROW.SERVICE_START + (sortedServices.length > 0 ? sortedServices.length - 1 : 0);

  panel(DROW.SECTION_HDR, 1, leftBottom - 11 + 1, 7);
  dash.getRange(DROW.SECTION_HDR, 1, 1, 7).merge()
    .setValue("  ▎ TASKS BY SERVICE")
    .setBackground(DASH.NAVY).setFontColor(DASH.GOLD).setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("left");

  dash.getRange(DROW.TABLE_HDR, 1, 1, 7).setBackground(DASH.NAVY).setFontColor(DASH.GOLD).setFontWeight("bold");
  dash.getRange(DROW.TABLE_HDR, 1, 1, 3).merge().setValue("Service");
  dash.getRange(DROW.TABLE_HDR, 4).setValue("Total");
  dash.getRange(DROW.TABLE_HDR, 5).setValue("Active");
  dash.getRange(DROW.TABLE_HDR, 6).setValue("Done");
  dash.getRange(DROW.TABLE_HDR, 7).setValue("Balance Owed");
  border(DROW.SECTION_HDR, 1, leftBottom - 11 + 1, 7);

  if (sortedServices.length > 0) {
    sortedServices.forEach((svc, i) => {
      const r = DROW.SERVICE_START + i;
      dash.getRange(r, 1, 1, 3).merge().setValue(svc.name).setBackground("#FFFFFF").setHorizontalAlignment("left").setFontSize(9).setFontColor(DASH.TEXT);
      dash.getRange(r, 4).setValue(svc.stats.total).setBackground("#FFFFFF").setFontSize(9).setFontColor(DASH.TEXT);
      dash.getRange(r, 5).setValue(svc.stats.active).setBackground("#FFFFFF").setFontSize(9).setFontColor(DASH.TEXT);
      dash.getRange(r, 6).setValue(svc.stats.done).setBackground("#FFFFFF").setFontSize(9).setFontColor(DASH.TEXT);
      dash.getRange(r, 7).setValue(svc.stats.balanceOwed).setBackground("#FFFFFF").setNumberFormat(getCurrencyFormat(getServiceCurrency(svc.name))).setFontSize(9).setFontColor(svc.stats.balanceOwed > 0 ? "#A6121F" : DASH.TEXT);

      if (i < sortedServices.length - 1) {
        dash.getRange(r, 1, 1, 7).setBorder(null, null, true, null, null, null, "#E3E9F2", SpreadsheetApp.BorderStyle.SOLID);
      }
    });
  }

    // ── D. Priorities Table (Right, Columns 9-15) ──
  const prCardRows = (DROW.PRIORITY_START + PRIORITIES.length) - DROW.SECTION_HDR;
  panel(DROW.SECTION_HDR, 9, prCardRows, 7); // Changed to 7 columns
  dash.getRange(DROW.SECTION_HDR, 9, 1, 7).merge()
    .setValue("  ▎ TASKS BY PRIORITY")
    .setBackground(DASH.NAVY).setFontColor(DASH.GOLD).setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("left");

  dash.getRange(DROW.TABLE_HDR, 9, 1, 7).setBackground(DASH.NAVY).setFontColor(DASH.GOLD).setFontWeight("bold");
  dash.getRange(DROW.TABLE_HDR, 9, 1, 2).merge().setValue("Priority");
  dash.getRange(DROW.TABLE_HDR, 11).setValue("Total");
  dash.getRange(DROW.TABLE_HDR, 12).setValue("Active");
  dash.getRange(DROW.TABLE_HDR, 13).setValue("Done");
  dash.getRange(DROW.TABLE_HDR, 14).setValue("Reject"); // NEW
  dash.getRange(DROW.TABLE_HDR, 15).setValue("Consult"); // NEW
  border(DROW.SECTION_HDR, 9, prCardRows, 7);

  const PRIORITY_DISPLAY = [...PRIORITIES, "Reject", "Canceled"];

  PRIORITY_DISPLAY.forEach((prio, i) => {
    const r = DROW.PRIORITY_START + i;
    const stats = priorityStats[prio] || { total: 0, active: 0, done: 0, rejected: 0, consulted: 0 };

    let bg = "#FFFFFF";
    let textCol = DASH.TEXT;
    if (prio === "Easy Close")   { bg = "#E9F0FB"; textCol = "#0F57B0"; }
    else if (prio === "Work Needed") { bg = "#FEF8E6"; textCol = "#8A6D10"; }
    else if (prio === "Complex") { bg = "#EEF1F5"; textCol = "#3D5266"; }
    else if (prio === "Risk Line") { bg = "#FDECEC"; textCol = "#A6121F"; }
    else if (prio === "Complete") { bg = "#E6F4EC"; textCol = "#0C7B43"; }
    else if (prio === "Reject")   { bg = "#fce8e6"; textCol = "#d93025"; }
    else if (prio === "Canceled") { bg = "#f5f5f5"; textCol = "#6b7280"; }

    dash.getRange(r, 9, 1, 2).merge().setValue(prio).setBackground(bg).setFontColor(textCol).setHorizontalAlignment("left").setFontSize(9);
    dash.getRange(r, 11).setValue(stats.total).setBackground(bg).setFontColor(textCol).setFontSize(9);
    dash.getRange(r, 12).setValue(stats.active).setBackground(bg).setFontColor(textCol).setFontSize(9);
    dash.getRange(r, 13).setValue(stats.done).setBackground(bg).setFontColor(textCol).setFontSize(9);
    dash.getRange(r, 14).setValue(stats.rejected || 0).setBackground(bg).setFontColor("#d93025").setFontSize(9); // NEW
    dash.getRange(r, 15).setValue(stats.consulted || 0).setBackground(bg).setFontColor("#1a73e8").setFontSize(9); // NEW

    if (i < PRIORITIES.length - 1) {
      dash.getRange(r, 9, 1, 7).setBorder(null, null, true, null, null, null, "#E3E9F2", SpreadsheetApp.BorderStyle.SOLID);
    }
  });

  // ── E. Team Workload Table (Right, Columns 9-13) ──
  const sortedOwners = Object.keys(ownerStats).map(name => ({
    name: name, stats: ownerStats[name]
  })).sort((a, b) => b.stats.total - a.stats.total);

  const teamHeaderRow = 20;
  const teamTableHdrRow = 21;
  const teamStartRow = 22;
  const rightBottom = teamStartRow + (sortedOwners.length > 0 ? sortedOwners.length - 1 : 0);

  const teamCardRows = rightBottom - teamHeaderRow + 1;
  panel(teamHeaderRow, 9, teamCardRows, 5);
  dash.getRange(teamHeaderRow, 9, 1, 5).merge()
    .setValue("  ▎ TEAM WORKLOAD")
    .setBackground(DASH.NAVY).setFontColor(DASH.GOLD).setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("left");

  dash.getRange(teamTableHdrRow, 9, 1, 5).setBackground(DASH.NAVY).setFontColor(DASH.GOLD).setFontWeight("bold");
  dash.getRange(teamTableHdrRow, 9, 1, 2).merge().setValue("Owner");
  dash.getRange(teamTableHdrRow, 11).setValue("Tasks");
  dash.getRange(teamTableHdrRow, 12).setValue("Active");
  dash.getRange(teamTableHdrRow, 13).setValue("Done");
  border(teamHeaderRow, 9, teamCardRows, 5);

  if (sortedOwners.length > 0) {
    sortedOwners.forEach((owner, i) => {
      const r = teamStartRow + i;
      dash.getRange(r, 9, 1, 2).merge().setValue(owner.name).setBackground("#FFFFFF").setHorizontalAlignment("left").setFontSize(9).setFontColor(DASH.TEXT);
      dash.getRange(r, 11).setValue(owner.stats.total).setBackground("#FFFFFF").setFontSize(9).setFontColor(DASH.TEXT);
      dash.getRange(r, 12).setValue(owner.stats.active).setBackground("#FFFFFF").setFontSize(9).setFontColor(DASH.TEXT);
      dash.getRange(r, 13).setValue(owner.stats.done).setBackground("#FFFFFF").setFontSize(9).setFontColor(DASH.TEXT);

      if (i < sortedOwners.length - 1) {
        dash.getRange(r, 9, 1, 5).setBorder(null, null, true, null, null, null, "#E3E9F2", SpreadsheetApp.BorderStyle.SOLID);
      }
    });
  }

  // ── F. Deadline Alerts (Columns 1-14) ──
const alertsHeaderRow = Math.max(leftBottom, rightBottom) + 2;
const alertsTableHdr = alertsHeaderRow + 1;
const alertsStart = alertsHeaderRow + 2;

deadlineAlertsList.sort((a, b) => a.daysLeft - b.daysLeft);
const alertsBottom = alertsStart + (deadlineAlertsList.length > 0 ? deadlineAlertsList.length - 1 : 0);

const alertCardRows = alertsBottom - alertsHeaderRow + 1;
panel(alertsHeaderRow, 1, alertCardRows, 14);
dash.getRange(alertsHeaderRow, 1, 1, 14).merge()
  .setValue("  ▎ DEADLINE ALERTS — Due within 3 days · Overdue first")
  .setBackground("#A6121F").setFontColor(DASH.WHITE).setFontWeight("bold").setFontSize(10)
  .setHorizontalAlignment("left");

const alertHeaders = ["Task ID", "Client", "Service", "Owner", "Status", "Deadline", "Days Left", "Alert"];
const alertCols = [1, 3, 5, 7, 9, 11, 12, 13];
dash.getRange(alertsTableHdr, 1, 1, 14).setFontWeight("bold").setFontColor(DASH.GOLD).setBackground(DASH.NAVY);
alertHeaders.forEach((h, i) => {
  if (i < 5) dash.getRange(alertsTableHdr, alertCols[i], 1, 2).merge().setValue(h);
  else if (i === 7) dash.getRange(alertsTableHdr, alertCols[i], 1, 2).merge().setValue(h);
  else dash.getRange(alertsTableHdr, alertCols[i]).setValue(h);
});
border(alertsHeaderRow, 1, alertCardRows, 14);

if (deadlineAlertsList.length > 0) {
  deadlineAlertsList.forEach((alert, i) => {
    const r = alertsStart + i;
    dash.getRange(r, 1, 1, 2).merge().setValue(alert.taskId).setBackground("#FFFFFF").setFontSize(9).setFontColor(DASH.NAVY).setFontWeight("bold");
    dash.getRange(r, 3, 1, 2).merge().setValue(alert.client).setBackground("#FFFFFF").setHorizontalAlignment("left").setFontSize(9).setFontColor(DASH.TEXT);
    dash.getRange(r, 5, 1, 2).merge().setValue(alert.service).setBackground("#FFFFFF").setHorizontalAlignment("left").setFontSize(9).setFontColor(DASH.MUTED);
    dash.getRange(r, 7, 1, 2).merge().setValue(alert.owner).setBackground("#FFFFFF").setFontSize(9).setFontColor(DASH.TEXT);
    dash.getRange(r, 9, 1, 2).merge().setValue(alert.status).setBackground("#FFFFFF").setFontSize(9).setFontColor(DASH.MUTED);
    dash.getRange(r, 11).setValue(alert.deadline).setBackground("#FFFFFF").setNumberFormat("dd/MM/yyyy").setFontSize(9).setFontColor(DASH.MUTED);
    dash.getRange(r, 12).setValue(alert.daysLeft).setBackground("#FFFFFF").setFontSize(9).setFontColor("#A6121F").setFontWeight("bold");

    const alertCell = dash.getRange(r, 13, 1, 2).merge().setFontSize(9).setFontWeight("bold");
    if (alert.daysLeft < 0) {
      alertCell.setValue("🚨 OVERDUE!").setBackground("#FDECEC").setFontColor("#A6121F");
    } else if (alert.daysLeft === 0) {
      alertCell.setValue("🔥 DUE TODAY!").setBackground("#FDF1E3").setFontColor("#C05A0A");
    } else if (alert.daysLeft === 1) {
      alertCell.setValue("⚠️ Due Tomorrow").setBackground("#FEF8E6").setFontColor("#8A6D10");
    } else {
      alertCell.setValue(`📅 Due in ${alert.daysLeft} d`).setBackground("#E9F0FB").setFontColor("#0F57B0");
    }

    if (i < deadlineAlertsList.length - 1) {
      dash.getRange(r, 1, 1, 14).setBorder(null, null, true, null, null, null, "#E3E9F2", SpreadsheetApp.BorderStyle.SOLID);
    }
  });
}

  // ── G. Quick Guide ──
  const guideHeaderRow = alertsBottom + 2;
  const guideStart = guideHeaderRow + 1;

  const guide = [
    ["Add a task",     "Type Client/Company + Service Type in CRM. Task ID fills in automatically."],
    ["Service Type",   "Selecting it auto-fills Start Date, End Date, Expected End, Follow Update and Amount."],
    ["Balance",        "Amount − Paid, calculated automatically. Turns red when balance > 0 and status isn't Completed."],
    ["Follow Update",  "Turns red when a balance is still owed and the task isn't Completed — a reminder to chase payment."],
    ["Deadline Alerts","This dashboard lists tasks due within 3 days, ranked overdue first."],
    ["View-Only Mode", "This dashboard is protected and view-only to prevent editing. It updates automatically on CRM edits."]
  ];

  const guideCardRows = guide.length + 1;
  panel(guideHeaderRow, 1, guideCardRows, 14);
  dash.getRange(guideHeaderRow, 1, 1, 14).merge()
    .setValue("  📌 QUICK GUIDE")
    .setBackground(DASH.NAVY).setFontColor(DASH.GOLD).setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("left");
  border(guideHeaderRow, 1, guideCardRows, 14);

  guide.forEach((row, i) => {
    const r = guideStart + i;
    dash.getRange(r, 1, 1, 2).merge().setValue(row[0]).setBackground("#FFFFFF")
      .setFontColor(DASH.NAVY).setFontWeight("bold").setFontSize(9).setVerticalAlignment("top").setHorizontalAlignment("left");
    dash.getRange(r, 3, 1, 12).merge().setValue(row[1]).setBackground("#FFFFFF")
      .setFontColor(DASH.MUTED).setFontSize(9).setWrap(true).setVerticalAlignment("top").setHorizontalAlignment("left");
    dash.setRowHeight(r, 30);

    if (i < guide.length - 1) {
      dash.getRange(r, 1, 1, 14).setBorder(null, null, true, null, null, null, "#E3E9F2", SpreadsheetApp.BorderStyle.SOLID);
    }
  });

  try {
    if (protect) protect.setWarningOnly(false);
  } catch(e) {}
}

// ============================================================
//  8. MARK FOLLOW DONE & ROLL TO NEXT +14 DAYS
// ============================================================
function markFollowDone() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const row = sheet.getActiveCell().getRow();
  if (row <= HEADER_ROW) {
    SpreadsheetApp.getUi().alert("⚠️ Please click on a data row first.");
    return;
  }

  const status = sheet.getRange(row, COL.STATUS).getValue();
  if (["Completed", "Complete"].includes(status)) {
    SpreadsheetApp.getUi().alert("ℹ️ This task is already Completed. No follow-up needed.");
    return;
  }

  const today       = new Date(); today.setHours(0, 0, 0, 0);
  const nextFollow  = new Date(today);
  nextFollow.setDate(nextFollow.getDate() + 14);

  // ── Log to Notes ──────────────────────────────────────────
  const notesCell    = sheet.getRange(row, COL.NOTES);
  const existingNote = notesCell.getValue() || "";
  const dateStr      = Utilities.formatDate(today, Session.getScriptTimeZone(), "dd/MM/yyyy");
  const logEntry     = `[Followed: ${dateStr}]`;
  const newNote      = existingNote ? existingNote + "  " + logEntry : logEntry;
  notesCell.setValue(newNote);

  // ── Set next Follow Update date ───────────────────────────
  sheet.getRange(row, COL.FOLLOW_UPDATE)
       .setValue(nextFollow)
       .setNumberFormat("dd/MM/yyyy");

  // ── Re-apply alert colouring ──────────────────────────────
  applyFollowUpdateAlert(sheet, row);

  const nextStr = Utilities.formatDate(nextFollow, Session.getScriptTimeZone(), "dd/MM/yyyy");
  const client  = sheet.getRange(row, COL.CLIENT).getValue() || "this task";
  SpreadsheetApp.getUi().alert(
    `✅ Follow-up logged for ${client}!\n\n` +
    `📅 Next follow-up set to: ${nextStr}\n` +
    `📝 Logged in Notes: ${logEntry}`
  );
}

function resetServiceTypes() {
  PropertiesService.getScriptProperties().deleteProperty("SERVICE_TYPES");
  refreshDropdowns();
  SpreadsheetApp.getUi().alert("✅ Service types updated from script!");
}

// ============================================================
//  9. SERVICE SHEETS — CREATE & REFRESH
// ============================================================
function createServiceSheets() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const crmSheet = ss.getSheetByName(SHEET_NAME);
  if (!crmSheet) { ui.alert("❌ CRM sheet not found."); return; }

  const headers = [
    "Task ID", "Client / Company", "Type of Service", "Status",
    "Priority", "Owner", "Notes", "Start Date", "End Date",
    "Follow Update", "Expected End", "Amount", "Paid", "Balance", "Reward", "Contact Details"
  ];

  SERVICE_SHEETS.forEach(serviceName => {
    let sheet = ss.getSheetByName(serviceName);
    if (!sheet) sheet = ss.insertSheet(serviceName);
    else sheet.clear();

    // Header row
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setBackground("#1a73e8")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    sheet.setRowHeight(1, 36);
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(1);

    // Column widths
    const widths = [110, 180, 160, 155, 120, 130, 200, 110, 110, 120, 120, 100, 90, 90, 90, 210];
    widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

    // Date formatting
    DATE_COLUMNS.forEach(col => {
      sheet.getRange(DATA_START_ROW, col, 999).setNumberFormat("dd/MM/yyyy");
    });

    // Currency formatting — per-service currency
    const svcFmt = getCurrencyFormat(getServiceCurrency(serviceName));
    [COL.AMOUNT, COL.PAID, COL.BALANCE, COL.REWARD].forEach(col => {
      sheet.getRange(DATA_START_ROW, col, 999).setNumberFormat(svcFmt);
    });

    // Contact plain text
    sheet.getRange(DATA_START_ROW, COL.CONTACT, 999).setNumberFormat("@");

    // Tab colour per service
    const tabColors = ["#1a73e8","#0f9d58","#f29900","#d93025","#9334e6","#00838f"];
    const idx = SERVICE_SHEETS.indexOf(serviceName);
    sheet.setTabColor(tabColors[idx] || "#1a73e8");
  });

  refreshServiceSheets();
  ui.alert("✅ Service sheets created!\nData has been synced from CRM.");
}

function refreshServiceSheets() {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const crmSheet = ss.getSheetByName(SHEET_NAME);
  if (!crmSheet) return;

  // ── Read FRESH data from CRM every time ──────────────────
  const lastRow = crmSheet.getLastRow();
  if (lastRow < DATA_START_ROW) return;

  // Force fresh read by flushing first
  SpreadsheetApp.flush();

  const allData = crmSheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 16).getValues();
  const allBgs  = crmSheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 16).getBackgrounds();

  SERVICE_SHEETS.forEach(serviceName => {
    const sheet = ss.getSheetByName(serviceName);
    if (!sheet) return;

    // Clear ALL data rows completely
    const lastServiceRow = sheet.getLastRow();
    if (lastServiceRow >= DATA_START_ROW) {
      sheet.getRange(DATA_START_ROW, 1, lastServiceRow - DATA_START_ROW + 1, 16).clear();
    }

    // Filter rows matching this service fresh from CRM
    const matchingRows = allData
      .map((row, i) => ({ row, bg: allBgs[i] }))
      .filter(({ row }) => row[COL.SERVICE_TYPE - 1] === serviceName);

    if (matchingRows.length === 0) return;

    // Write fresh data
    const values = matchingRows.map(({ row }) => row);
    const bgs    = matchingRows.map(({ bg }) => bg);

    sheet.getRange(DATA_START_ROW, 1, values.length, 16).setValues(values);
    sheet.getRange(DATA_START_ROW, 1, bgs.length,    16).setBackgrounds(bgs);

    // Re-apply formatting
    DATE_COLUMNS.forEach(col => {
      sheet.getRange(DATA_START_ROW, col, values.length).setNumberFormat("dd/MM/yyyy");
    });
    const svcFmt = getCurrencyFormat(getServiceCurrency(serviceName));
    [COL.AMOUNT, COL.PAID, COL.BALANCE, COL.REWARD].forEach(col => {
      sheet.getRange(DATA_START_ROW, col, values.length).setNumberFormat(svcFmt);
    });
    sheet.getRange(DATA_START_ROW, COL.CONTACT, values.length).setNumberFormat("@");

    // Re-apply alert colours
    for (let r = DATA_START_ROW; r < DATA_START_ROW + values.length; r++) {
      applyFollowUpdateAlert(sheet, r);
    }
  });

  SpreadsheetApp.getActiveSpreadsheet().toast("✅ All service sheets refreshed!", "Done", 3);
}


// ============================================================
//  10. ON EDIT — SERVICE SHEET → SYNC BACK TO CRM
// ============================================================
function syncServiceSheetToCRM(e) {
  const sheet     = e.range.getSheet();
  const sheetName = sheet.getName();

  if (!SERVICE_SHEETS.includes(sheetName)) return;

  const col = e.range.getColumn();
  const row = e.range.getRow();
  if (row <= HEADER_ROW) return;

  const crmSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!crmSheet) return;

  const taskId = sheet.getRange(row, COL.TASK_ID).getValue();

  if (!taskId) {
    // ── New row — sync entire row to CRM ──────────────────
    const newRowData = sheet.getRange(row, 1, 1, 16).getValues()[0];
    const crmLastRow = crmSheet.getLastRow() + 1;
    crmSheet.getRange(crmLastRow, 1, 1, 16).setValues([newRowData]);

    // Apply currency formatting in CRM too
    const serviceVal = newRowData[COL.SERVICE_TYPE - 1];
    const config     = getServiceConfig(serviceVal);
    if (config) {
      const fmt = getCurrencyFormat(config.currency);
      [COL.AMOUNT, COL.PAID, COL.BALANCE, COL.REWARD].forEach(c => {
        crmSheet.getRange(crmLastRow, c).setNumberFormat(fmt);
      });
      DATE_COLUMNS.forEach(c => {
        crmSheet.getRange(crmLastRow, c).setNumberFormat("dd/MM/yyyy");
      });
    }

    applyFollowUpdateAlert(crmSheet, crmLastRow);
    SpreadsheetApp.getActiveSpreadsheet().toast(`✅ New task synced to CRM!`, "Synced", 3);
    return;
  }

  // ── Existing row — find in CRM and update ────────────────
  const crmLastRow = crmSheet.getLastRow();
  const crmTaskIds = crmSheet.getRange(DATA_START_ROW, COL.TASK_ID, crmLastRow - DATA_START_ROW + 1, 1).getValues();

  for (let r = 0; r < crmTaskIds.length; r++) {
    if (crmTaskIds[r][0] === taskId) {
      const crmRow = DATA_START_ROW + r;

      // ── If service type changed, sync entire row ─────────
      if (col === COL.SERVICE_TYPE) {
        const rowData = sheet.getRange(row, 1, 1, 16).getValues()[0];
        crmSheet.getRange(crmRow, 1, 1, 16).setValues([rowData]);

        const serviceVal = rowData[COL.SERVICE_TYPE - 1];
        const config     = getServiceConfig(serviceVal);
        if (config) {
          const fmt = getCurrencyFormat(config.currency);
          [COL.AMOUNT, COL.PAID, COL.BALANCE, COL.REWARD].forEach(c => {
            crmSheet.getRange(crmRow, c).setNumberFormat(fmt);
          });
          DATE_COLUMNS.forEach(c => {
            crmSheet.getRange(crmRow, c).setNumberFormat("dd/MM/yyyy");
          });
        }

      } else {
        // ── Single cell update ───────────────────────────
        const newVal = e.range.getValue();
        crmSheet.getRange(crmRow, col).setValue(newVal);

        // Re-calculate balance if amount or paid changed
        if (col === COL.AMOUNT || col === COL.PAID) {
          const amount  = crmSheet.getRange(crmRow, COL.AMOUNT).getValue() || 0;
          const paid    = crmSheet.getRange(crmRow, COL.PAID).getValue()   || 0;
          const balance = amount - paid;
          crmSheet.getRange(crmRow, COL.BALANCE)
                  .setValue(balance)
                  .setNumberFormat(getCurrencyFormat(
                    getServiceCurrency(crmSheet.getRange(crmRow, COL.SERVICE_TYPE).getValue())
                  ));
          sheet.getRange(row, COL.BALANCE)
               .setValue(balance)
               .setNumberFormat(getCurrencyFormat(
                 getServiceCurrency(sheet.getRange(row, COL.SERVICE_TYPE).getValue())
               ));
          applyFollowUpdateAlert(crmSheet, crmRow);
          applyFollowUpdateAlert(sheet, row);
        }

        // Re-apply alert if status changed
        if (col === COL.STATUS) {
          applyFollowUpdateAlert(crmSheet, crmRow);
          applyFollowUpdateAlert(sheet, row);
        }
      }

      SpreadsheetApp.getActiveSpreadsheet().toast(`✅ CRM updated for ${taskId}`, "Synced", 3);
      break;
    }
  }
}

function debugRefresh() {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const crmSheet = ss.getSheetByName(SHEET_NAME);
  
  SpreadsheetApp.flush();
  
  const lastRow = crmSheet.getLastRow();
  const allData = crmSheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 16).getValues();
  
  let msg = "CRM Raw Data:\n\n";
  allData.forEach((row, i) => {
    const taskId  = row[COL.TASK_ID - 1];
    const service = row[COL.SERVICE_TYPE - 1];
    const status  = row[COL.STATUS - 1];
    if (taskId || service) {
      msg += `Row ${DATA_START_ROW + i}: ${taskId} | Service: "${service}" | Status: "${status}"\n`;
    }
  });

  msg += "\n\nSERVICE_SHEETS config:\n";
  SERVICE_SHEETS.forEach(s => msg += `"${s}"\n`);

  SpreadsheetApp.getUi().alert(msg);
}

// ============================================================
//  SEARCH BY COMPANY NAME
// ============================================================
function searchByCompany() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "🔍 Search by Company",
    "Enter company name or keyword:",
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;

  const keyword = response.getResponseText().trim().toLowerCase();
  if (!keyword) { ui.alert("❌ Please enter a search keyword."); return; }

  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const crmSheet = ss.getSheetByName(SHEET_NAME);
  if (!crmSheet) return;

  const lastRow = crmSheet.getLastRow();
  if (lastRow < DATA_START_ROW) { ui.alert("📋 No CRM data found."); return; }

  const data = crmSheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 16).getValues();

  const results = [];
  data.forEach((row, i) => {
    const taskId  = row[COL.TASK_ID - 1]  || "";
    const client  = row[COL.CLIENT - 1]   || "";
    const service = row[COL.SERVICE_TYPE - 1] || "";
    const status  = row[COL.STATUS - 1]   || "";
    const owner   = row[COL.OWNER - 1]    || "";
    const amount  = row[COL.AMOUNT - 1]   || 0;
    const balance = row[COL.BALANCE - 1]  || 0;
    const rowNum  = DATA_START_ROW + i;

    if (client.toLowerCase().includes(keyword) ||
        taskId.toLowerCase().includes(keyword)) {
      results.push({ taskId, client, service, status, owner, amount, balance, rowNum });
    }
  });

  if (results.length === 0) {
    ui.alert(`❌ No results found for "${keyword}"`);
    return;
  }

  const html = buildSearchHTML(keyword, results);
  SpreadsheetApp.getUi().showSidebar(
    HtmlService.createHtmlOutput(html)
      .setTitle("🔍 Search Results")
      .setWidth(380)
  );
}

function buildSearchHTML(keyword, results) {
  const statusColors = {
    "Intake":               "#e8f0fe",
    "Documents Pending":    "#fff8e1",
    "Processing":           "#fff3e0",
    "Processing Document":  "#fff3e0",
    "Under Review":         "#f3e5f5",
    "Submitted":            "#e3f2fd",
    "Awaiting Approval":    "#fce4ec",
    "Completed":            "#e8f5e9",
    "Follow Done":          "#e8f5e9",
    "On Hold":              "#f5f5f5",
    "On Risk":              "#ffebee",
    "Reject":               "#fce8e6",
    "Consult":              "#e8f0fe",
  };

  const statusFontColors = {
    "Intake":               "#1a73e8",
    "Documents Pending":    "#f29900",
    "Processing":           "#e37400",
    "Processing Document":  "#e37400",
    "Under Review":         "#9334e6",
    "Submitted":            "#1a73e8",
    "Awaiting Approval":    "#d93025",
    "Completed":            "#0f9d58",
    "Follow Done":          "#0f9d58",
    "On Hold":              "#9aa0a6",
    "On Risk":              "#d93025",
    "Reject":               "#fce8e6",
    "Consult":              "#e8f0fe",
  };

  const cards = results.map(r => `
    <div class="card">
      <div class="card-top">
        <span class="task-id">${r.taskId}</span>
        <span class="status" style="background:${statusColors[r.status] || '#f1f3f4'}; color:${statusFontColors[r.status] || '#202124'}">${r.status || "—"}</span>
      </div>
      <div class="client">${r.client}</div>
      <div class="service">🔧 ${r.service || "—"}</div>
      <div class="card-bottom">
        <span class="owner">👤 ${r.owner || "—"}</span>
        <span class="balance ${r.balance > 0 ? 'unpaid' : 'paid'}">
          ${r.balance > 0 ? `⚠️ Balance: ${r.balance.toLocaleString()}` : "✅ Fully Paid"}
        </span>
      </div>
      <div class="row-ref">Row ${r.rowNum}</div>
    </div>
  `).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f3f4; font-size: 12px; color: #202124; }

  .header {
    background: #1a73e8;
    color: #fff;
    padding: 14px 16px 10px;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .header h1 { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .header .sub { font-size: 10px; opacity: 0.85; }
  .header .badge {
    background: rgba(255,255,255,0.2);
    border-radius: 20px;
    padding: 3px 10px;
    font-size: 11px;
    display: inline-block;
    margin-top: 6px;
  }

  .cards { padding: 10px; display: flex; flex-direction: column; gap: 8px; }

  .card {
    background: #fff;
    border-radius: 8px;
    padding: 10px 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  }
  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .task-id { font-weight: 700; font-size: 12px; color: #1a73e8; }
  .status {
    font-size: 9px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    text-transform: uppercase;
  }
  .client { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
  .service { font-size: 11px; color: #5f6368; margin-bottom: 6px; }
  .card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .owner {
    font-size: 11px;
    color: #5f6368;
    background: #f1f3f4;
    padding: 2px 8px;
    border-radius: 10px;
  }
  .balance { font-size: 10px; font-weight: 600; }
  .unpaid { color: #d93025; }
  .paid { color: #0f9d58; }
  .row-ref { font-size: 9px; color: #9aa0a6; text-align: right; }
</style>
</head><body>

<div class="header">
  <h1>🔍 Search Results</h1>
  <div class="sub">Keyword: "<strong>${keyword}</strong>"</div>
  <div class="badge">${results.length} task${results.length > 1 ? "s" : ""} found</div>
</div>

<div class="cards">
  ${cards}
</div>

</body></html>`;
}


// ============================================================
//  MONTHLY REPORT
// ============================================================
function generateMonthlyReport() {
  const ui = SpreadsheetApp.getUi();

  // ── Ask for Month ────────────────────────────────────────
  const monthResponse = ui.prompt(
    "📅 Monthly Report",
    "Enter Month (1-12):\nExample: 6 for June",
    ui.ButtonSet.OK_CANCEL
  );
  if (monthResponse.getSelectedButton() !== ui.Button.OK) return;
  const month = parseInt(monthResponse.getResponseText().trim());
  if (isNaN(month) || month < 1 || month > 12) {
    ui.alert("❌ Invalid month. Please enter a number between 1 and 12.");
    return;
  }

  // ── Ask for Year ─────────────────────────────────────────
  const yearResponse = ui.prompt(
    "📅 Monthly Report",
    "Enter Year:\nExample: 2026",
    ui.ButtonSet.OK_CANCEL
  );
  if (yearResponse.getSelectedButton() !== ui.Button.OK) return;
  const year = parseInt(yearResponse.getResponseText().trim());
  if (isNaN(year) || year < 2000 || year > 2100) {
    ui.alert("❌ Invalid year.");
    return;
  }

  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const crmSheet = ss.getSheetByName(SHEET_NAME);
  if (!crmSheet) { ui.alert("❌ CRM sheet not found."); return; }

  const lastRow = crmSheet.getLastRow();
  if (lastRow < DATA_START_ROW) { ui.alert("📋 No CRM data found."); return; }

  const data = crmSheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 16).getValues();

  // ── Filter by month & year using Start Date ───────────────
  const filtered = data.filter(row => {
    const taskId  = row[COL.TASK_ID - 1];
    const client  = row[COL.CLIENT - 1];
    if (!taskId && !client) return false;
    const startDate = row[COL.START_DATE - 1];
    if (!(startDate instanceof Date) || isNaN(startDate)) return false;
    return startDate.getMonth() + 1 === month && startDate.getFullYear() === year;
  });

  if (filtered.length === 0) {
    ui.alert(`📋 No tasks found for ${getMonthName(month)} ${year}.`);
    return;
  }

  // ── Counters ─────────────────────────────────────────────
  let totalTasks      = filtered.length;
  let totalCompleted  = 0;
  let totalNotComplete= 0;
  let totalOnHold     = 0;
  let totalOnRisk     = 0;
  let totalUnpaid     = 0;
  let totalFullyPaid  = 0;
  let totalAmountRM   = 0, totalPaidRM   = 0, totalBalanceRM   = 0, totalRewardRM   = 0;
  let totalAmountUSD  = 0, totalPaidUSD  = 0, totalBalanceUSD  = 0, totalRewardUSD  = 0;

  const statusCount   = {};
  const serviceCount  = {};
  const ownerCount    = {};

  filtered.forEach(row => {
    const status   = row[COL.STATUS - 1]       || "";
    const service  = row[COL.SERVICE_TYPE - 1] || "";
    const owner    = row[COL.OWNER - 1]        || "";
    const amount   = typeof row[COL.AMOUNT - 1]  === "number" ? row[COL.AMOUNT - 1]  : 0;
    const paid     = typeof row[COL.PAID - 1]    === "number" ? row[COL.PAID - 1]    : 0;
    const balance  = typeof row[COL.BALANCE - 1] === "number" ? row[COL.BALANCE - 1] : 0;
    const reward   = typeof row[COL.REWARD - 1]  === "number" ? row[COL.REWARD - 1]  : 0;

    const config   = getServiceConfig(service);
    const currency = config ? config.currency : "RM";

    if (["Completed", "Complete"].includes(status)) totalCompleted++;
    else totalNotComplete++;
    if (status === "On Hold") totalOnHold++;
    if (status === "On Risk")  totalOnRisk++;
    if (balance > 0) totalUnpaid++;
    if (amount > 0 && balance <= 0) totalFullyPaid++;

    if (currency === "USD") {
      totalAmountUSD  += amount;
      totalPaidUSD    += paid;
      totalBalanceUSD += balance;
      totalRewardUSD  += reward;
    } else {
      totalAmountRM  += amount;
      totalPaidRM    += paid;
      totalBalanceRM += balance;
      totalRewardRM  += reward;
    }

    statusCount[status]   = (statusCount[status]   || 0) + 1;
    serviceCount[service] = (serviceCount[service] || 0) + 1;
    ownerCount[owner]     = (ownerCount[owner]     || 0) + 1;
  });

  // ── Build Report Sheet ────────────────────────────────────
  let report = ss.getSheetByName("Monthly Report");
  if (!report) report = ss.insertSheet("Monthly Report");
  else report.clear();

  report.setTabColor("#0f9d58");

  // Column widths
  report.setColumnWidth(1, 20);
  for (let i = 2; i <= 13; i++) report.setColumnWidth(i, 120);
  report.setColumnWidth(13, 20);

  const fmt    = (r, c, rows, cols, opts) => {
    const range = report.getRange(r, c, rows, cols);
    if (opts.bg)     range.setBackground(opts.bg);
    if (opts.fc)     range.setFontColor(opts.fc);
    if (opts.bold)   range.setFontWeight("bold");
    if (opts.size)   range.setFontSize(opts.size);
    if (opts.align)  range.setHorizontalAlignment(opts.align);
    if (opts.valign) range.setVerticalAlignment(opts.valign);
    if (opts.numfmt) range.setNumberFormat(opts.numfmt);
  };
  const setVal = (r, c, val) => report.getRange(r, c).setValue(val);
  const merge  = (r, c, rows, cols) => report.getRange(r, c, rows, cols).merge();

  // ── TITLE ─────────────────────────────────────────────────
  report.setRowHeight(1, 40);
  report.setRowHeight(2, 40);

  // Logo
  merge(1, 2, 2, 2);
  fmt(1, 2, 2, 2, { bg:"#0f9d58" });
  try {
    const fileId    = "YOUR_LOGO_FILE_ID";
    const logoBlob  = DriveApp.getFileById(fileId).getBlob();
    const logoImage = report.insertImage(logoBlob, 2, 1);
    logoImage.setWidth(70).setHeight(70);
  } catch(e) {
    console.log("Logo error: " + e.message);
  }

  merge(1, 4, 2, 9);
  setVal(1, 4, `📅 MONTHLY REPORT — ${getMonthName(month).toUpperCase()} ${year}`);
  fmt(1, 4, 2, 9, { bg:"#0f9d58", fc:"#ffffff", bold:true, size:18, align:"center", valign:"middle" });

  // Last updated
  merge(3, 2, 1, 11);
  setVal(3, 2, "Generated: " + new Date().toLocaleString());
  fmt(3, 2, 1, 11, { bg:"#e8f5e9", fc:"#5f6368", size:9, align:"left" });
  report.setRowHeight(3, 20);
  report.setRowHeight(4, 12);

  // ── KEY METRICS ───────────────────────────────────────────
  merge(5, 2, 1, 11);
  setVal(5, 2, "KEY METRICS");
  fmt(5, 2, 1, 11, { bg:"#f8f9fa", fc:"#5f6368", bold:true, size:9, align:"left" });
  report.setRowHeight(5, 22);

  const metrics = [
    { label:"Total Tasks",    value: totalTasks,       bg:"#1a73e8", icon:"📁" },
    { label:"Completed",      value: totalCompleted,   bg:"#34a853", icon:"✅" },
    { label:"Not Complete",   value: totalNotComplete, bg:"#ea4335", icon:"🔄" },
    { label:"Unpaid Balance", value: totalUnpaid,      bg:"#d93025", icon:"💸" },
    { label:"Fully Paid",     value: totalFullyPaid,   bg:"#0f9d58", icon:"💰" },
    { label:"On Hold",        value: totalOnHold,      bg:"#9aa0a6", icon:"⏸️" },
    { label:"On Risk",        value: totalOnRisk,      bg:"#c5221f", icon:"⚠️" },
  ];

  [0, 1].forEach(rowGroup => {
    const cardRow = 6 + rowGroup * 3;
    report.setRowHeight(cardRow,     48);
    report.setRowHeight(cardRow + 1, 22);
    report.setRowHeight(cardRow + 2, 8);

    const groupMetrics = metrics.slice(rowGroup * 4, rowGroup * 4 + 4);
    groupMetrics.forEach((m, i) => {
      const col = 2 + i * 3;
      merge(cardRow, col, 1, 2);
      setVal(cardRow, col, m.icon + "  " + m.value);
      fmt(cardRow, col, 1, 2, { bg:m.bg, fc:"#ffffff", bold:true, size:18, align:"center", valign:"middle" });
      merge(cardRow + 1, col, 1, 2);
      setVal(cardRow + 1, col, m.label);
      fmt(cardRow + 1, col, 1, 2, { bg:m.bg, fc:"#ffffff", size:8, align:"center", valign:"middle" });
    });
  });

  // ── FINANCIALS RM ─────────────────────────────────────────
  report.setRowHeight(13, 12);
  merge(14, 2, 1, 11);
  setVal(14, 2, "FINANCIALS — RM");
  fmt(14, 2, 1, 11, { bg:"#f8f9fa", fc:"#5f6368", bold:true, size:9, align:"left" });
  report.setRowHeight(14, 22);
  report.setRowHeight(15, 48);
  report.setRowHeight(16, 22);
  report.setRowHeight(17, 12);

  [
    { label:"Total Amount (RM)",  value: totalAmountRM,  bg:"#1a73e8" },
    { label:"Total Paid (RM)",    value: totalPaidRM,    bg:"#0f9d58" },
    { label:"Total Balance (RM)", value: totalBalanceRM, bg:"#d93025" },
    { label:"Total Reward (RM)",  value: totalRewardRM,  bg:"#f29900" },
  ].forEach((f, i) => {
    const col = 2 + i * 3;
    merge(15, col, 1, 2); setVal(15, col, f.value);
    fmt(15, col, 1, 2, { bg:f.bg, fc:"#ffffff", bold:true, size:14, align:"center", valign:"middle", numfmt:'"RM "#,##0.00' });
    merge(16, col, 1, 2); setVal(16, col, f.label);
    fmt(16, col, 1, 2, { bg:f.bg, fc:"#ffffff", size:8, align:"center", valign:"middle" });
  });

  // ── FINANCIALS USD ────────────────────────────────────────
  report.setRowHeight(18, 12);
  merge(19, 2, 1, 11);
  setVal(19, 2, "FINANCIALS — USD");
  fmt(19, 2, 1, 11, { bg:"#f8f9fa", fc:"#5f6368", bold:true, size:9, align:"left" });
  report.setRowHeight(19, 22);
  report.setRowHeight(20, 48);
  report.setRowHeight(21, 22);
  report.setRowHeight(22, 12);

  [
    { label:"Total Amount (USD)",  value: totalAmountUSD,  bg:"#1a73e8" },
    { label:"Total Paid (USD)",    value: totalPaidUSD,    bg:"#0f9d58" },
    { label:"Total Balance (USD)", value: totalBalanceUSD, bg:"#d93025" },
    { label:"Total Reward (USD)",  value: totalRewardUSD,  bg:"#f29900" },
  ].forEach((f, i) => {
    const col = 2 + i * 3;
    merge(20, col, 1, 2); setVal(20, col, f.value);
    fmt(20, col, 1, 2, { bg:f.bg, fc:"#ffffff", bold:true, size:14, align:"center", valign:"middle", numfmt:'"USD $"#,##0.00' });
    merge(21, col, 1, 2); setVal(21, col, f.label);
    fmt(21, col, 1, 2, { bg:f.bg, fc:"#ffffff", size:8, align:"center", valign:"middle" });
  });

  // ── STATUS BREAKDOWN ──────────────────────────────────────
  report.setRowHeight(23, 12);
  merge(24, 2, 1, 5); setVal(24, 2, "STATUS BREAKDOWN");
  fmt(24, 2, 1, 5, { bg:"#f8f9fa", fc:"#5f6368", bold:true, size:9 });
  merge(24, 8, 1, 5); setVal(24, 8, "SERVICE BREAKDOWN");
  fmt(24, 8, 1, 5, { bg:"#f8f9fa", fc:"#5f6368", bold:true, size:9 });
  report.setRowHeight(24, 22);

  ["Status","Count"].forEach((h, i) => {
    setVal(25, 2 + i * 2, h);
    fmt(25, 2 + i * 2, 1, 2, { bg:"#0f9d58", fc:"#ffffff", bold:true, size:9, align:"center" });
  });
  ["Service","Count"].forEach((h, i) => {
    setVal(25, 8 + i * 2, h);
    fmt(25, 8 + i * 2, 1, 2, { bg:"#0f9d58", fc:"#ffffff", bold:true, size:9, align:"center" });
  });
  report.setRowHeight(25, 20);

  const statusColors = {
    "Intake":"#e8f0fe","Documents Pending":"#fff8e1","Processing":"#fff3e0",
    "Processing Document":"#fff3e0","Under Review":"#f3e5f5","Submitted":"#e3f2fd",
    "Awaiting Approval":"#fce4ec","Completed":"#e8f5e9","On Hold":"#f5f5f5","On Risk":"#ffebee",
    "Follow Done":"#e8f5e9","Reject":  "#fce8e6","Consult": "#e8f0fe",
  };

  let r = 26;
  Object.entries(statusCount).sort((a,b) => b[1]-a[1]).forEach(([s, c]) => {
    const bg = statusColors[s] || "#ffffff";
    merge(r, 2, 1, 2); setVal(r, 2, s);
    fmt(r, 2, 1, 2, { bg, fc:"#202124", size:9 });
    merge(r, 4, 1, 2); setVal(r, 4, c);
    fmt(r, 4, 1, 2, { bg, fc:"#202124", size:9, align:"center", bold:true });
    report.setRowHeight(r, 20);
    r++;
  });

  const serviceBgs = ["#e8f0fe","#e8f5e9","#fff8e1","#f3e5f5","#fce4ec","#e3f2fd","#fff3e0","#fce8e6","#e8f0fe"];
  let sr = 26;
  Object.entries(serviceCount).sort((a,b) => b[1]-a[1]).forEach(([s, c], idx) => {
    const bg = serviceBgs[idx % serviceBgs.length];
    merge(sr, 8, 1, 2); setVal(sr, 8, s);
    fmt(sr, 8, 1, 2, { bg, fc:"#202124", size:9 });
    merge(sr, 10, 1, 2); setVal(sr, 10, c);
    fmt(sr, 10, 1, 2, { bg, fc:"#202124", size:9, align:"center", bold:true });
    report.setRowHeight(sr, 20);
    sr++;
  });

  // ── OWNER BREAKDOWN ───────────────────────────────────────
  const ownerStartRow = Math.max(r, sr) + 2;
  merge(ownerStartRow, 2, 1, 11); setVal(ownerStartRow, 2, "OWNER WORKLOAD");
  fmt(ownerStartRow, 2, 1, 11, { bg:"#f8f9fa", fc:"#5f6368", bold:true, size:9 });
  report.setRowHeight(ownerStartRow, 22);

  ["Owner","Tasks"].forEach((h, i) => {
    setVal(ownerStartRow + 1, 2 + i * 2, h);
    fmt(ownerStartRow + 1, 2 + i * 2, 1, 2, { bg:"#0f9d58", fc:"#ffffff", bold:true, size:9, align:"center" });
  });
  report.setRowHeight(ownerStartRow + 1, 20);

  const ownerBgs = ["#e8f0fe","#e8f5e9","#fff8e1","#f3e5f5","#fce4ec","#e3f2fd","#fff3e0"];
  let or = ownerStartRow + 2;
  Object.entries(ownerCount).sort((a,b) => b[1]-a[1]).forEach(([o, c], idx) => {
    const bg = ownerBgs[idx % ownerBgs.length];
    merge(or, 2, 1, 2); setVal(or, 2, o);
    fmt(or, 2, 1, 2, { bg, fc:"#202124", size:9 });
    merge(or, 4, 1, 2); setVal(or, 4, c);
    fmt(or, 4, 1, 2, { bg, fc:"#202124", size:9, align:"center", bold:true });
    report.setRowHeight(or, 20);
    or++;
  });

  // ── TASK LIST ─────────────────────────────────────────────
  const taskListStart = or + 2;
  merge(taskListStart, 2, 1, 11); setVal(taskListStart, 2, "TASK LIST");
  fmt(taskListStart, 2, 1, 11, { bg:"#f8f9fa", fc:"#5f6368", bold:true, size:9 });
  report.setRowHeight(taskListStart, 22);

  const taskHeaders = ["Task ID", "Client", "Service", "Status", "Owner", "Amount", "Paid", "Balance"];
  const taskHeaderCols = [2, 3, 4, 5, 6, 7, 8, 9];
  taskHeaders.forEach((h, i) => {
    setVal(taskListStart + 1, taskHeaderCols[i], h);
    fmt(taskListStart + 1, taskHeaderCols[i], 1, 1, { bg:"#0f9d58", fc:"#ffffff", bold:true, size:9, align:"center" });
  });
  report.setRowHeight(taskListStart + 1, 20);

  filtered.forEach((row, idx) => {
    const tr      = taskListStart + 2 + idx;
    const taskId  = row[COL.TASK_ID - 1]       || "—";
    const client  = row[COL.CLIENT - 1]         || "—";
    const service = row[COL.SERVICE_TYPE - 1]   || "—";
    const status  = row[COL.STATUS - 1]         || "—";
    const owner   = row[COL.OWNER - 1]          || "—";
    const amount  = row[COL.AMOUNT - 1]         || 0;
    const paid    = row[COL.PAID - 1]           || 0;
    const balance = row[COL.BALANCE - 1]        || 0;
    const config  = getServiceConfig(service);
    const curr    = config ? config.currency : "RM";
    const numfmt  = getCurrencyFormat(curr);
    const bg      = idx % 2 === 0 ? "#ffffff" : "#f8f9fa";

    [taskId, client, service, status, owner].forEach((val, i) => {
      setVal(tr, taskHeaderCols[i], val);
      fmt(tr, taskHeaderCols[i], 1, 1, { bg, fc:"#202124", size:9 });
    });
    [amount, paid, balance].forEach((val, i) => {
      setVal(tr, taskHeaderCols[5 + i], val);
      fmt(tr, taskHeaderCols[5 + i], 1, 1, { bg, fc: i === 2 && val > 0 ? "#d93025" : "#202124", size:9, numfmt });
    });
    report.setRowHeight(tr, 20);
  });

  // Activate report sheet
  ss.setActiveSheet(report);
  ui.alert(`✅ Monthly Report generated!\n\n📅 ${getMonthName(month)} ${year}\n📁 Total Tasks: ${totalTasks}`);
}

// ── Month name helper ─────────────────────────────────────
function getMonthName(month) {
  const names = ["January","February","March","April","May","June",
                 "July","August","September","October","November","December"];
  return names[month - 1];
}

// ============================================================
//  SEARCH BY SERVICE
// ============================================================
function searchByService() {
  const services = getServiceTypes();
  const html = buildServiceSearchHTML(services);
  SpreadsheetApp.getUi().showSidebar(
    HtmlService.createHtmlOutput(html)
      .setTitle("🔍 Search by Service")
      .setWidth(300)
  );
}

function buildServiceSearchHTML(services) {
  const options = services.map(s => `<option value="${s}">${s}</option>`).join("");
  const monthOptions = `
    <option value="0">— All Months —</option>
    <option value="1">January</option>
    <option value="2">February</option>
    <option value="3">March</option>
    <option value="4">April</option>
    <option value="5">May</option>
    <option value="6">June</option>
    <option value="7">July</option>
    <option value="8">August</option>
    <option value="9">September</option>
    <option value="10">October</option>
    <option value="11">November</option>
    <option value="12">December</option>
  `;
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f3f4; padding: 0; font-size: 12px; color: #202124; }
  .header { background: #1a73e8; color: #fff; padding: 14px 16px; position: sticky; top: 0; z-index: 10; }
  .header h1 { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .header p  { font-size: 10px; opacity: 0.85; }
  .body { padding: 16px; }
  label { font-size: 11px; font-weight: 600; color: #5f6368; display: block; margin-bottom: 6px; margin-top: 12px; }
  select, input {
    width: 100%; padding: 8px 10px;
    border: 1.5px solid #dadce0; border-radius: 6px;
    font-size: 12px; color: #202124; background: #fff; cursor: pointer;
  }
  select:focus, input:focus { outline: none; border-color: #1a73e8; }
  .btn {
    width: 100%; padding: 10px; background: #1a73e8; color: #fff;
    border: none; border-radius: 6px; font-size: 13px; font-weight: 600;
    cursor: pointer; margin-top: 16px;
  }
  .btn:hover { background: #1557b0; }
  .status { margin-top: 12px; font-size: 11px; color: #5f6368; text-align: center; min-height: 16px; }
</style>
</head><body>
<div class="header">
  <h1>🔍 Search by Service</h1>
  <p>Filter tasks by service and month</p>
</div>
<div class="body">
  <label>Select Service:</label>
  <select id="serviceSelect">${options}</select>

  <label>Select Month:</label>
  <select id="monthSelect">${monthOptions}</select>

  <label>Year:</label>
  <input type="number" id="yearInput" value="${currentYear}" min="2020" max="2100">

  <button class="btn" onclick="runSearch()">🔍 Search</button>
  <div class="status" id="status"></div>
</div>
<script>
  function runSearch() {
    const service = document.getElementById('serviceSelect').value;
    const month   = parseInt(document.getElementById('monthSelect').value);
    const year    = parseInt(document.getElementById('yearInput').value);
    document.getElementById('status').textContent = '⏳ Searching...';
    google.script.run
      .withSuccessHandler(function(count) {
        document.getElementById('status').textContent =
          count > 0 ? '✅ Found ' + count + ' task(s)! Check Service Search tab.' : '❌ No tasks found.';
      })
      .withFailureHandler(function(err) {
        document.getElementById('status').textContent = '❌ Error: ' + err.message;
      })
      .generateServiceSearchSheet(service, month, year);
  }
</script>
</body></html>`;
}

function generateServiceSearchSheet(serviceName, month, year) {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const crmSheet = ss.getSheetByName(SHEET_NAME);
  if (!crmSheet) return 0;

  const lastRow = crmSheet.getLastRow();
  if (lastRow < DATA_START_ROW) return 0;

  const data = crmSheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 16).getValues();

  // Filter by service + optional month/year
  const filtered = data.filter(row => {
    const taskId  = row[COL.TASK_ID - 1];
    const client  = row[COL.CLIENT - 1];
    if (!taskId && !client) return false;
    if (row[COL.SERVICE_TYPE - 1] !== serviceName) return false;

    // If month = 0 means All Months — skip date filter
    if (month === 0) return true;

    const startDate = row[COL.START_DATE - 1];
    if (!(startDate instanceof Date) || isNaN(startDate)) return false;
    return startDate.getMonth() + 1 === month && startDate.getFullYear() === year;
  });

  if (filtered.length === 0) return 0;

  // ── Create or clear Service Search sheet ─────────────────
  let sheet = ss.getSheetByName("Service Search");
  if (!sheet) sheet = ss.insertSheet("Service Search");
  else sheet.clear();

  sheet.setTabColor("#9334e6");

  const headers = [
    "Task ID", "Client / Company", "Type of Service", "Status",
    "Priority", "Owner", "Notes", "Start Date", "End Date",
    "Follow Update", "Expected End", "Amount", "Paid", "Balance", "Reward", "Contact Details"
  ];

  // ── Title ─────────────────────────────────────────────────
  const monthLabel = month === 0 ? "All Months" : `${getMonthName(month)} ${year}`;
  sheet.getRange(1, 1, 1, 16).merge();
  sheet.getRange(1, 1).setValue(`🔍 ${serviceName}  |  ${monthLabel}  |  ${filtered.length} task(s) found`);
  sheet.getRange(1, 1)
    .setBackground("#9334e6").setFontColor("#ffffff")
    .setFontWeight("bold").setFontSize(12)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(1, 36);

  // Timestamp
  sheet.getRange(2, 1, 1, 16).merge();
  sheet.getRange(2, 1).setValue("Generated: " + new Date().toLocaleString());
  sheet.getRange(2, 1)
    .setBackground("#f3e5f5").setFontColor("#5f6368")
    .setFontSize(9).setHorizontalAlignment("left");
  sheet.setRowHeight(2, 20);

  // Headers
  sheet.getRange(3, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(3, 1, 1, headers.length)
    .setBackground("#9334e6").setFontColor("#ffffff")
    .setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(3, 30);
  sheet.setFrozenRows(3);

  // Column widths
  const widths = [110, 180, 160, 155, 120, 130, 200, 110, 110, 120, 120, 100, 90, 90, 90, 210];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

  // Data rows
  const config = getServiceConfig(serviceName);
  const curr   = config ? config.currency : "RM";
  const numfmt = getCurrencyFormat(curr);

  filtered.forEach((row, idx) => {
    const dataRow = 4 + idx;
    sheet.getRange(dataRow, 1, 1, 16).setValues([row]);
    const bg = idx % 2 === 0 ? "#ffffff" : "#f8f9fa";
    sheet.getRange(dataRow, 1, 1, 16).setBackground(bg);
    sheet.setRowHeight(dataRow, 22);

    DATE_COLUMNS.forEach(col => sheet.getRange(dataRow, col).setNumberFormat("dd/MM/yyyy"));
    [COL.AMOUNT, COL.PAID, COL.REWARD].forEach(col => sheet.getRange(dataRow, col).setNumberFormat(numfmt));

    const balance = row[COL.BALANCE - 1];
    const balanceCell = sheet.getRange(dataRow, COL.BALANCE);
    balanceCell.setNumberFormat(numfmt);
    if (typeof balance === "number" && balance > 0) {
      balanceCell.setBackground("#d93025").setFontColor("#ffffff");
    }
    sheet.getRange(dataRow, COL.CONTACT).setNumberFormat("@");
  });

  ss.setActiveSheet(sheet);
  return filtered.length;
}

// ============================================================
//  DOCUMENT UPLOAD SYSTEM
// ============================================================

// ── Auto-create CRM folder structure in Drive ─────────────
function createCRMFolders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { SpreadsheetApp.getUi().alert("❌ CRM sheet not found."); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) { SpreadsheetApp.getUi().alert("❌ No data found."); return; }

  const data = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, COL.DOCUMENT).getValues();

  // Get or create "CRM" root folder
  const rootFolders = DriveApp.getFoldersByName("CRM");
  const crmFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder("CRM");

  let created = 0;
  const clientFolderCache = {}; // avoid redundant DriveApp calls per client

  data.forEach(row => {
    const taskId  = row[COL.TASK_ID - 1];
    const client  = row[COL.CLIENT - 1];
    const service = row[COL.SERVICE_TYPE - 1];

    if (!taskId || !client) return;

    const taskFolderName = taskId + " — " + (service || "—");

    // ── Get or create CLIENT folder inside CRM ──
    if (!clientFolderCache[client]) {
      const existing = crmFolder.getFoldersByName(client);
      clientFolderCache[client] = existing.hasNext()
        ? existing.next()
        : crmFolder.createFolder(client);
      created++;
    }

    // ── Get or create TASK folder inside the client folder ──
    const clientFolder = clientFolderCache[client];
    const existingTask = clientFolder.getFoldersByName(taskFolderName);
    if (!existingTask.hasNext()) {
      clientFolder.createFolder(taskFolderName);
      created++;
    }
  });

  SpreadsheetApp.getUi().alert(
    "✅ Done! Created " + created + " folder(s).\n\n" +
    "Structure:\n📁 CRM\n  📁 Client Name\n    📁 TASK-XXX — Service Name"
  );
}

// ── Get or create service folder ─────────────────────────
function getServiceFolder(serviceName) {
  const props    = PropertiesService.getScriptProperties();
  let crmFolder;

  const savedId = props.getProperty("CRM_FOLDER_ID");
  if (savedId) {
    try {
      crmFolder = DriveApp.getFolderById(savedId);
    } catch(e) {
      crmFolder = null;
    }
  }

  if (!crmFolder) {
    const folders = DriveApp.getFoldersByName("CRM");
    if (folders.hasNext()) {
      crmFolder = folders.next();
      props.setProperty("CRM_FOLDER_ID", crmFolder.getId());
    } else {
      crmFolder = DriveApp.createFolder("CRM");
      props.setProperty("CRM_FOLDER_ID", crmFolder.getId());
    }
  }

  // Find or create service subfolder
  const subFolders = crmFolder.getFoldersByName(serviceName);
  if (subFolders.hasNext()) {
    return subFolders.next();
  } else {
    return crmFolder.createFolder(serviceName);
  }
}

// ── Open document uploader sidebar ───────────────────────
function openDocumentUploader() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const row = sheet.getActiveCell().getRow();
  if (row <= HEADER_ROW) {
    SpreadsheetApp.getUi().alert("⚠️ Please click on a data row first.");
    return;
  }

  const taskId  = sheet.getRange(row, COL.TASK_ID).getValue()      || "—";
  const client  = sheet.getRange(row, COL.CLIENT).getValue()        || "—";
  const service = sheet.getRange(row, COL.SERVICE_TYPE).getValue()  || "";

  if (!client || client === "—") {
    SpreadsheetApp.getUi().alert("⚠️ Please set a Client / Company for this row first.");
    return;
  }

  const html = buildUploaderHTML(row, taskId, client, service);
  SpreadsheetApp.getUi().showSidebar(
    HtmlService.createHtmlOutput(html)
      .setTitle("📎 Upload Document")
      .setWidth(320)
  );
}

function buildUploaderHTML(row, taskId, client, service) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f3f4; font-size: 12px; color: #202124; }

  .header {
    background: #1a73e8;
    color: #fff;
    padding: 14px 16px;
    position: sticky;
    top: 0;
  }
  .header h1 { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .header p  { font-size: 10px; opacity: 0.85; }

  .body { padding: 16px; }

  .info-card {
    background: #fff;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .info-card .task-id { font-weight: 700; color: #1a73e8; font-size: 13px; }
  .info-card .client  { font-size: 12px; font-weight: 600; margin: 2px 0; }
  .info-card .service { font-size: 11px; color: #5f6368; }

  .upload-area {
    background: #fff;
    border: 2px dashed #dadce0;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    margin-bottom: 14px;
    cursor: pointer;
  }
  .upload-area:hover { border-color: #1a73e8; background: #e8f0fe; }
  .upload-area .icon { font-size: 28px; margin-bottom: 6px; }
  .upload-area p { font-size: 11px; color: #5f6368; }
  .upload-area .limit { font-size: 10px; color: #9aa0a6; margin-top: 4px; }

  input[type="file"] { display: none; }

  .file-list {
    background: #fff;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    display: none;
  }
  .file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    border-bottom: 1px solid #f1f3f4;
    font-size: 11px;
  }
  .file-item:last-child { border-bottom: none; }
  .file-name { color: #202124; font-weight: 500; }
  .file-size { color: #9aa0a6; font-size: 10px; }
  .remove-btn { color: #d93025; cursor: pointer; font-size: 14px; font-weight: 700; }

  .btn {
    width: 100%;
    padding: 10px;
    background: #1a73e8;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 8px;
  }
  .btn:hover { background: #1557b0; }
  .btn:disabled { background: #9aa0a6; cursor: not-allowed; }

  .status {
    text-align: center;
    font-size: 11px;
    color: #5f6368;
    min-height: 16px;
    margin-top: 8px;
  }

  .progress {
    width: 100%;
    height: 4px;
    background: #dadce0;
    border-radius: 2px;
    margin-top: 8px;
    display: none;
  }
  .progress-bar {
    height: 100%;
    background: #1a73e8;
    border-radius: 2px;
    width: 0%;
    transition: width 0.3s;
  }
</style>
</head><body>

<div class="header">
  <h1>📎 Upload Document</h1>
  <p>Files save to Drive → CRM → ${service}</p>
</div>

<div class="body">
  <div class="info-card">
    <div class="task-id">${taskId}</div>
    <div class="client">🏢 ${client}</div>
    <div class="service">🔧 ${service}</div>
  </div>

  <div class="upload-area" onclick="document.getElementById('fileInput').click()">
    <div class="icon">📄</div>
    <p><strong>Click to select PDF files</strong></p>
    <p>or drag and drop here</p>
    <div class="limit">PDF files only • Max 10MB per file</div>
  </div>

  <input type="file" id="fileInput" accept=".pdf" multiple onchange="handleFiles(this.files)">

  <div class="file-list" id="fileList">
    <div style="font-size:11px; font-weight:600; color:#5f6368; margin-bottom:6px;">Selected files:</div>
    <div id="fileItems"></div>
  </div>

  <button class="btn" id="uploadBtn" onclick="uploadFiles()" disabled>
    📤 Upload to Drive
  </button>

  <div class="progress" id="progress">
    <div class="progress-bar" id="progressBar"></div>
  </div>

  <div class="status" id="status"></div>
</div>

<script>
  let selectedFiles = [];

  function handleFiles(files) {
    for (let f of files) {
      if (f.type !== 'application/pdf') {
        document.getElementById('status').textContent = '❌ Only PDF files allowed!';
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        document.getElementById('status').textContent = '❌ ' + f.name + ' exceeds 10MB limit!';
        continue;
      }
      selectedFiles.push(f);
    }
    renderFileList();
  }

  function renderFileList() {
    const list = document.getElementById('fileItems');
    list.innerHTML = selectedFiles.map((f, i) => \`
      <div class="file-item">
        <span class="file-name">📄 \${f.name}</span>
        <span class="file-size">\${(f.size/1024).toFixed(1)}KB</span>
        <span class="remove-btn" onclick="removeFile(\${i})">✕</span>
      </div>
    \`).join('');
    document.getElementById('fileList').style.display = selectedFiles.length > 0 ? 'block' : 'none';
    document.getElementById('uploadBtn').disabled = selectedFiles.length === 0;
    document.getElementById('status').textContent = '';
  }

  function removeFile(idx) {
    selectedFiles.splice(idx, 1);
    renderFileList();
  }

  function uploadFiles() {
    if (selectedFiles.length === 0) return;

    document.getElementById('uploadBtn').disabled = true;
    document.getElementById('progress').style.display = 'block';
    document.getElementById('status').textContent = '⏳ Uploading...';

    let uploaded = 0;

    function uploadNext(idx) {
      if (idx >= selectedFiles.length) {
        document.getElementById('status').textContent = '✅ All files uploaded successfully!';
        document.getElementById('progressBar').style.width = '100%';
        selectedFiles = [];
        renderFileList();
        return;
      }

      const file = selectedFiles[idx];
      const reader = new FileReader();
      reader.onload = function(e) {
        const base64 = e.target.result.split(',')[1];
        document.getElementById('progressBar').style.width = ((idx + 1) / selectedFiles.length * 100) + '%';
        document.getElementById('status').textContent = '⏳ Uploading ' + (idx+1) + ' of ' + selectedFiles.length + '...';

        google.script.run
          .withSuccessHandler(function(result) {
            if (result.success) {
              uploadNext(idx + 1);
            } else {
              document.getElementById('status').textContent = '❌ Error: ' + result.error;
              document.getElementById('uploadBtn').disabled = false;
            }
          })
          .withFailureHandler(function(err) {
            document.getElementById('status').textContent = '❌ Error: ' + err.message;
            document.getElementById('uploadBtn').disabled = false;
          })
          .uploadDocumentToDrive(base64, file.name, ${row}, '${service}');
      };
      reader.readAsDataURL(file);
    }

    uploadNext(0);
  }
</script>
</body></html>`;
}

// ── Handle upload from sidebar ────────────────────────────
function uploadDocumentToDrive(base64Data, fileName, row, service) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return { success: false, error: "CRM sheet not found." };

    row = parseInt(row);

    const taskId = sheet.getRange(row, COL.TASK_ID).getValue() || "—";
    const client = sheet.getRange(row, COL.CLIENT).getValue() || "—";

    if (!client || client === "—") {
      return { success: false, error: "No client set for this row." };
    }

    // Detect mimeType from base64 prefix
    let mimeType = "application/octet-stream";
    const match = base64Data.match(/^data:([^;]+);base64,/);
    if (match) {
      mimeType = match[1];
      base64Data = base64Data.replace(/^data:[^;]+;base64,/, "");
    }

    // Fix double extension (e.g. .pdf.pdf -> .pdf)
    fileName = fileName.replace(/(\.[^.]+)\1$/, '$1');

    // 1. Get or create CRM root folder
    let crmFolder;
    const crmFolders = DriveApp.getFoldersByName("CRM");
    crmFolder = crmFolders.hasNext() ? crmFolders.next() : DriveApp.createFolder("CRM");

    // 2. Get or create Client folder inside CRM
    let clientFolder;
    const clientFolders = crmFolder.getFoldersByName(client);
    clientFolder = clientFolders.hasNext() ? clientFolders.next() : crmFolder.createFolder(client);

    // 3. Get or create Task folder inside Client folder
    const taskFolderName = taskId + " — " + (service || "—");
    let taskFolder;
    const taskFolders = clientFolder.getFoldersByName(taskFolderName);
    taskFolder = taskFolders.hasNext() ? taskFolders.next() : clientFolder.createFolder(taskFolderName);

    // 4. Upload the file
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
    const file = taskFolder.createFile(blob);

    // 5. Write as Professional Clickable Rich Text Links
    const docCell = sheet.getRange(row, COL.DOCUMENT);
    let currentText = "";
    let currentRTV = null;
    
    try {
      currentRTV = docCell.getRichTextValue();
      if (currentRTV) currentText = currentRTV.getText();
    } catch(e) {
      currentText = docCell.getValue() || "";
    }

    // Build new entry
    const newEntry = (currentText ? "\n" : "") + "📎 " + fileName;
    const fullText = currentText + newEntry;
    
    let builder = SpreadsheetApp.newRichTextValue().setText(fullText);
    
    // Re-apply old links so previous files stay clickable
    if (currentRTV) {
      const runs = currentRTV.getRuns();
      let charIndex = 0;
      for (const run of runs) {
        const runText = run.getText();
        const url = run.getLinkUrl();
        if (url) {
          builder = builder.setLinkUrl(charIndex, charIndex + runText.length, url);
        }
        charIndex += runText.length;
      }
    }
    
    // Apply blue hyperlink to the newly uploaded file
    const newStartIndex = currentText.length;
    builder = builder.setLinkUrl(newStartIndex, newStartIndex + newEntry.length, file.getUrl());
    
    docCell.setRichTextValue(builder.build());

    return { success: true };

  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
}

// ============================================================
//  DRIVE STORAGE WARNING
// ============================================================
function checkDriveStorage() {
  const used    = DriveApp.getStorageUsed();
  const limit   = 15 * 1024 * 1024 * 1024; // 15GB hardcoded for free Gmail
  const free    = limit - used;
  const usedGB  = (used  / (1024 ** 3)).toFixed(2);
  const freeGB  = (free  / (1024 ** 3)).toFixed(2);
  const usedPct = ((used / limit) * 100).toFixed(1);

  let icon    = "✅";
  let warning = "Storage is healthy.";

  if (usedPct >= 90) {
    icon    = "🔴";
    warning = "CRITICAL — Almost full! Please free up space immediately.";
  } else if (usedPct >= 75) {
    icon    = "🟠";
    warning = "WARNING — Storage getting full. Clean up Drive soon.";
  } else if (usedPct >= 50) {
    icon    = "🟡";
    warning = "CAUTION — Storage is half full. Keep an eye on it.";
  }

  SpreadsheetApp.getUi().alert(
    `${icon} Google Drive Storage\n\n` +
    `Used:  ${usedGB} GB / 15 GB (${usedPct}%)\n` +
    `Free:  ${freeGB} GB\n\n` +
    `${warning}\n\n` +
    `Note: Check drive.google.com/settings for exact usage.`
  );
}

// ============================================================
//  SEARCH BY OWNER
// ============================================================
function searchByOwner() {
  const owners = getOwners();
  const html   = buildOwnerSearchHTML(owners);
  SpreadsheetApp.getUi().showSidebar(
    HtmlService.createHtmlOutput(html)
      .setTitle("🔍 Search by Owner")
      .setWidth(300)
  );
}

function buildOwnerSearchHTML(owners) {
  const options = owners.map(o => `<option value="${o}">${o}</option>`).join("");
  const monthOptions = `
    <option value="0">— All Months —</option>
    <option value="1">January</option>
    <option value="2">February</option>
    <option value="3">March</option>
    <option value="4">April</option>
    <option value="5">May</option>
    <option value="6">June</option>
    <option value="7">July</option>
    <option value="8">August</option>
    <option value="9">September</option>
    <option value="10">October</option>
    <option value="11">November</option>
    <option value="12">December</option>
  `;
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f3f4; padding: 0; font-size: 12px; color: #202124; }
  .header { background: #1a73e8; color: #fff; padding: 14px 16px; position: sticky; top: 0; z-index: 10; }
  .header h1 { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .header p  { font-size: 10px; opacity: 0.85; }
  .body { padding: 16px; }
  label { font-size: 11px; font-weight: 600; color: #5f6368; display: block; margin-bottom: 6px; margin-top: 12px; }
  select, input {
    width: 100%; padding: 8px 10px;
    border: 1.5px solid #dadce0; border-radius: 6px;
    font-size: 12px; color: #202124; background: #fff; cursor: pointer;
  }
  select:focus, input:focus { outline: none; border-color: #1a73e8; }
  .btn {
    width: 100%; padding: 10px; background: #1a73e8; color: #fff;
    border: none; border-radius: 6px; font-size: 13px; font-weight: 600;
    cursor: pointer; margin-top: 16px;
  }
  .btn:hover { background: #1557b0; }
  .status { margin-top: 12px; font-size: 11px; color: #5f6368; text-align: center; min-height: 16px; }
</style>
</head><body>
<div class="header">
  <h1>🔍 Search by Owner</h1>
  <p>Filter tasks by owner and month</p>
</div>
<div class="body">
  <label>Select Owner:</label>
  <select id="ownerSelect">${options}</select>

  <label>Select Month:</label>
  <select id="monthSelect">${monthOptions}</select>

  <label>Year:</label>
  <input type="number" id="yearInput" value="${currentYear}" min="2020" max="2100">

  <button class="btn" onclick="runSearch()">🔍 Search</button>
  <div class="status" id="status"></div>
</div>
<script>
  function runSearch() {
    const owner = document.getElementById('ownerSelect').value;
    const month = parseInt(document.getElementById('monthSelect').value);
    const year  = parseInt(document.getElementById('yearInput').value);
    document.getElementById('status').textContent = '⏳ Searching...';
    google.script.run
      .withSuccessHandler(function(count) {
        document.getElementById('status').textContent =
          count > 0 ? '✅ Found ' + count + ' task(s)! Check Owner Search tab.' : '❌ No tasks found.';
      })
      .withFailureHandler(function(err) {
        document.getElementById('status').textContent = '❌ Error: ' + err.message;
      })
      .generateOwnerSearchSheet(owner, month, year);
  }
</script>
</body></html>`;
}

function generateOwnerSearchSheet(ownerName, month, year) {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const crmSheet = ss.getSheetByName(SHEET_NAME);
  if (!crmSheet) return 0;

  const lastRow = crmSheet.getLastRow();
  if (lastRow < DATA_START_ROW) return 0;

  const data = crmSheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 16).getValues();

  // Filter by owner + optional month/year
  const filtered = data.filter(row => {
    const taskId = row[COL.TASK_ID - 1];
    const client = row[COL.CLIENT - 1];
    if (!taskId && !client) return false;
    if (row[COL.OWNER - 1] !== ownerName) return false;

    if (month === 0) return true;

    const startDate = row[COL.START_DATE - 1];
    if (!(startDate instanceof Date) || isNaN(startDate)) return false;
    return startDate.getMonth() + 1 === month && startDate.getFullYear() === year;
  });

  if (filtered.length === 0) return 0;

  // ── Create or clear Owner Search sheet ───────────────────
  let sheet = ss.getSheetByName("Owner Search");
  if (!sheet) sheet = ss.insertSheet("Owner Search");
  else sheet.clear();

  sheet.setTabColor("#f29900");

  const headers = [
    "Task ID", "Client / Company", "Type of Service", "Status",
    "Priority", "Owner", "Notes", "Start Date", "End Date",
    "Follow Update", "Expected End", "Amount", "Paid", "Balance", "Reward", "Contact Details"
  ];

  // ── Title ─────────────────────────────────────────────────
  const monthLabel = month === 0 ? "All Months" : `${getMonthName(month)} ${year}`;
  sheet.getRange(1, 1, 1, 16).merge();
  sheet.getRange(1, 1).setValue(`👤 ${ownerName}  |  ${monthLabel}  |  ${filtered.length} task(s) found`);
  sheet.getRange(1, 1)
    .setBackground("#f29900").setFontColor("#ffffff")
    .setFontWeight("bold").setFontSize(12)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(1, 36);

  // Timestamp
  sheet.getRange(2, 1, 1, 16).merge();
  sheet.getRange(2, 1).setValue("Generated: " + new Date().toLocaleString());
  sheet.getRange(2, 1)
    .setBackground("#fff8e1").setFontColor("#5f6368")
    .setFontSize(9).setHorizontalAlignment("left");
  sheet.setRowHeight(2, 20);

  // ── Summary stats ─────────────────────────────────────────
  const totalTasks   = filtered.length;
  const completed    = filtered.filter(r => ["Completed","Complete"].includes(r[COL.STATUS - 1])).length;
  const active       = totalTasks - completed;
  const unpaid       = filtered.filter(r => (r[COL.BALANCE - 1] || 0) > 0).length;

  sheet.getRange(3, 1, 1, 16).merge();
  sheet.getRange(3, 1).setValue(
    `📁 Total: ${totalTasks}   ✅ Completed: ${completed}   🔄 Active: ${active}   💸 Unpaid: ${unpaid}`
  );
  sheet.getRange(3, 1)
    .setBackground("#fff3cd").setFontColor("#856404")
    .setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("center");
  sheet.setRowHeight(3, 24);

  // ── Headers ───────────────────────────────────────────────
  sheet.getRange(4, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(4, 1, 1, headers.length)
    .setBackground("#f29900").setFontColor("#ffffff")
    .setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(4, 30);
  sheet.setFrozenRows(4);

  // Column widths
  const widths = [110, 180, 160, 155, 120, 130, 200, 110, 110, 120, 120, 100, 90, 90, 90, 210];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

  // ── Data rows ─────────────────────────────────────────────
  filtered.forEach((row, idx) => {
    const dataRow = 5 + idx;
    sheet.getRange(dataRow, 1, 1, 16).setValues([row]);

    const status  = row[COL.STATUS - 1] || "";
    const balance = row[COL.BALANCE - 1] || 0;
    const isDone  = ["Completed","Complete"].includes(status);

    // Row colour by status
    const statusBg = {
      "Completed":           "#e8f5e9",
      "Complete":            "#e8f5e9",
      "On Risk":             "#ffebee",
      "On Hold":             "#f5f5f5",
      "Reject":              "#fce8e6",
      "Canceled":            "#f5f5f5",
      "Intake":              "#f5f5f5",
      "Documents Pending":   "#f5f5f5",
      "Processing" :         "#f5f5f5",
      "Under Review" :       "#f5f5f5",
      "Submitted" :          "#f5f5f5",
      "Awaiting Approval" :  "#f5f5f5",
      "Processing Document": "#f5f5f5",
 
  
    };
    const bg = statusBg[status] || (idx % 2 === 0 ? "#ffffff" : "#f8f9fa");
    sheet.getRange(dataRow, 1, 1, 16).setBackground(bg);
    sheet.setRowHeight(dataRow, 22);

    // Date formatting
    DATE_COLUMNS.forEach(col => sheet.getRange(dataRow, col).setNumberFormat("dd/MM/yyyy"));

    // Currency formatting
    const service = row[COL.SERVICE_TYPE - 1] || "";
    const config  = getServiceConfig(service);
    const curr    = config ? config.currency : "RM";
    const numfmt  = getCurrencyFormat(curr);
    [COL.AMOUNT, COL.PAID, COL.REWARD].forEach(col => sheet.getRange(dataRow, col).setNumberFormat(numfmt));

    // Balance — red if > 0
    const balanceCell = sheet.getRange(dataRow, COL.BALANCE);
    balanceCell.setNumberFormat(numfmt);
    if (typeof balance === "number" && balance > 0) {
      balanceCell.setBackground("#d93025").setFontColor("#ffffff");
    }

    sheet.getRange(dataRow, COL.CONTACT).setNumberFormat("@");
  });

  ss.setActiveSheet(sheet);
  return filtered.length;
}

// ============================================================
//  SEND DOCUMENTS TO CLIENT VIA EMAIL
// ============================================================
function openSendDocuments() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const row = sheet.getActiveCell().getRow();
  if (row <= HEADER_ROW) {
    SpreadsheetApp.getUi().alert("⚠️ Please click on a data row first.");
    return;
  }

  const taskId  = sheet.getRange(row, COL.TASK_ID).getValue()      || "—";
  const client  = sheet.getRange(row, COL.CLIENT).getValue()        || "—";
  const service = sheet.getRange(row, COL.SERVICE_TYPE).getValue()  || "—";
  const contact = sheet.getRange(row, COL.CONTACT).getValue()       || "";
  const docCell = sheet.getRange(row, COL.DOCUMENT);

  // ── Get document links from rich text ────────────────────
  let docs = [];
  try {
    const rtv = docCell.getRichTextValue();
    if (rtv) {
      const runs = rtv.getRuns();
      runs.forEach(run => {
        const url  = run.getLinkUrl();
        const text = run.getText().replace(/^[\n📎\s]+/, "").trim();
        if (url && text) docs.push({ name: text, url: url });
      });
    }
  } catch(e) {
    console.log("Doc read error: " + e.message);
  }

  if (docs.length === 0) {
    SpreadsheetApp.getUi().alert("⚠️ No documents found for this row.\nPlease upload documents first via 📎 Upload Document.");
    return;
  }

  const html = buildSendDocHTML(row, taskId, client, service, contact, docs);
  SpreadsheetApp.getUi().showSidebar(
    HtmlService.createHtmlOutput(html)
      .setTitle("📧 Send Documents")
      .setWidth(360)
  );
}

function buildSendDocHTML(row, taskId, client, service, contact, docs) {
  const docCheckboxes = docs.map((doc, i) => `
    <label class="doc-item">
      <input type="checkbox" value="${i}" checked>
      <span>📎 ${doc.name}</span>
    </label>
  `).join("");

  const defaultMessage =
    `Dear ${client},\n\nPlease find your requested documents attached to this email.\n\nShould you have any questions or require further assistance, please do not hesitate to contact us.\n\nBest regards,\nExample SDN BHD`;

  const docsJson = JSON.stringify(docs);

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f3f4; font-size: 12px; color: #202124; }
  .header { background: #102B4D; color: #E1B555; padding: 14px 16px; position: sticky; top: 0; z-index: 10; }
  .header h1 { font-size: 15px; font-weight: 700; margin-bottom: 2px; color: #E1B555; }
  .header p  { font-size: 10px; color: #ffffff; opacity: 0.8; }
  .body { padding: 14px; }
  .info-card { background: #fff; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; border-left: 3px solid #E1B555; }
  .info-card .tid { font-weight: 700; color: #102B4D; font-size: 13px; }
  .info-card .cl  { font-size: 12px; font-weight: 600; margin: 2px 0; color: #202124; }
  .info-card .svc { font-size: 11px; color: #6b7280; }
  label.section { font-size: 10px; font-weight: 700; color: #6b7280; letter-spacing: 1px; text-transform: uppercase; display: block; margin: 12px 0 6px; }
  input[type="text"], textarea {
    width: 100%; padding: 8px 10px;
    border: 1.5px solid #dadce0; border-radius: 6px;
    font-size: 12px; color: #202124; background: #fff;
    font-family: 'Segoe UI', Arial, sans-serif;
  }
  input[type="text"]:focus, textarea:focus { outline: none; border-color: #102B4D; }
  textarea { resize: vertical; min-height: 100px; }
  .doc-list { background: #fff; border-radius: 8px; padding: 8px 12px; border: 1.5px solid #dadce0; }
  .doc-item { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #f1f3f4; cursor: pointer; font-size: 11px; color: #202124; }
  .doc-item:last-child { border-bottom: none; }
  .doc-item input { width: 14px; height: 14px; cursor: pointer; accent-color: #102B4D; }
  .btn {
    width: 100%; padding: 10px; background: #102B4D; color: #E1B555;
    border: none; border-radius: 6px; font-size: 13px; font-weight: 700;
    cursor: pointer; margin-top: 14px; letter-spacing: 0.3px;
  }
  .btn:hover { background: #1a3d6b; }
  .btn:disabled { background: #9aa0a6; color: #fff; cursor: not-allowed; }
  .status { margin-top: 10px; font-size: 11px; text-align: center; min-height: 16px; padding: 6px; border-radius: 6px; }
  .status.success { background: #e8f5e9; color: #0c7b43; font-weight: 600; }
  .status.error   { background: #fce8e6; color: #d93025; font-weight: 600; }
  .status.loading { background: #e8f0fe; color: #102B4D; }
  .select-all { font-size: 10px; color: #102B4D; cursor: pointer; text-decoration: underline; float: right; margin-top: -18px; }
</style>
</head><body>

<div class="header">
  <h1>📧 Send Documents to Client</h1>
  <p>Example SDN BHD · Document Delivery</p>
</div>

<div class="body">

  <div class="info-card">
    <div class="tid">${taskId}</div>
    <div class="cl">🏢 ${client}</div>
    <div class="svc">🔧 ${service}</div>
  </div>

  <label class="section">Client Email</label>
  <input type="text" id="emailInput" value="${contact}" placeholder="client@email.com">

  <label class="section">Select Documents to Send
    <span class="select-all" onclick="toggleAll()">Select All</span>
  </label>
  <div class="doc-list">${docCheckboxes}</div>

  <label class="section">Message (editable)</label>
  <textarea id="msgInput">${defaultMessage}</textarea>

  <button class="btn" id="sendBtn" onclick="sendDocs()">📤 Send Email</button>
  <div class="status" id="status"></div>

</div>

<script>
  const DOCS = ${docsJson};
  let allChecked = true;

  function toggleAll() {
    allChecked = !allChecked;
    document.querySelectorAll('.doc-item input').forEach(cb => cb.checked = allChecked);
  }

  function sendDocs() {
    const email = document.getElementById('emailInput').value.trim();
    const msg   = document.getElementById('msgInput').value.trim();

    if (!email) {
      showStatus('❌ Please enter a client email address.', 'error');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      showStatus('❌ Invalid email format.', 'error');
      return;
    }

    const selected = [];
    document.querySelectorAll('.doc-item input:checked').forEach(cb => {
      selected.push(DOCS[parseInt(cb.value)]);
    });

    if (selected.length === 0) {
      showStatus('❌ Please select at least one document.', 'error');
      return;
    }

    document.getElementById('sendBtn').disabled = true;
    showStatus('⏳ Sending email...', 'loading');

    google.script.run
      .withSuccessHandler(function(result) {
        if (result.success) {
          showStatus('✅ Email sent successfully to ' + email + '!', 'success');
        } else {
          showStatus('❌ Error: ' + result.error, 'error');
          document.getElementById('sendBtn').disabled = false;
        }
      })
      .withFailureHandler(function(err) {
        showStatus('❌ Error: ' + err.message, 'error');
        document.getElementById('sendBtn').disabled = false;
      })
      .sendDocumentsToClient(email, selected, msg, ${row});
  }

  function showStatus(msg, type) {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.className = 'status ' + type;
  }
</script>
</body></html>`;
}

// ── Send email with PDF attachments ──────────────────────
function sendDocumentsToClient(email, selectedDocs, message, row) {
  try {
    const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const taskId  = sheet.getRange(row, COL.TASK_ID).getValue()     || "—";
    const client  = sheet.getRange(row, COL.CLIENT).getValue()       || "—";
    const service = sheet.getRange(row, COL.SERVICE_TYPE).getValue() || "—";
    const owner   = sheet.getRange(row, COL.OWNER).getValue()        || "—";
    const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd MMMM yyyy");

    // ── Fetch PDF blobs from Drive ────────────────────────
    const attachments = [];
    selectedDocs.forEach(doc => {
      try {
        const fileId = doc.url.match(/[-\w]{25,}/)?.[0];
        if (fileId) {
          const file = DriveApp.getFileById(fileId);
          attachments.push(file.getBlob().setName(doc.name));
        }
      } catch(e) {
        console.log("Attachment error for " + doc.name + ": " + e.message);
      }
    });

    if (attachments.length === 0) {
      return { success: false, error: "Could not fetch any documents from Drive. Please check file permissions." };
    }

    // ── Build attached file list for email HTML ───────────
    const attachedList = selectedDocs.map(d =>
      `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f3f4;font-size:12px;color:#202124;">
        <span style="color:#102B4D;margin-right:6px;">📎</span>${d.name}
      </td></tr>`
    ).join("");

    // ── Build branded HTML email ──────────────────────────
    const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0"
  style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);">

  <!-- Header -->
  <tr><td style="background:#102B4D;padding:24px 28px 18px;">
    <div style="color:#E1B555;font-size:20px;font-weight:700;letter-spacing:0.5px;">♦ Example SDN BHD ♦</div>
    <div style="color:#ffffff;font-size:11px;opacity:0.75;margin-top:4px;">Document Delivery · ${dateStr}</div>
  </td></tr>

  <!-- Gold accent bar -->
  <tr><td style="background:#E1B555;height:4px;"></td></tr>

  <!-- Greeting -->
  <tr><td style="padding:24px 28px 16px;">
    <p style="font-size:15px;color:#102B4D;font-weight:600;margin-bottom:12px;">Dear ${client},</p>
    <p style="font-size:13px;color:#374151;line-height:1.7;white-space:pre-line;">${message}</p>
  </td></tr>

  <!-- Task info -->
  <tr><td style="padding:0 28px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f8f9fa;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
      <tr style="background:#102B4D;">
        <td style="padding:8px 12px;color:#E1B555;font-size:11px;font-weight:700;">TASK REFERENCE</td>
        <td style="padding:8px 12px;color:#E1B555;font-size:11px;font-weight:700;">SERVICE</td>
        <td style="padding:8px 12px;color:#E1B555;font-size:11px;font-weight:700;">HANDLED BY</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-size:13px;color:#102B4D;font-weight:700;">${taskId}</td>
        <td style="padding:10px 12px;font-size:12px;color:#374151;">${service}</td>
        <td style="padding:10px 12px;font-size:12px;color:#374151;">${owner}</td>
      </tr>
    </table>
  </td></tr>

  <!-- Attached documents list -->
  <tr><td style="padding:0 28px 20px;">
    <p style="font-size:12px;font-weight:700;color:#102B4D;margin-bottom:8px;">📎 Attached Documents (${attachments.length}):</p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f8f9fa;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
      ${attachedList}
    </table>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:0 28px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>

  <!-- Contact info -->
  <tr><td style="padding:16px 28px;">
    <p style="font-size:12px;color:#6b7280;margin-bottom:6px;">For enquiries, please contact us:</p>
    <p style="font-size:12px;color:#374151;">
      📞 +60 11........ <br>
      📧 hello@example.com <br>
      🌐 Example SDN BHD
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#102B4D;padding:14px 28px;">
    <p style="color:#E1B555;font-size:11px;margin:0;">♦ Example SDN BHD · Document Management System</p>
    <p style="color:#ffffff;font-size:10px;opacity:0.6;margin:4px 0 0;">
      This email and its attachments are confidential and intended solely for the addressee.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

    // ── Plain text fallback ───────────────────────────────
    const plainBody =
      `Dear ${client},\n\n${message}\n\n` +
      `Task Reference: ${taskId}\nService: ${service}\nHandled By: ${owner}\n\n` +
      `Attached Documents (${attachments.length}):\n` +
      selectedDocs.map(d => `• ${d.name}`).join("\n") +
      `\n\nFor enquiries:\nPhone: +60 123456789\nEmail: hello@example.com\n\n` +
      `Example SDN BHD`;

    // ── Send email ────────────────────────────────────────
    MailApp.sendEmail({
      to:          email,
      subject:     `Documents from Example SDN BHD — ${taskId}`,
      body:        plainBody,
      htmlBody:    htmlBody,
      attachments: attachments,
      name:        "Example SDN BHD"
    });

    // ── Log in Notes (skip silently if protected) ─────────
    try {
      const notesCell    = sheet.getRange(row, COL.NOTES);
      const existingNote = notesCell.getValue() || "";
      const logEntry     = `[Docs sent to ${email} on ${dateStr}]`;
      notesCell.setValue(existingNote ? existingNote + "  " + logEntry : logEntry);
    } catch(e) {
      console.log("Notes log skipped (protected): " + e.message);
    }

    return { success: true };

  } catch(err) {
    return { success: false, error: err.message };
  }
}
