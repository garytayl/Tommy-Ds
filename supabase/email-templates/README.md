# Auth email templates (Supabase)

Templates here are **copy-paste bodies** for the hosted dashboard:

**Supabase Dashboard** → **Authentication** → **Email Templates**

## Invite user

| Field | Value |
| --- | --- |
| **Subject** | `You're invited to Tommy D's` |
| **Body** | Contents of `invite-user.html` between the `PASTE START` / `PASTE END` markers |

Variables used: `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`, `{{ .Email }}` — see [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates).

For local Supabase, see [Customizing email templates](https://supabase.com/docs/guides/local-development/customizing-email-templates).
