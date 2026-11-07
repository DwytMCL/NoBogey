# NoBogey transactional email delivery

NoBogey uses one transactional-email provider for every user-facing surface:

- Supabase Auth sends signup confirmation, password recovery, email-change, and invitation messages through Resend SMTP.
- The `send-booking-emails` Edge Function sends booking and assignment messages through the Resend HTTPS API.
- Mobile and admin clients continue to call Supabase Auth; provider credentials never enter a mobile build, Vite bundle, or database table.

Brevo is not used. Cloudflare remains the authoritative DNS provider and publishes the sender-authentication records supplied by Resend.

## Sender identities

| Purpose | Sender |
| --- | --- |
| Supabase Auth | `NoBogey Auth <no-reply@auth.nobogeyofficial.com>` |
| Booking notifications | `NoBogey Bookings <bookings@auth.nobogeyofficial.com>` |

The dedicated `auth.nobogeyofficial.com` sending domain protects the reputation of the website and API hostnames.

## Provider and limits

Resend Free currently includes 3,000 emails per month with a 100-email daily limit. The hosted Supabase Auth limit is set to 30 emails per hour after custom SMTP is enabled. Turnstile, Supabase's per-user resend cooldown, and the 30/hour project ceiling remain enabled to reduce abuse.

The rate limit must not be raised while Supabase's default email provider is active. Its built-in service is intended only for testing and is capped at two messages per hour.

## Cloudflare DNS setup

1. Add `auth.nobogeyofficial.com` as a sending domain in Resend.
2. Copy the exact SPF and DKIM records shown by Resend into the `nobogeyofficial.com` zone in Cloudflare.
3. Set every mail-related CNAME to **DNS only**. Do not proxy SMTP or DKIM records.
4. Add the DMARC record recommended by Resend. Start with monitoring policy (`p=none`) and move to quarantine/reject only after delivery reports are clean.
5. Verify the domain in Resend before changing Supabase.

Do not invent or reuse DNS values: DKIM keys and provider verification values are unique to the Resend account. Keep existing website, Supabase API, and root-domain records unchanged.

## Hosted Supabase Auth SMTP

Configure these values under **Authentication > Email > SMTP Settings**, or through the Supabase Management API:

| Setting | Value |
| --- | --- |
| Enable custom SMTP | `true` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Resend API key (secret) |
| Sender email | `no-reply@auth.nobogeyofficial.com` |
| Sender name | `NoBogey Auth` |
| Emails per hour | `30` |

Never commit the API key or place it in an `EXPO_PUBLIC_` or `VITE_` variable.

## Booking-email Edge Function

Set the following hosted Edge Function secrets:

```text
RESEND_API_KEY=<same restricted Resend sending key>
BOOKING_EMAIL_FROM=NoBogey Bookings <bookings@auth.nobogeyofficial.com>
OUTBOX_DISPATCH_SECRET=<random scheduler credential>
BOOKING_MAINTENANCE_SECRET=<different random scheduler credential>
```

The dispatcher uses each outbox row ID as the Resend idempotency key, so a retry cannot create a second provider submission within Resend's idempotency window.

The `schedule_backend_workers` migration reads the custom API origin and matching worker credentials from Supabase Vault. Keep the Vault values and Edge Function secrets synchronized; never place their values in source control.

## Cutover verification

After DNS is verified and both server-side credentials are installed:

1. Enable custom SMTP and set the hosted Auth rate limit to 30/hour.
2. Deploy `send-booking-emails` without exposing its dispatch secret.
3. Create one new test account from mobile and one password-recovery request from the admin portal.
4. Confirm both messages show `SPF=pass`, `DKIM=pass`, and `DMARC=pass` in the received-message headers.
5. Trigger one booking email and verify its outbox row is marked sent with a provider message ID.
6. Run Supabase security and performance advisors after the hosted configuration is changed.

If any test fails, restore the previous SMTP configuration before retrying. Do not leave custom SMTP enabled with an unverified sender or invalid password.
