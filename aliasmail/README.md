# AliasMail

A static GitHub Pages interface preview for a private email-alias forwarding service.

## Preview
Open the deployed GitHub Pages path `/aliasmail/`. Demo verification code: `123456`. This is only a UI simulation; it does not send or receive email.

## Production requirements
- A domain you control; aliases cannot be created under `@gmail.com`.
- Backend such as Supabase Edge Functions.
- Transactional email provider to send verification OTPs to users' existing email addresses.
- Inbound email provider (e.g. AWS SES receiving or Mailgun Routes) configured for your domain's MX records.
- Secure, hashed visitor session tokens; private inbox authorization; provider webhook signature verification.
- Create a unique alias after each successful email verification.
- Forward messages received at that alias to the verified destination inbox.
- Enforce 10-minute expiry from alias creation and scheduled deletion of alias/message data.
- Rate limits, CAPTCHA/abuse controls, SPF, DKIM and DMARC.

Do not publish this as a working email service until these backend integrations and security controls are implemented.