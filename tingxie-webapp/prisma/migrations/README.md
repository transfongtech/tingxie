# Migration adoption

`20260830000000_baseline` represents the schema that was previously created with
`prisma db push`. New/empty databases can run `prisma migrate deploy` directly.

For an existing db-push database, back it up and inspect it before changing
migration history. If it has the pre-versioning schema (including the unique
`EssayFeedback.submissionId` index), adopt the baseline, then deploy:

```sh
npx prisma migrate resolve --applied 20260830000000_baseline
npx prisma migrate deploy
```

If the database was already db-pushed to the final schema, verify that
`reviewResultJson`, `reviewLeaseId`, `reviewLeaseExpiresAt`, and both versioning indexes exist,
then resolve **both** migrations as applied instead of deploying them:

```sh
npx prisma migrate resolve --applied 20260830000000_baseline
npx prisma migrate resolve --applied 20260830120000_versioned_essay_feedback
```

Do not use `migrate reset` on an existing database. `migrate resolve` records
history only; it does not apply schema SQL.
