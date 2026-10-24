// Lists, and with --confirm deletes, accounts whose 30-day deletion window has
// ended. The purgeDeletedAccounts function already does this every day at
// 03:00 Manila time, so this is for checking who is due or running it by hand.
// The delete logic itself lives in functions/purgeAccounts.js, shared by both.
//
//   npm run accounts:purge               list who is due, delete nothing
//   npm run accounts:purge -- --confirm  actually delete them

const { DELETION_WINDOW_DAYS, MAX_PER_RUN, dueAccounts, purgeAccount } = require('../functions/purgeAccounts');
const { connectAsAdmin } = require('./adminApp');

async function main() {
  const confirmed = process.argv.includes('--confirm');
  const admin = connectAsAdmin();
  const due = await dueAccounts(admin.db);

  if (!due.length) {
    console.log('No accounts are past their deletion window.');
    return;
  }

  console.log(`${due.length} account(s) past the ${DELETION_WINDOW_DAYS}-day window:`);
  if (due.length === MAX_PER_RUN) console.log(`(at most ${MAX_PER_RUN} per run; run again for the rest)`);
  for (const profile of due) {
    const { email, deletionRequestedAt } = profile.data();
    const requested = deletionRequestedAt.toDate().toISOString().slice(0, 10);
    console.log(`  ${profile.id}  ${email ?? '(no email)'}  requested ${requested}`);
  }

  if (!confirmed) {
    console.log('\nDry run, nothing deleted. Re-run with --confirm to delete these accounts.');
    return;
  }

  let failed = 0;
  for (const profile of due) {
    try {
      const counts = await purgeAccount(admin, profile.id);
      console.log(`Deleted ${profile.id} (${counts.attempts} quiz attempts, ${counts.chats} tutor chats).`);
    } catch (err) {
      // Carry on with the others. This one keeps its marker and is retried
      // on the next run.
      failed++;
      console.error(`Could not delete ${profile.id}:`, err.message);
    }
  }

  console.log(`Done. Deleted ${due.length - failed} of ${due.length}.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
