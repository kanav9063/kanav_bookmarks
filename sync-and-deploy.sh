#!/bin/bash
# Siftly nightly sync: fetch new X bookmarks, run AI pipeline, redeploy to Vercel
set -e

cd /home/ubuntu/Siftly
export PATH="/home/ubuntu/.npm-global/bin:/home/ubuntu/.local/bin:$PATH"

echo "=== Siftly Nightly Sync ==="
echo "Started: $(date)"

# 1. Count existing bookmarks
BEFORE=$(curl -s http://localhost:3001/api/stats | python3 -c "import json,sys; print(json.load(sys.stdin)['totalBookmarks'])")
echo "Bookmarks before: $BEFORE"

# 2. Fetch new bookmarks from X API
echo "Fetching new bookmarks from X..."
node fetch-bookmarks.js 2>&1 | tail -5

# 3. Import (deduplication is built in)
echo "Importing..."
IMPORT_RESULT=$(curl -s -X POST http://localhost:3001/api/import -F "file=@bookmarks-export.json")
NEW_COUNT=$(echo "$IMPORT_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('count',0))")
SKIPPED=$(echo "$IMPORT_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('skipped',0))")
echo "Imported: $NEW_COUNT new, $SKIPPED duplicates skipped"

# 4. Run AI pipeline on new bookmarks only (if any new ones)
if [ "$NEW_COUNT" -gt 0 ]; then
  echo "Running AI categorization pipeline..."
  curl -s -X POST http://localhost:3001/api/categorize -H 'Content-Type: application/json' -d '{}' > /dev/null
  
  # Wait for pipeline to finish (poll every 15s, max 10 min)
  for i in $(seq 1 40); do
    sleep 15
    STATUS=$(curl -s http://localhost:3001/api/categorize | python3 -c "import json,sys; print(json.load(sys.stdin)['status'])")
    if [ "$STATUS" = "idle" ]; then
      echo "Pipeline complete."
      break
    fi
    echo "  Pipeline running... ($i)"
  done
fi

# 5. Get updated stats
AFTER=$(curl -s http://localhost:3001/api/stats | python3 -c "import json,sys; print(json.load(sys.stdin)['totalBookmarks'])")
CATS=$(curl -s http://localhost:3001/api/stats | python3 -c "
import json,sys
d=json.load(sys.stdin)
cats = d.get('topCategories',[])
for c in cats[:5]:
    print(f\"  {c['name']}: {c['count']}\")
")

echo "Bookmarks after: $AFTER"

# 6. Copy fresh DB and redeploy to Vercel
if [ "$NEW_COUNT" -gt 0 ]; then
  echo "Updating seed.db and redeploying to Vercel..."
  cp prisma/dev.db prisma/seed.db
  export VERCEL_TOKEN="KjYqQOAj538m59jQ2jR55pfW"
  DEPLOY_URL=$(vercel --prod --yes --token "$VERCEL_TOKEN" 2>&1 | grep "https://siftly" | tail -1 | tr -d ' ')
  echo "Deployed: $DEPLOY_URL"
else
  echo "No new bookmarks — skipping redeploy."
fi

# 7. Output summary for the cron delivery
ACTUALLY_NEW=$((AFTER - BEFORE))
echo ""
echo "--- SUMMARY ---"
if [ "$ACTUALLY_NEW" -gt 0 ]; then
  echo "📚 Siftly nightly sync: +${ACTUALLY_NEW} new bookmarks (${AFTER} total)"
  echo ""
  echo "Top categories:"
  echo "$CATS"
  echo ""
  echo "🔗 https://siftly-two.vercel.app"
else
  echo "📚 Siftly sync: no new bookmarks today. Still at ${AFTER} total."
  echo "🔗 https://siftly-two.vercel.app"
fi
echo ""
echo "Finished: $(date)"
