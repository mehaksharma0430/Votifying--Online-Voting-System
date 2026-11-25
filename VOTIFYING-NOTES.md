# Votifying local setup

Open http://127.0.0.1:3000. Existing start commands are unchanged.

## Demo mobile OTP

Log in > Mobile OTP > enter a 10-digit Indian-format test number > Generate demo OTP > enter the displayed code > Verify & log in.

OTP_MODE=demo is set in server/.env. No SMS is sent and number ownership is NOT verified. First use creates a separate demo account; reusing the same demo number signs into that account. Demo accounts never access future real SMS identities or existing username accounts. Codes expire after 5 minutes, allow 5 attempts, and can be used once. Resend cooldown: 30 seconds. Request limits: 4 per number and 15 per IP per 15 minutes. Challenges and limits are in memory and reset on backend restart; this is a single-process local implementation.

## Future real SMS

Twilio Verify integration is implemented but NOT configured or tested with real SMS. Configure server/.env locally with OTP_MODE=twilio, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID, then restart the server. Never put credentials in client files or Git. Demo mode is disabled when NODE_ENV=production. Provider availability, account restrictions and SMS delivery must be tested before public use.

References: https://www.twilio.com/docs/verify/api/verification and https://www.twilio.com/docs/verify/api/verification-check

## Citizen Desk

All Indian states and Union Territories can be selected. Roles include MLA, Chief Minister, municipal councillor, Municipal Corporation, and other public authority. Names, districts and wards are entered by the user, not verified against an official directory.

Feedback and reports are private to the signed-in account. They are saved locally, NOT sent. The prepared message can be copied or downloaded. The CPGRAMS link opens https://pgportal.gov.in/; users must review applicability and submit on the official portal themselves. Local references are not official grievance numbers. No resolution status is fabricated.

Party comparisons use user-provided names, a location, an assessment period and a common service criterion. None of these / Not enough information options are added. Results are voluntary account opinions, not representative polling.

## Verification

Frontend build passed. Browser demo OTP generation and successful sign-in passed. API checks passed for malformed numbers, wrong codes, consumed-code rejection, report persistence, invalid ratings, anonymous access denial, and removal of the public account-list endpoint. Real SMS and official submissions were not attempted.

## Fixed local demo login

Number: 9000000002. Code: 123456. Click Generate demo OTP before entering the code. Each login challenge still expires after five minutes and is single-use, but generating again always gives this same code for this number in non-production demo mode only. Other demo numbers receive random codes; real SMS mode never uses this fixed code.
