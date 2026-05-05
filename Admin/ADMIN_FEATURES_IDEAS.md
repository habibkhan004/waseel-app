# Admin Panel – Feature Ideas (Waseel / Saudi AI Sales)

Use this as a checklist for your admin. Build in order of priority.

---

## 1. **Dashboard (Overview)**
- KPIs: total users, active subscriptions, revenue (MRR), support tickets open
- Charts: sign-ups over time, plan distribution, revenue trend
- Quick links to Users, Plans, Analytics
- System health / status (API, queues, errors)

## 2. **User Management**
- List all users (table: email, plan, created, last login, status)
- Search, filter by plan/status/date
- View user detail: profile, subscription, usage (WhatsApp messages, video ads used)
- Impersonate / login as user (for support)
- Ban / suspend / activate accounts
- Export users (CSV)

## 3. **Plans & Billing**
- List plans (Beta, Premium, Enterprise) and edit name, price, limits
- View subscriptions per plan; upgrade/downgrade users
- Payment history (if you integrate Stripe/payment)
- Coupons / discount codes
- Trial management (extend, revoke)

## 4. **Content & Moderation**
- **Products:** Approve/reject or flag products added by users (if you add UGC)
- **WhatsApp:** View conversation logs (anonymized or with consent) for abuse/quality
- **Video ads:** Moderate generated ads before publish
- Reports from users (spam, abuse) with actions: dismiss, warn, suspend

## 5. **Analytics & Reports**
- Revenue reports (daily, monthly, by plan)
- Usage: WhatsApp conversations/month, video ads generated, API calls
- Funnel: sign-up → trial → paid
- Retention and churn
- Export reports (CSV/PDF)

## 6. **Settings & Configuration**
- **Global:** App name, logo, support email, terms/Privacy URLs
- **Features:** Feature flags (enable/disable Beta, WhatsApp, Video Ads by region)
- **Limits:** Default limits per plan (messages, ads, products)
- **Integrations:** API keys, webhooks, WhatsApp Business API config
- **Email / Notifications:** Templates for welcome, trial end, invoice

## 7. **Support & Communication**
- List support tickets (open, in progress, closed)
- Assign, reply, close tickets
- In-app announcements / banners for users
- Email campaigns (maintenance, new features)

## 8. **Audit & Security**
- Audit log: who did what (login, plan change, user edit)
- Admin users and roles (super admin, support, viewer)
- IP allowlist, 2FA for admin accounts
- Rate limits and blocked IPs

## 9. **Help & Docs**
- In-admin help (tooltips, “?” links to docs)
- Changelog / release notes
- Link to main app and to status page

---

**Suggested first phase:** Dashboard + User Management + Plans (read-only) + Settings (basic). Then add Analytics, Moderation, and Billing as you scale.
