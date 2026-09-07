# Local SQLite backup and restore

Family Wealth stores saved goals (IDs, names, amounts, target dates, and expected
returns) in `.data/family-wealth.sqlite`. `src/server/index.ts` resolves this path
from the backend's working directory. Run the commands below from the repository
root with Node **22.23.1**. Projections are calculated from saved goals and are not
stored in the database.

This database is private local runtime data. **Never commit it or its backups to
this public repository.** `.gitignore` excludes `.data/`, including SQLite
sidecar files; it does not protect backups copied elsewhere inside the repository.
Choose a private backup directory outside this and any other Git repository.
Do not attach database files or real goal data to issues, PRs, or verification reports.

## Stop before every copy or replacement

Stop the backend with **Ctrl+C** in its terminal and wait for the process to exit.
Stop any other backend instances or database tools using this database too. The
backend handles SIGINT/SIGTERM by closing the server and SQLite connection. Do not
use a forced kill as the normal shutdown procedure. The frontend alone does not
hold the database open.

Copying a database while it is being written can produce an inconsistent backup.
This procedure supports only a fully stopped database; it is not an online backup
or a WAL backup procedure. After stopping, check:

```bash
ls -la .data/family-wealth.sqlite*
```

The database must exist. If `family-wealth.sqlite-wal`, `-shm`, or `-journal` files
remain, **stop here**. Do not delete them or copy/replace only the main file. They
may be needed for recovery. Check for remaining processes and resolve an unclean
shutdown before using this procedure.

## Back up

1. Stop the backend and perform the checks above.
2. In a Bash terminal at the repository root, choose an existing or new private
   directory outside Git. Enter its absolute path when prompted. These commands
   create a unique backup directory, preserve the runtime original, and check the
   copy byte for byte. Keep using this terminal for the variables below.

   ```bash
   umask 077
   read -r -p 'Private backup directory outside Git (absolute path): ' backup_root
   mkdir -p -- "$backup_root" &&
     backup_dir=$(mktemp -d -- "$backup_root/family-wealth-backup.XXXXXX") &&
     cp -- .data/family-wealth.sqlite "$backup_dir/family-wealth.sqlite" &&
     cmp -- .data/family-wealth.sqlite "$backup_dir/family-wealth.sqlite"
   ```

   Continue only if every command succeeds. `cmp` prints nothing on success.
   Record the generated `$backup_dir` privately so you can select it for restore.
   Do not reuse or overwrite an earlier backup. Restrict access to the backup
   location; these copies contain the same private data as the runtime database.
3. Restart the backend from the repository root:

   ```bash
   npm run dev:server
   ```

4. Follow the verification steps below. Retain the backup separately from the
   runtime original. A copy on the same disk does not protect against disk loss;
   this procedure provides no automatic or off-device backup.

## Restore

Restoring replaces all current goals with the selected snapshot. Changes made
since that backup will no longer appear. Keep the current state in a safety copy
before replacing it.

1. Stop the backend completely and check for sidecars as described above.
2. In a Bash terminal at the repository root, select the backup file and a private
   safety-copy directory outside Git. The following chain requires a nonempty
   backup and an existing current database, then copies and verifies the current database
   **before** replacing it. Each attempt gets a new safety directory.

   ```bash
   umask 077
   read -r -p 'Backup SQLite file to restore (absolute path): ' restore_source
   read -r -p 'Private safety-copy directory outside Git (absolute path): ' safety_root
   test -s "$restore_source" &&
     test -f .data/family-wealth.sqlite &&
     mkdir -p -- "$safety_root" &&
     safety_dir=$(mktemp -d -- "$safety_root/family-wealth-before-restore.XXXXXX") &&
     cp -- .data/family-wealth.sqlite "$safety_dir/family-wealth.sqlite" &&
     cmp -- .data/family-wealth.sqlite "$safety_dir/family-wealth.sqlite" &&
     cp -- "$restore_source" .data/family-wealth.sqlite &&
     cmp -- "$restore_source" .data/family-wealth.sqlite
   ```

   Continue only if every command succeeds. Retain both the chosen backup and
   `$safety_dir/family-wealth.sqlite`; record their locations privately.
3. Start the backend with `npm run dev:server` and verify below.

## Verify after backup or restore

With the backend running, in another terminal:

```bash
curl --fail --silent --show-error http://127.0.0.1:3000/health
curl --fail --silent --show-error http://127.0.0.1:3000/api/goals
npm run dev:web
```

If you configured a different backend port, use that port for the curl checks.
Open the frontend URL printed by Vite. Reload the page and confirm the expected
goals, amounts, dates, and returns. After restore, these must match the backup
snapshot. Check each goal's projection and the combined monthly saving; they are
recalculated using today's date, so numbers can differ from the day of backup.
Keep API output private.

## Failure and recovery

If a copy or comparison fails, keep the backend stopped and preserve all files.
Check paths, available disk space, and permissions before retrying. Never remove
the runtime database to fix a failed restore: starting without it creates a new
database with demo seed goals, which is not recovery of your saved data.

If the restored application fails or the snapshot is wrong, stop the backend
again and check for sidecars. Repeat the restore procedure with the preserved
pre-restore safety copy as `restore_source`. This also preserves the failed state
in a new safety directory before replacing it. Verify through the API and browser
again. If sidecars remain or no usable copy exists, preserve the files and
investigate before attempting further replacements.
