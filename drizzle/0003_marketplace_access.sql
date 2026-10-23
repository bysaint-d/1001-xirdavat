-- Identity tables are included here so a single migration stream creates the full database.
CREATE TABLE IF NOT EXISTS auth_identities (user_id TEXT PRIMARY KEY REFERENCES users(id),email TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,digest TEXT NOT NULL,iterations INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS auth_sessions (hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS auth_invites (hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,email TEXT NOT NULL,name TEXT NOT NULL,expires INTEGER NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY,hits INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS file_chunks (object_key TEXT NOT NULL,chunk INTEGER NOT NULL,owner TEXT NOT NULL,data BLOB NOT NULL,PRIMARY KEY(object_key,chunk));
--> statement-breakpoint
ALTER TABLE users ADD COLUMN account_type TEXT NOT NULL DEFAULT 'buyer' CHECK(account_type IN ('buyer','seller','staff'));
ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
UPDATE users SET account_type='seller' WHERE id IN (SELECT owner FROM stores);
UPDATE users SET account_type='staff',email_verified=1 WHERE role='admin';
--> statement-breakpoint
ALTER TABLE auth_sessions ADD COLUMN audience TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE auth_invites ADD COLUMN account_type TEXT NOT NULL DEFAULT 'buyer';
ALTER TABLE auth_invites ADD COLUMN purpose TEXT NOT NULL DEFAULT 'invite';
--> statement-breakpoint
CREATE TABLE store_permissions (user_id TEXT NOT NULL REFERENCES users(id),store_id TEXT NOT NULL REFERENCES stores(id),capability TEXT NOT NULL CHECK(capability IN ('catalog','orders','store','moderate')),granted_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,PRIMARY KEY(user_id,store_id,capability));
CREATE TABLE addresses (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),label TEXT NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL,city TEXT NOT NULL,address TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE account_tokens (hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')),expires INTEGER NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE notifications (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,body TEXT NOT NULL,link TEXT NOT NULL DEFAULT '/',read_at TEXT,created_at TEXT NOT NULL);
CREATE TABLE delivery_outbox (id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),channel TEXT NOT NULL DEFAULT 'email',recipient TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,sent_at TEXT);
CREATE TABLE product_reviews (id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),user_id TEXT NOT NULL REFERENCES users(id),rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'published',created_at TEXT NOT NULL,UNIQUE(product_id,user_id));
CREATE TABLE product_questions (id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),user_id TEXT NOT NULL REFERENCES users(id),question TEXT NOT NULL,answer TEXT NOT NULL DEFAULT '',answered_by TEXT REFERENCES users(id),status TEXT NOT NULL DEFAULT 'published',created_at TEXT NOT NULL);
CREATE TABLE reports (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),store_id TEXT REFERENCES stores(id),product_id TEXT REFERENCES products(id),reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',resolution TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL);
CREATE TABLE system_settings (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE UNIQUE INDEX users_email_nocase ON users(lower(email));
CREATE INDEX notifications_user_time ON notifications(user_id,created_at);
CREATE INDEX outbox_status_time ON delivery_outbox(status,created_at);
CREATE INDEX permissions_store_user ON store_permissions(store_id,user_id);
CREATE INDEX reviews_product ON product_reviews(product_id,status);
CREATE INDEX questions_product ON product_questions(product_id,status);
CREATE INDEX addresses_user ON addresses(user_id);
--> statement-breakpoint
INSERT INTO system_settings(key,value,updated_at) VALUES ('catalog_mode','{"demo":true}',CURRENT_TIMESTAMP);
