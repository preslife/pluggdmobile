# Developer Tools — Webhook Configuration

Use the developer dashboard to manage webhook endpoints that receive real-time events from Pluggd. The new management panel lives under **Dashboard → Developer → Webhooks**.

## Create a webhook

1. Open the **Create webhook** form and provide a descriptive **Display name** (for example `Zapier Purchases`).
2. Enter the fully qualified **Endpoint URL** that will receive POST requests from Pluggd.
3. (Optional) Supply your own **Signing secret** or select the refresh icon to auto-generate a secure value. The secret is used to sign each payload with HMAC-SHA256, so store it safely.
4. Check the events you want delivered to this endpoint. Available events include:
   - `purchase.created`
   - `subscription.updated`
   - `comment.created`
   - `follower.created`
5. Submit the form. Copy the success toast message to capture the secret if you generated one—this is the only time the full secret is revealed.

## Manage existing webhooks

- Use the **Refresh** button to fetch the latest webhooks from Supabase via the `developer_list_webhooks` RPC.
- Each row displays the target URL, subscribed events, creation time, most recent delivery, and status.
- Select the eye icon to reveal a stored secret when Supabase returns it, or the copy icon to place the secret on your clipboard.
- Delete an endpoint with the trash icon, which calls the `developer_delete_webhook` RPC.

## Troubleshooting tips

- If a webhook stops receiving events, verify that your endpoint responds with `2xx` status codes and refresh the table to view the latest delivery timestamp.
- Regenerate the signing secret in the form and update your server if you suspect the value has been exposed, then create a replacement webhook if needed.
- Refer to the [Webhook documentation](/docs/webhooks) for payload schemas, verification helpers, and automation examples.
