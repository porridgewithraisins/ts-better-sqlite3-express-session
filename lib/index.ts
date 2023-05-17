import type { Database, RunResult, SqliteError, Statement } from "better-sqlite3";
import type { SessionData, Store } from "express-session";

export default (session: ExpressSessionModule): Ret =>
    class BetterSqlite3SessionStore extends session.Store {
        private readonly conn: BetterSqlite3SessionStoreOptions["connection"];

        private readonly ttl: BetterSqlite3SessionStoreOptions["ttl"];

        private readonly tableName: BetterSqlite3SessionStoreOptions["tableName"];

        private readonly statements: Record<Implemented, Statement>;

        /* The only public API */
        public constructor(options: BetterSqlite3SessionStoreOptions) {
            super();

            this.conn = options.connection;
            this.ttl = options.ttl;
            this.tableName = options.tableName || "sessions";

            this.#validateOptions();

            this.#createTable();

            // prepare the statements ahead of time thereby letting the database
            // optimize query planning, among other things
            this.statements = this.#prepareStatements();

            // start a `setInterval()` to delete expired sessions
            this.#startExpirationInterval();
        }

        /* The express-session contract */
        public set(
            sid: string,
            session: SessionData,
            callback: Callback<Nullable<RunResult>> = () => {}
        ) {
            const age = session.cookie?.maxAge || 0;
            const expires = Date.now() + age;
            const data = JSON.stringify(session);

            try {
                const result = this.statements.set.run(sid, expires, data);

                return callback(null, result);
            } catch (err) {
                return callback(err as SqliteError, null);
            }
        }

        public get(sid: string, callback: Callback<Nullable<SessionData>> = () => {}) {
            try {
                const jsonString = this.statements.get.get(sid)?.data || "{}";
                const result = JSON.parse(jsonString);
                return callback(null, result);
            } catch (e) {
                return callback(e as SqliteError, null);
            }
        }

        public destroy(sid: string, callback: Callback<Nullable<RunResult>> = () => {}) {
            try {
                const result = this.statements.destroy.run(sid);
                return callback(null, result);
            } catch (e) {
                return callback(e as SqliteError, null);
            }
        }

        public length(callback: Callback<number>) {
            try {
                const result = this.statements.length.get();
                return callback(null, result?.count);
            } catch (e) {
                return callback(e as SqliteError, Infinity);
            }
        }

        public clear(callback: Callback<Nullable<RunResult>> = () => {}) {
            try {
                const result = this.statements.clear.run();
                return callback(null, result);
            } catch (e) {
                return callback(e as SqliteError, null);
            }
        }

        public touch(
            sid: string,
            session: SessionData,
            callback: Callback<Nullable<RunResult>> = () => {}
        ) {
            const age = session.cookie?.maxAge || 0;
            const expires = Date.now() + age;

            try {
                const result = this.statements.touch.run(expires, sid);
                return callback(null, result);
            } catch (e) {
                return callback(e as SqliteError, null);
            }
        }

        public all(callback: Callback<SessionData[]>) {
            try {
                const result = this.statements.all.all().map(row => JSON.parse(row.data));
                return callback(null, result);
            } catch (e) {
                return callback(e as SqliteError, []);
            }
        }

        /* Internals */
        #validateOptions() {
            if (!this.conn) {
                throw new Error(
                    "No connection provided. Please provide a better-sqlite3 database connection"
                );
            }
            if (!this.ttl) {
                throw new Error(
                    "No TTL provided. This is the time after which the session will be deleted"
                );
            }
        }

        #prepareStatements() {
            return {
                expiry: this.conn.prepare(`DELETE FROM ${this.tableName} WHERE expires < ?`),
                set: this.conn.prepare(`INSERT OR REPLACE INTO ${this.tableName} VALUES (?, ?, ?)`),
                get: this.conn.prepare(
                    `SELECT data FROM ${this.tableName} WHERE sid = ? AND datetime('now') < expires`
                ),
                destroy: this.conn.prepare(`DELETE FROM ${this.tableName} WHERE sid = ?`),
                length: this.conn.prepare(`SELECT COUNT(*) AS length FROM ${this.tableName}`),
                clear: this.conn.prepare(`DELETE FROM ${this.tableName}`),
                touch: this.conn.prepare(`UPDATE ${this.tableName} SET expires = ? WHERE sid = ?`),
                all: this.conn.prepare(`SELECT data FROM ${this.tableName}`),
            };
        }

        #createTable() {
            this.conn.exec(
                `CREATE TABLE
                IF NOT EXISTS
                    ${this.tableName} (
                        sid TEXT PRIMARY KEY,
                        expires TIMESTAMP NOT NULL,
                        data JSON NOT NULL
                    );`
            );
        }

        #startExpirationInterval() {
            setInterval(() => {
                this.statements.expiry.run(Date.now());
            }, this.ttl);
        }
    };

type Nullable<T> = T | null;

type Callback<T> = (err: Nullable<SqliteError>, res: T) => void;

type Implemented = "expiry" | "set" | "get" | "destroy" | "length" | "clear" | "touch" | "all";

interface BetterSqlite3SessionStoreOptions {
    connection: Database;
    ttl: number;
    tableName?: string;
}

type ExpressSessionModule = typeof import("express-session");
type Ret = new (opts: BetterSqlite3SessionStoreOptions) => Store;
