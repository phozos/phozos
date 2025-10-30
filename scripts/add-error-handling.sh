#!/bin/bash

# Add error handling import to repositories
FILES=(
  "server/repositories/university.repository.ts"
  "server/repositories/application.repository.ts" 
  "server/repositories/document.repository.ts"
  "server/repositories/event.repository.ts"
  "server/repositories/notification.repository.ts"
  "server/repositories/forum.repository.ts"
  "server/repositories/chat.repository.ts"
  "server/repositories/ai-matching.repository.ts"
  "server/repositories/payment.repository.ts"
  "server/repositories/subscription.repository.ts"
  "server/repositories/security-settings.repository.ts"
  "server/repositories/testimonial.repository.ts"
  "server/repositories/student-timeline.repository.ts"
  "server/repositories/forum-reports.repository.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ] && ! grep -q "handleDatabaseError" "$file"; then
    # Add import if not already present
    sed -i "/import.*from 'drizzle-orm';/a import { handleDatabaseError } from './errors';" "$file"
    echo "Added error import to: $file"
  fi
done

echo "Error handling imports added to all repositories"
