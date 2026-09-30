/** ===================== CONFIG ===================== **/
const SHEET_DATA = "PayrollData";
const SHEET_LOG = "Log";




/** ===================== MENU ===================== **/


/** ===================== ENTRY POINTS ===================== **/
function generateSelectedPayslip() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_DATA);
  const row = sheet.getActiveCell().getRow();
  if (row === 1) {
    SpreadsheetApp.getUi().alert("Please select a data row, not the header.");
    return;
  }
  const result = generatePayslipForRow(row);
  SpreadsheetApp.getUi().alert("Payslip generated: " + result.fileName);
}



/** ===================== CORE GENERATOR ===================== **/
function generatePayslipForRow(row) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_DATA);
  const data = sheet.getRange(row, 1, 1, 11).getValues()[0];

  const payslip = {
    id: data[0] || ("PS-" + new Date().getTime()),
    name: data[1],
    designation: data[2],
    period: data[3],
    monthlySalary: parseFloat(data[4]) || 0,
    workingDays: parseFloat(data[5]) || 0,
    daysAbsent: parseFloat(data[6]) || 0,
    otherDeduction: parseFloat(data[7]) || 0,
    otherDeductionNote: data[8] || "",
    allowances: parseFloat(data[9]) || 0,
    preparedBy: data[10] || ""
  };

  const dailySalary = payslip.workingDays > 0
    ? payslip.monthlySalary / payslip.workingDays
    : 0;
  const absenceDeduction = dailySalary * payslip.daysAbsent;
  const totalDeductions = absenceDeduction + payslip.otherDeduction;
  const netSalary = payslip.monthlySalary + payslip.allowances - totalDeductions;

  const calc = { dailySalary, absenceDeduction, totalDeductions, netSalary };

  const html = buildPayslipHtml(payslip, calc);
  const pdfBlob = htmlToPdfBlob(html, "Payslip_" + payslip.name + "_" + payslip.period);

  const folder = getOrCreateFolder(FOLDER_PAYSLIP);
  const file = folder.createFile(pdfBlob);

  logAction(payslip.name, payslip.period, file.getUrl());

  return { fileName: file.getName(), url: file.getUrl() };
}

/** ===================== IMAGE TO BASE64 ===================== **/


/** ===================== EMAIL ENTRY POINT ===================== **/
function emailSelectedPayslip() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_DATA);
  const row = sheet.getActiveCell().getRow();
  if (row === 1) {
    SpreadsheetApp.getUi().alert("Please select a data row, not the header.");
    return;
  }
  generateAndEmailPayslip(row);
}

/** ===================== GENERATE + EMAIL TOGETHER ===================== **/
function generateAndEmailPayslip(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_DATA);
  const name = sheet.getRange(row, 2).getValue();
  const period = sheet.getRange(row, 4).getValue();
  const email = sheet.getRange(row, 12).getValue(); // column L

  if (!email || !email.toString().includes("@")) {
    SpreadsheetApp.getUi().alert("No valid email found in column L for " + name + ".");
    return;
  }

  // Generate fresh PDF each time so it's always current with the row's data
  const result = generatePayslipForRow(row);
  const fileId = result.url.match(/[-\w]{25,}/)[0];
  const file = DriveApp.getFileById(fileId);

  MailApp.sendEmail({
  to: email,
  subject: "Payslip - " + period,
  body: "Dear " + name + ",\n\nPlease find attached your payslip for " + period + ".\n\nRegards,\nExample Sdn Bhd",
  attachments: [file.getAs(MimeType.PDF)],
  name: "Example Sdn Bhd"
});

  SpreadsheetApp.getUi().alert("Payslip emailed to " + email);
}

