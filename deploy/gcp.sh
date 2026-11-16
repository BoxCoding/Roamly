#!/usr/bin/env bash
# Build and deploy Roamly to Cloud Run (Next.js standalone + Cloud SQL Postgres).
# First-time setup (project, Cloud SQL, secrets, IAM) is described in README.md.
set -euo pipefail
PROJECT="${PROJECT:-roamly-f22530}"
REGION="${REGION:-asia-south1}"
INSTANCE="$PROJECT:$REGION:roamly-db"
TAG="${TAG:-$(date +%Y%m%d-%H%M%S)}"
IMAGE="$REGION-docker.pkg.dev/$PROJECT/roamly/web:$TAG"

# Optional social logins: add the secrets (see INTEGRATIONS.md) and they are wired in automatically.
SECRETS="DATABASE_URL=DATABASE_URL:latest,SESSION_SECRET=SESSION_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest"
for s in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET META_APP_ID META_APP_SECRET; do
  gcloud secrets describe "$s" --project "$PROJECT" >/dev/null 2>&1 && SECRETS="$SECRETS,$s=$s:latest"
done

cd "$(dirname "$0")/.."
gcloud builds submit --project "$PROJECT" --region "$REGION" --tag "$IMAGE" .
gcloud run deploy roamly --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
  --allow-unauthenticated --port 8080 --memory 512Mi --min-instances 0 --max-instances 3 \
  --add-cloudsql-instances "$INSTANCE" \
  --set-secrets "$SECRETS" \
  --update-env-vars "GEMINI_MODEL=gemini-3.1-flash-lite${ADMIN_EMAILS:+,ADMIN_EMAILS=$ADMIN_EMAILS}"
gcloud run services describe roamly --project "$PROJECT" --region "$REGION" --format 'value(status.url)'
