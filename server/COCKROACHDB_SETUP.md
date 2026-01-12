# CockroachDB Setup Guide

This application is configured to work with CockroachDB (CRDB) as the primary database. Since CRDB is wire-compatible with PostgreSQL, the existing `pg` driver is used.

## Configuration

1.  **Get your Connection String**:
    If you are creating a cluster (e.g., CockroachDB Serverless), copy the connection string. It usually looks like:
    `postgresql://<username>:<password>@<host>:<port>/<database>?sslmode=verify-full`

2.  **Update Environment Variables**:
    Open `server/.env` and update the `DATABASE_URL` variable:
    ```bash
    DATABASE_URL="postgresql://nandha:secure_password@free-tier.gcp-us-central1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full&options=--cluster%3Dmy-cluster-1234"
    ```

3.  **SSL Certification**:
    *   For **CockroachDB Serverless**, the global system roots are usually sufficient. The connection string `?sslmode=verify-full` ensures security.
    *   If you encounter SSL errors (e.g., `self signed certificate`), you may need to download the CA certificate and point to it, OR (for development only) allow unauthorized certificates by ensuring your connection string allows it or the config in `server/config/database.js` handles it.

## Running Migrations

Run the migrations to create the standard tables in your new CockroachDB cluster:

```bash
cd server
npm run migrate
```

## Troubleshooting

-   **Retry Errors**: CRDB uses `SERIALIZABLE` isolation by default. If you see transaction restart errors (`40001`), the application might need retry logic. The current basic implementation works for most CRUD operations but heavy concurrency might require adding a retry wrapper.
-   **ID Generation**: We use `UUID` for users which is best practice. Some tables use `SERIAL` (mapped to `unique_rowid()`-like behavior) which is supported.
