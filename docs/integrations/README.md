# Integrations Setup Guide

This guide covers the refreshed Mailchimp and Discord panels in the **Enhanced Connections** module. Use these steps to connect providers, review sync status, and troubleshoot issues surfaced by the UI.

## Mailchimp Audience Sync

1. **Start OAuth** – Click **Connect Mailchimp** to launch the official Mailchimp consent screen. Authorise Pluggd so we can read your audiences and push subscribers.
2. **Select an audience** – Once connected, the dropdown loads audiences from your Mailchimp account. Member counts and the time since the last export appear beneath each entry. Pick the list you want to receive Pluggd subscribers.
3. **Toggle auto-sync (optional)** – Enable the auto-sync switch to run the nightly `mailchimp-sync-cron` task. The card shows the last run status, processed totals, and error counts returned by the sync.
4. **Manual export** – Use **Export Audience** to invoke `mailchimp-export-audience` instantly. The summary tiles update with processed, total, and error counts so you can verify the payload that reached Mailchimp.
5. **Resolve failures** – If an export fails, an inline error banner displays the exact message from Supabase. Fix the issue (missing list selection, invalid token, etc.) and retry.

## Discord Role Sync

1. **Authorize the bot** – Click **Add Bot to Server** to open the Discord OAuth flow. Choose your server and confirm permissions.
2. **Set the guild & roles** – Enter the Guild ID and map each active membership tier to a Discord Role ID. Tier pricing is read from `membership_tiers`, so confirm your tiers are configured first.
3. **Save configuration** – Use **Save Discord Settings** to persist the guild and role mapping on your profile.
4. **Manual role management** – The manual sync controls call `discord-sync-subscriber`. Provide a fan’s Pluggd user ID, then run **Sync Roles**, **Grant Roles**, or **Revoke Roles**. Results list each action, the target role, and any error returned by Discord so you can troubleshoot permission problems without guessing.

## Troubleshooting Tips

- **OAuth fails immediately** – Ensure the environment variables for each provider are set (`VITE_MAILCHIMP_CLIENT_ID`, `VITE_DISCORD_CLIENT_ID`). The connect buttons now deep-link to the production OAuth flows.
- **Audience list is empty** – Confirm the Mailchimp connection is still valid and that the service role can reach `mailchimp_audience_snapshots`. Run a manual export to refresh the cache.
- **Discord role errors** – Check that the bot’s role sits above the roles you are trying to manage and that the target user is a member of the guild. The manual sync output will show the Discord API status when something fails.

See `/docs/webhooks` for information about automated triggers that run after Stripe subscription events.

## TikTok Catalog Connector

1. **Check status** – Open **Catalog → TikTok Connector** to load the live status banner. The badge mirrors the result of the
   `tiktok-connector` edge function and immediately surfaces credential errors.
2. **OAuth linking** – Select **Use TikTok OAuth** to redirect to TikTok for Business. The callback stores the access and
   refresh tokens in `social_connections`, and the UI confirms the account handle plus the validation timestamp.
3. **Manual API key linking** – Choose **Use API key** to reveal the manual entry form. Provide the display name, Business
   Account ID, and generated API key. The edge function enforces the optional
   `TIKTOK_CONNECTOR_VALIDATION_PREFIX` and can mark sandbox keys with `TIKTOK_TEST_ACCESS_TOKEN` so the UI labels them.
4. **Disconnecting** – Use **Disconnect** to revoke the stored credentials. The banner switches back to the "not linked"
   message, and the Supabase record is removed.

> **Environment variables:** set `VITE_TIKTOK_CLIENT_KEY` for the client-side OAuth prompt. On the Supabase project, configure
> `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, and optional validation variables to enable the edge function.
