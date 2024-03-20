import { sql } from "./lib/postgres";

async function setup() {
    await sql/*sql*/ `

    CREATE TABLE IF NOT EXISTS short_links (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE,
        original_url TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
    `;

    await sql.end();

    console.log("Setup feito com sucesso!");
}

setup();
