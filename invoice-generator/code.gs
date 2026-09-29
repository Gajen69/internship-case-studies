

function getInvoiceData(activeRow) {
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const invoiceSheet = ss.getSheetByName('Invoices');
  const data         = invoiceSheet.getRange(activeRow, 1, 1, 33).getValues()[0];

  
  const headerB64 = getImageAsBase64(HEADER_IMG_ID);
  const footerB64 = getImageAsBase64(FOOTER_IMG_ID);

  const invId       = data[0]  || '';
  const invDate     = data[1]  ? Utilities.formatDate(new Date(data[1]), Session.getScriptTimeZone(), 'dd MMM yyyy') : '';
  const invDue      = data[2]  ? Utilities.formatDate(new Date(data[2]), Session.getScriptTimeZone(), 'dd MMM yyyy') : '';
  const clientCo    = data[3]  || '';
  const clientName  = data[4]  || '';
  const clientAddr  = data[5]  || '';
  const clientEmail = data[6]  || '';
  const payMethod   = data[7]  || '';
  const bankName    = data[8]  || '';
  const bankAcc     = data[9]  || '';
  const item1Desc   = data[10] || '';
  const item1Qty    = parseFloat(data[11]) || 0;
  const item1Price  = parseFloat(data[12]) || 0;
  const item2Desc   = data[13] || '';
  const item2Qty    = parseFloat(data[14]) || 0;
  const item2Price  = parseFloat(data[15]) || 0;
  const item3Desc   = data[16] || '';
  const item3Qty    = parseFloat(data[17]) || 0;
  const item3Price  = parseFloat(data[18]) || 0;
  const item4Desc   = data[19] || '';
  const item4Qty    = parseFloat(data[20]) || 0;
  const item4Price  = parseFloat(data[21]) || 0;
  const item5Desc   = data[22] || '';
  const item5Qty    = parseFloat(data[23]) || 0;
  const item5Price  = parseFloat(data[24]) || 0;
  const amountPaid  = parseFloat(data[25]) || 0;
  const discPct     = parseFloat(data[26]) || 0;
  const sstPct      = parseFloat(data[27]) || 0;
  const ourCompany  = data[28] || 'Example Sdn Bhd';
  const notes       = data[29] || '';
  const currency    = data[30] || 'RM';
  const swiftCode   = data[31] || '';
  const bankAddress = data[32] || '';

  const item1Amt            = item1Qty * item1Price;
  const item2Amt            = item2Qty * item2Price;
  const item3Amt            = item3Qty * item3Price;
  const item4Amt = item4Qty * item4Price;
  const item5Amt = item5Qty * item5Price;
  const subtotal  = item1Amt + item2Amt + item3Amt + item4Amt + item5Amt;
  const afterDeposit        = subtotal - amountPaid;
  const sst                 = afterDeposit * sstPct / 100;
  const totalBeforeDiscount = afterDeposit + sst;
  const discount            = totalBeforeDiscount * discPct / 100;
  const total               = totalBeforeDiscount - discount;

  function fmt(n) {
    return currency + ' ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function itemRow(num, desc, qty, price, amt) {
    if (!desc) return '';
    const bg = num % 2 === 0 ? '#f7f8fa' : '#ffffff';
    return `<tr style="background:${bg}">
      <td style="text-align:center;color:#aaa;padding:9px 8px;border-bottom:1px solid #eee;font-size:9pt">${num}</td>
      <td style="padding:9px 8px;border-bottom:1px solid #eee;font-size:9.5pt">${desc}</td>
      <td style="text-align:center;padding:9px 8px;border-bottom:1px solid #eee;font-size:9.5pt">${qty}</td>
      <td style="text-align:right;padding:9px 8px;border-bottom:1px solid #eee;font-size:9.5pt">${fmt(price)}</td>
      <td style="text-align:right;padding:9px 8px;border-bottom:1px solid #eee;font-size:9.5pt;font-weight:600">${fmt(amt)}</td>
    </tr>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; color: #222; background:#fff; width:794px; }
  .page { width:794px; min-height:1122px; display:flex; flex-direction:column; background:#fff; }
  .hdr-wrap { position:relative; width:100%; height:90px; background:#fff; overflow:hidden; }
  .hdr-bar-cyan { position:absolute; top:0; left:0; right:0; height:90px; background:#00aeef; clip-path:polygon(0 0, 72% 0, 58% 100%, 0 100%); }
  .hdr-bar-dark { position:absolute; top:0; left:0; right:0; height:90px; background:#1a1a1a; clip-path:polygon(0 0, 62% 0, 48% 100%, 0 100%); }
  .hdr-logo { position:absolute; top:0; right:0; width:220px; height:90px; display:flex; flex-direction:column; align-items:flex-end; justify-content:center; padding-right:24px; padding-top:8px; }
  .logo-name { font-size:22pt; font-weight:900; color:#1a1a1a; line-height:1; letter-spacing:-0.5px; }
  .logo-name span { color:#00aeef; }
  .logo-tag { font-size:7.5pt; color:#555; text-align:right; margin-top:2px; letter-spacing:0.3px; }
  .logo-rule { width:100%; border:none; border-top:2px solid #00aeef; margin-top:5px; }
  .items-wrap { padding:16px 32px 0; }
  .items-table { width:100%; border-collapse:collapse; }
  .items-table thead tr { background:#1a1a1a; }
  .items-table thead th { color:#fff; font-size:8pt; font-weight:700; padding:9px 8px; letter-spacing:0.5px; }
  .tot-table { border-collapse:collapse; min-width:270px; }
  .tot-table td { padding:5px 8px; font-size:9.5pt; }
  .tot-lbl { color:#555; text-align:right; }
  .tot-val { color:#333; text-align:right; min-width:120px; }
  .tot-disc { color:#0f6e56; text-align:right; font-weight:600; }
  .grand-lbl { font-size:12pt; font-weight:700; color:#1a1a1a; text-align:right; }
  .grand-val { font-size:13pt; font-weight:700; color:#00aeef; text-align:right; }
  .grand-row td { border-top:2.5px solid #00aeef; padding-top:10px; padding-bottom:4px; }
  .notes-wrap { padding:16px 32px 0; }
  .notes-lbl { font-size:7.5pt; font-weight:700; color:#00aeef; letter-spacing:1px; margin-bottom:5px; }
  .notes-box { background:#f7f8fa; border:1px solid #e0e0e0; border-left:3px solid #00aeef; border-radius:4px; padding:9px 12px; font-size:8.5pt; color:#555; line-height:1.7; }
  .sigs { display:flex; justify-content:space-between; padding:24px 80px 0; }
  .sig { text-align:center; width:190px; }
  .sig-line { border-bottom:1px solid #bbb; height:40px; margin-bottom:6px; }
  .sig-lbl { font-size:7.5pt; color:#999; letter-spacing:0.5px; text-transform:uppercase; }
  .spacer { flex:1; min-height:24px; }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER IMAGE -->
  <img src="${headerB64}" style="width:100%;display:block;" />

  <!-- INVOICE TITLE + CLIENT + PAYMENT -->
  <div style="display:flex; justify-content:space-between; padding:20px 32px 0; align-items:flex-start;">

    <!-- LEFT SIDE -->
    <div style="flex:1;">
      <div style="font-size:30pt; font-weight:900; color:#1a1a1a; line-height:1;">INVOICE</div>
      <div style="margin-top:6px; font-size:10pt; color:#333;">
        <span style="font-weight:600;">Date:</span> ${invDate}
      </div>
      <div style="margin-top:20px;">
        <span style="color:#00aeef; font-weight:700; font-size:10pt; letter-spacing:0.5px;">INVOICE TO:</span>
        <span style="font-weight:700; font-size:11pt; color:#1a1a1a; margin-left:8px;">${clientCo}</span>
      </div>
      <div style="margin-top:10px; font-size:10pt; color:#1a1a1a; line-height:2;">
        <div><span style="font-weight:700;">Client Name:</span> ${clientName}</div>
        <div><span style="font-weight:700;">Client Address:</span> ${clientAddr}</div>
        <div><span style="font-weight:700;">Client Email:</span> ${clientEmail}</div>
      </div>
    </div>

    <!-- RIGHT SIDE -->
    <div style="flex:1; padding-left:40px;">
      <div style="font-size:10pt; margin-bottom:10px;">
        <span style="color:#00aeef; font-weight:700; letter-spacing:0.5px;">PAYMENT METHOD:</span>
        <span style="font-weight:700; color:#1a1a1a; margin-left:6px;">All payment must be made to our account:</span>
      </div>
      <div style="font-size:10pt; color:#1a1a1a; line-height:2.1;">
        <div><span style="font-weight:700;">Name :</span> ${ourCompany}</div>
        <div><span style="font-weight:700;">Account No :</span> ${bankAcc}</div>
        <div><span style="font-weight:700;">Bank Name :</span> ${bankName}</div>
        <div><span style="font-weight:700;">Swift Code :</span> ${swiftCode}</div>
        <div><span style="font-weight:700;">Address :</span> ${bankAddress}</div>
      </div>
    </div>

  </div>

  <hr style="margin:16px 32px 0; border:none; border-top:1.5px solid #00aeef; opacity:0.4;">

  <!-- LINE ITEMS -->
  <div class="items-wrap">
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:30px;text-align:center">#</th>
          <th style="text-align:left">DESCRIPTION</th>
          <th style="width:50px;text-align:center">QTY</th>
          <th style="width:130px;text-align:right">UNIT PRICE</th>
          <th style="width:130px;text-align:right">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${itemRow(1, item1Desc, item1Qty, item1Price, item1Amt)}
        ${itemRow(2, item2Desc, item2Qty, item2Price, item2Amt)}
        ${itemRow(3, item3Desc, item3Qty, item3Price, item3Amt)}
        ${itemRow(4, item4Desc, item4Qty, item4Price, item4Amt)}
        ${itemRow(5, item5Desc, item5Qty, item5Price, item5Amt)}
      </tbody>
    </table>
  </div>

  <!-- TOTALS + TERMS -->
  <div style="display:flex; justify-content:space-between; padding:70px 32px 0; align-items:flex-start;">

    <!-- LEFT: Terms & Conditions -->
    <div style="flex:1; padding-right:30px;">
      <div style="font-size:10pt; font-weight:700; color:#00aeef; margin-bottom:10px;">TERMS & CONDITION/NOTES:</div>
      <ul style="font-size:6pt; color:#333; line-height:1.9; padding-left:0; list-style:none;">
        <li>Processing time may vary and is subject to delays depending on the relevant department or authority.</li>
        <li>In the event of application rejection, only 50% of the total amount paid will be refunded.</li>
        <li>No refund will be issued once the application has been approved or fully completed.</li>
        <li>The client is solely responsible for preparing all required documents accurately and in full.</li>
        <li>The company shall not be held responsible for any delays resulting from incomplete, incorrect, or late submission of documents by the client.</li>
        <li>If the application is not submitted to the relevant department or authority, a full refund of the total amount paid will be issued.</li>
      </ul>
    </div>

    <!-- RIGHT: Totals -->
    <div style="min-width:280px;">
      <table style="width:100%; border-collapse:collapse; font-size:10pt;">
        <tr>
          <td style="padding:6px 8px; color:#333; text-align:left; font-weight:600;">SUBTOTAL:</td>
          <td style="padding:6px 8px; color:#1a1a1a; text-align:right; font-weight:700;">${currency} ${subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
        </tr>
        ${amountPaid > 0 ? `
        <tr>
          <td style="padding:6px 8px; color:#333; text-align:left; font-weight:600;">AMOUNT PAID:</td>
          <td style="padding:6px 8px; color:#1a1a1a; text-align:right; font-weight:700;">- ${currency} ${amountPaid.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
        </tr>
        <tr>
          <td style="padding:6px 8px; color:#333; text-align:left; font-weight:600;">BALANCE:</td>
          <td style="padding:6px 8px; color:#1a1a1a; text-align:right; font-weight:700;">${currency} ${afterDeposit.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
        </tr>` : ''}

        ${discPct > 0 ? `
        
        <tr>
          <td style="padding:6px 8px; color:#333; text-align:left; font-weight:600;">DISCOUNT (${discPct}%):</td>
          <td style="padding:6px 8px; color:#0f6e56; text-align:right; font-weight:700;">- ${currency} ${discount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:6px 8px; color:#333; text-align:left; font-weight:600;">SST (${sstPct}%):</td>
          <td style="padding:6px 8px; color:#1a1a1a; text-align:right; font-weight:700;">${currency} ${sst.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
        </tr>
        
      </table>

      <!-- TOTAL box -->
      <div style="display:flex; margin-top:8px; overflow:hidden; border-radius:4px;">
        <div style="background:#00aeef; color:#fff; font-size:12pt; font-weight:700; padding:12px 20px; display:flex; align-items:center; clip-path:polygon(0 0, 85% 0, 100% 100%, 0 100%);">
          TOTAL:
        </div>
        <div style="background:#1a1a1a; color:#fff; font-size:13pt; font-weight:700; padding:12px 16px; flex:1; text-align:right; display:flex; align-items:center; justify-content:flex-end;">
          ${currency} ${total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        </div>
      </div>
    </div>

  </div>

  <!-- NOTES -->
  ${notes ? `
  <div class="notes-wrap">
    <div class="notes-lbl">NOTES &amp; PAYMENT INSTRUCTIONS</div>
    <div class="notes-box">${notes}</div>
  </div>` : ''}

  <!-- THANK YOU -->
  <div style="padding:24px 32px 0;">
    <div style="font-size:16pt; font-weight:700; color:#00aeef; font-style:italic;">
      Thank You For Your Business!
    </div>
  </div>

  <div class="spacer"></div>

  <!-- FOOTER IMAGE -->
  <img src="${footerB64}" style="width:100%;display:block;" />

</div>
</body>
</html>`;

  return { html, invId, clientCo, clientName, clientEmail };
}

function generateInvoicePDF() {
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const invoiceSheet = ss.getSheetByName('Invoices');

  const activeRow = invoiceSheet.getActiveCell().getRow();
  if (activeRow < 2) {
    SpreadsheetApp.getUi().alert('Please click on an invoice row first (row 2 or below).');
    return;
  }

  const { html, invId } = getInvoiceData(activeRow);

  const blob     = Utilities.newBlob(html, 'text/html', 'invoice.html');
  const htmlFile = DriveApp.createFile(blob);
  const pdfBlob  = htmlFile.getAs('application/pdf');
  htmlFile.setTrashed(true);

  const folder = getOrCreateFolder(FOLDER_INVOICE);

  const fileName = `Example_${invId}_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd')}.pdf`;
  folder.createFile(pdfBlob.setName(fileName));

  SpreadsheetApp.getUi().alert(`✅ Done!\n\nFile: ${fileName}\nSaved to "Example Invoices" in Google Drive.`);
}

function generateAndEmailInvoice() {
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const invoiceSheet = ss.getSheetByName('Invoices');

  const activeRow = invoiceSheet.getActiveCell().getRow();
  if (activeRow < 2) {
    SpreadsheetApp.getUi().alert('Please click on an invoice row first (row 2 or below).');
    return;
  }

  const { html, invId, clientCo, clientName, clientEmail } = getInvoiceData(activeRow);

  if (!clientEmail) {
    SpreadsheetApp.getUi().alert('❌ No client email found in Column G!');
    return;
  }

  // Confirm before sending
  const ui      = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    'Send Invoice',
    `Send invoice ${invId} to ${clientEmail}?`,
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  // Generate PDF
  const blob     = Utilities.newBlob(html, 'text/html', 'invoice.html');
  const htmlFile = DriveApp.createFile(blob);
  const pdfBlob  = htmlFile.getAs('application/pdf');
  htmlFile.setTrashed(true);

  const fileName = `Example_Invoice_${invId}_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd')}.pdf`;
  pdfBlob.setName(fileName);

  // Send email
  GmailApp.sendEmail(
    clientEmail,
    `Invoice ${invId} from Example SDN BHD`,
    `Dear ${clientName ? clientName : clientCo},\n\nPlease find attached your invoice ${invId} from Example Sdn Bhd.\n\nFor any enquiries, please contact us at hello@examplesdnbhd.asia or +011111....\n\nThank you for your business!\n\nBest regards,\nExample Sdn Bhd`,
    {
      attachments: [pdfBlob],
      name: 'Example Sdn Bhd'
    }
  );

  // Also save to Drive
  const folder = getOrCreateFolder(FOLDER_INVOICE);
  folder.createFile(pdfBlob);

  SpreadsheetApp.getUi().alert(`✅ Invoice sent to ${clientEmail} and saved to Drive!`);
}
