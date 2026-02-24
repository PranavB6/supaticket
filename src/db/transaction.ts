import type postgres from "postgres";

export async function transaction<T>(sql: postgres.Sql, fn: (trx: postgres.Sql) => Promise<T>) {
    return sql.begin(async (trx: any) => fn(trx as postgres.Sql));
}