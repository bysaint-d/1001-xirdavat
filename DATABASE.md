# Database migration and recovery

The canonical schema is the ordered `drizzle/*.sql` stream. It now includes marketplace data, account identities, sessions, permissions, files, reviews, questions, notifications and the email outbox. `schema_migrations` records applied version checksums; already-applied files must never be edited.

## Local database

```sh
node scripts/database.mjs migrate .sites-runtime/local.sqlite
node scripts/database.mjs verify .sites-runtime/local.sqlite
```

The backup and restore commands accept a JSON object containing `passphrase` on **stdin**, never a command-line argument. Use at least 16 characters. Do not commit backups or credentials.

```text
node scripts/database.mjs backup SOURCE_SQLITE_PATH BACKUP_FILE
node scripts/database.mjs restore EMPTY_TARGET_SQLITE_PATH BACKUP_FILE
```

The encrypted portable JSON archive uses AES-256-GCM and PBKDF2-SHA256. Every table includes column names, row count and SHA-256 checksum. BLOB values are explicitly base64 encoded. Password hashes, uploaded files, permissions, stock, IDs and order history are transferred together. Source triggers are suspended during restore and recreated afterwards, so historical orders do not reserve stock twice. Restore validates schema versions and foreign keys and rolls back on failure.

## Cloudflare D1

Copy `pages/wrangler.example.json` to the ignored `pages/wrangler.json` and configure the target account's D1 binding. Authenticate using Wrangler. The following wrappers keep private database output out of terminal logs:

```text
node scripts/cloudflare-db.mjs migrate pages/wrangler.json
node scripts/cloudflare-db.mjs backup pages/wrangler.json PRIVATE_BACKUP_FILE
node scripts/cloudflare-db.mjs restore-empty TARGET_CONFIG_FILE PRIVATE_BACKUP_FILE
```

Backup and restore read the same stdin passphrase JSON as the local commands. Restore refuses to overwrite a database containing application tables. Always restore into a new empty D1 database, validate it, then change the Pages `DB` binding. Keep the original database as a rollback target until the new one is verified. Pause writes during the final export/cutover to avoid losing purchases made between snapshot and switching. Copy the runtime `AUTH_PEPPER` secret too: password hashes depend on it. Never place that secret in the portable archive or source repository.

Cloudflare D1 also provides automatic Time Travel recovery; retention depends on the account plan. Verify current retention and a bookmark before a production migration. A separate encrypted export remains useful for moving accounts/providers.

## Portability boundaries

Full transfer between D1 instances and local SQLite is implemented and tested. The typed portable JSON format can be consumed by another database engine, but PostgreSQL/MySQL require their own SQL driver/schema and trigger equivalents before runtime switching; this repository does not claim that changing a connection string alone converts SQLite SQL into another dialect. Files live in `file_chunks` and are included; changing file storage separately also requires a storage adapter.

## Operations

- Keep backup passphrases and runtime secrets in your password manager or OS-protected storage, separately from the archive.
- Configure an external scheduler to run encrypted exports to private storage. A script present in this repository is not itself a running backup schedule.
- Test recovery after schema changes. `npm test` includes encrypted backup/restore and integrity tests.
- Use a separate D1 binding for staging. Never point a public test deployment at the production database.
