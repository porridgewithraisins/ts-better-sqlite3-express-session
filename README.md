# ts-better-sqlite3-express-session

As the elongated name suggests, this is a `typescript`, `better-sqlite3` session store compatible with `express-session`.

There already exists https://npmjs.com/package/better-sqlite3-session-store, and credits must go to them, but this package is better in two ways.

-   It prepares all the required statements once, instead of preparing them every time they are used, which is the case with the original package.
-   Typescript support

## Installation

```bash
npm install ts-better-sqlite3-express-session
```

## Options

-   `connection` - A Better Sqlite3 Database instance.
-   `tableName` - The name of the table to use. Defaults to `sessions`.
-   `ttl` - The time to live of the session _in the store_ in milliseconds. Note that this is different from `express-session`'s `cookie.maxAge` option, which determines the time to live of the cookie _in the browser_.

## Usage

```typescript
// With typescript
import BetterSqlite3StoreFactory from "ts-better-sqlite3-express-session";

// With ESM JavaScript
import BetterSqlite3StoreFactory_ from "ts-better-sqlite3-express-session";
const BetterSqlite3StoreFactory = BetterSqlite3StoreFactory_.default;

// With CommonJS
const BetterSqlite3StoreFactory = require("ts-better-sqlite3-express-session").default;

// usage
const BetterSqlite3Store = BetterSqlite3StoreFactory(session);

const store = new BetterSqlite3Store({
    connection: db // a better-sqlite3 database instance,
    tableName: "my-sessions", // optional, default: "sessions"
    ttl: 1000 * 60 * 60 * 24, // one day
});

// you can now pass this to express-session's `store` option
```
