# Internship Case Studies

Projects I built as the sole IT developer during my internship.

# 1. Invoice and Payslip Generator
Problem: Invoices and payslips were made by hand in Canva, taking 5 to 10 minutes each. There was no database, records were stored locally, and some got lost.\
Solution: A Google Sheets + Apps Script system. Pick a service, the amount auto-fills, choose the quantity, and the total calculates itself. It generates a PDF, emails it directly to the client, and saves it in Google Drive. The payslip version automatically deducts pay for absent days.\
Stack: Google Sheets, Google Apps Script, Google Drive, Gmail\
Extras: Multicurrency support for each branch (Malaysia, Indonesia, China)\
Users: HR staff, daily\
Result: Roughly 5 to 10 minutes per document down to about 1 minute (fix this to the real number), plus a proper record database with no lost files.\
What I'd improve: Add an approval step before sending, and an audit log.

# 2. CRM System with Dashboard
Problem: The team tracked projects over WhatsApp. No database, no dashboard, no way to separate departments, and things got confusing.\
Solution: A CRM built on Google Sheets + Apps Script with:\
Role-based access (only team leaders can change project status)\
Auto email to the team leader when a task isn't completed\
Service selection that auto-fills the amount and timeline\
Document upload via Drive, and sharing with clients directly\
A dashboard with totals per service, team leader tasks, and month-over-month % comparison\
Users: 8 to 10 staff at a startup company\
Result: One source of truth instead of scattered chats, with automatic follow-ups.\
What I'd improve: Move to a real database (Firebase or PostgreSQL) if the team grows.

# 3. Client Websites
Problem: A nightclub and restaurant client (Arabic) and a new office branch both needed a professional web presence.\
Solution: Custom-coded sites. The office branch site is multilingual (English, Arabic, Mandarin) with Home, About Us, Our Services and Contact Us pages, an appointment form connected to Google Sheets, and social media links.\
Stack: HTML, CSS, JavaScript, using original images taken by the team\
What I'd improve: SEO, performance optimization, and a mobile-first review.
