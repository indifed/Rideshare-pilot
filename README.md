
# Rideshare Pilot v1

Minimal backend prototype demonstrating:
- ride session lifecycle
- engagement submission
- deterministic reward issuance
- offer catalog
- reward redemption
- basic metrics

Stack:
Node.js + Express
Prisma + PostgreSQL

## Run

cp .env.example .env
npm install
npx prisma migrate dev
npm run seed
npm run dev
