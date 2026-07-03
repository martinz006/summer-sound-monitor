# Summer Sound monitor

Telegram accommodation monitor for Summer Sound dates.

## Render settings

Use a Cron Job with Dockerfile.

Schedule: every 10 minutes
Command: npm run check

Environment variables:

- TELEGRAM_BOT_TOKEN
- DEAL_CHAT_IDS=6364959649,6164517954
- ERROR_CHAT_IDS=6364959649

Do not commit real Telegram tokens to GitHub.
