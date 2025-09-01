@echo off
echo Running Prisma migration for story notifications...
npx prisma migrate dev --name add_story_notifications
echo Migration complete!
pause