/** ===================== HTML BUILDER ===================== **/
function buildPayslipHtml(payslip, calc) {
  const headerDataUri = getImageAsBase64(HEADER_IMG_ID);
  const footerDataUri = getImageAsBase64(FOOTER_IMG_ID);
  const fmt = formatRM;

  let otherDeductionRow = "";
  if (payslip.otherDeduction > 0) {
    otherDeductionRow = `
      <tr><td class="label">${payslip.otherDeductionNote || "Other Deduction"}</td>
      <td class="value">- ${fmt(payslip.otherDeduction)}</td></tr>`;
  }

  let allowanceRow = "";
  if (payslip.allowances > 0) {
    allowanceRow = `
      <tr><td class="label">Allowances</td>
      <td class="value">+ ${fmt(payslip.allowances)}</td></tr>`;
  }

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
  <style>
    body { font-family: Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; }
    .container { width: 700px; margin: 0 auto; min-height: 980px; display: flex; flex-direction: column; }
    .header-img, .footer-img { width: 100%; display: block; }
    .content { flex: 1; }
    .title { font-size: 20px; font-weight: bold; margin: 20px 30px 10px 30px; color: #1a2a4a; }
    .section { margin: 0 30px 15px 30px; }
    .section h3 { font-size: 13px; color: #1a2a4a; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    td { padding: 5px 0; }
    .label { color: #555; width: 55%; }
    .value { text-align: right; font-weight: bold; }
    .net-box { margin: 20px 30px; padding: 14px 18px; background: #f0fbfc; border: 1px solid #0bb8c9; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
    .net-box .amount { font-size: 18px; font-weight: bold; color: #0bb8c9; }
    .prepared { margin: 30px 30px 0 30px; font-size: 12px; }
    .footer-wrap { margin-top: auto; }
  </style>
  </head>
  <body>
  <div class="container">

    <img class="header-img" src="${headerDataUri}">

    <div class="content">
      <div class="title">PAYSLIP</div>

      <div class="section">
        <h3>Employee Summary</h3>
        <table>
          <tr><td class="label">Name</td><td class="value">${payslip.name}</td></tr>
          <tr><td class="label">Designation</td><td class="value">${payslip.designation}</td></tr>
          <tr><td class="label">Monthly Salary</td><td class="value">${fmt(payslip.monthlySalary)}</td></tr>
          <tr><td class="label">Working Days</td><td class="value">${payslip.workingDays} days</td></tr>
          <tr><td class="label">Days Absent</td><td class="value">${payslip.daysAbsent} day(s)</td></tr>
        </table>
      </div>

      <div class="section">
        <h3>Calculation</h3>
        <table>
          <tr><td class="label">Daily Salary (Monthly ÷ Working Days)</td><td class="value">${fmt(calc.dailySalary)}</td></tr>
          <tr><td class="label">Absence Deduction</td><td class="value">- ${fmt(calc.absenceDeduction)}</td></tr>
          ${otherDeductionRow}
          ${allowanceRow}
          <tr><td class="label"><b>Total Deductions</b></td><td class="value"><b>- ${fmt(calc.totalDeductions)}</b></td></tr>
        </table>
      </div>

      <div class="net-box">
        <div class="label">Net Salary Payable</div>
        <div class="amount">${fmt(calc.netSalary)}</div>
      </div>

      <div class="prepared">Prepared By: ${payslip.preparedBy || "System Generated"}</div>
    </div>

    <div class="footer-wrap">
      <img class="footer-img" src="${footerDataUri}">
    </div>

  </div>
  </body>
  </html>
  `;

  return html;
}

function formatRM(num) {
  return "RM " + Number(num).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** ===================== HTML -> PDF ===================== **/


/** ===================== DRIVE FOLDER HELPER ===================== **/


/** ===================== LOGGING ===================== **/
function logAction(name, period, url) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName(SHEET_LOG);
  if (!logSheet) {
    logSheet = ss.insertSheet(SHEET_LOG);
    logSheet.appendRow(["Timestamp", "Employee", "Period", "PDF Link"]);
  }
  logSheet.appendRow([new Date(), name, period, url]);
}

