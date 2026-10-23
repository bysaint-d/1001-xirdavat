CREATE TABLE contact_messages (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',subject TEXT NOT NULL,message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),created_at TEXT NOT NULL);
CREATE INDEX contact_messages_status_time ON contact_messages(status,created_at);
ALTER TABLE suborders ADD COLUMN carrier TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE delivery_outbox ADD COLUMN lease_until TEXT;
ALTER TABLE delivery_outbox ADD COLUMN next_attempt_at TEXT;
ALTER TABLE delivery_outbox ADD COLUMN provider_id TEXT NOT NULL DEFAULT '';
INSERT INTO system_settings(key,value,updated_at) VALUES ('business','{"name":"1001 Xırdavat","phone":"+994503477306","email":"","address":"","taxId":"","legalName":"","hours":""}',CURRENT_TIMESTAMP);
