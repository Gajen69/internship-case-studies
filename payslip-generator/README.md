# 1. Invoice & Payslip Generator
Problem: Payslips were made by hand in Canva, taking 5 to 10 minutes each. There was no database, records were stored locally, and some got lost.<br>
Solution: A Google Sheets + Apps Script system. Pick a service, the amount auto-fills, choose the quantity, and the total calculates itself. It generates a PDF, emails it directly to the client, and saves it in Google Drive. The payslip version automatically deducts pay for absent days.<br>
Stack: Google Sheets, Google Apps Script, Google Drive, Gmail<br>
Extras: Multicurrency support for each branch (Malaysia, Indonesia, China)<br>
Users: HR staff, daily<br>
Result: Roughly 5 to 10 minutes per document down to about 2 minute, plus a proper record database with no lost files.<br>
What I'd improve: Add an approval step before sending, and an audit log.
