import postgres from 'postgres'

export const sql = postgres('postgresql://postgres:postgres@localhost:5432/short_links')