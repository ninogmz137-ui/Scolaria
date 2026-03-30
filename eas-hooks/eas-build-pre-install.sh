#!/bin/bash
# EAS Build pre-install hook
# Writes .env file from OS environment variables on the EAS build server.
# This guarantees Metro/babel-preset-expo can inline EXPO_PUBLIC_ vars
# even though .env is in .gitignore and not uploaded with the project.

set -euo pipefail

echo "[eas-hook] Writing .env from OS environment variables..."

ENV_FILE=".env"

# Clear any existing .env
> "$ENV_FILE"

# Write each EXPO_PUBLIC_ var from OS env to .env
for var in EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY EXPO_PUBLIC_ANTHROPIC_API_KEY EXPO_PUBLIC_GOOGLE_VISION_KEY; do
  value="${!var:-}"
  if [ -n "$value" ]; then
    echo "${var}=${value}" >> "$ENV_FILE"
    echo "[eas-hook] ✓ ${var} written (${#value} chars)"
  else
    echo "[eas-hook] ✗ ${var} is NOT SET in environment"
  fi
done

echo "[eas-hook] .env file created with $(wc -l < "$ENV_FILE") lines"
cat "$ENV_FILE" | sed 's/=.*/=***/' # Log keys without values
