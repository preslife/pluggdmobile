import { newDb, IMemoryDb } from 'pg-mem';
import type { IDatabase, IMain } from 'pg-promise';
import { randomUUID } from 'node:crypto';

interface TableFilter {
  column: string;
  value: any;
}

class SupabaseTableBuilder<T extends Record<string, any>> {
  private selectColumns = '*';
  private filters: TableFilter[] = [];
  private orderByClause: string | null = null;

  constructor(
    private readonly table: string,
    private readonly pg: IDatabase<any>,
    private readonly pgp: IMain,
  ) {}

  select(columns = '*') {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    const direction = options.ascending === false ? 'DESC' : 'ASC';
    this.orderByClause = `${column} ${direction}`;
    return this;
  }

  async maybeSingle() {
    const rows = await this.runSelect(1);
    return { data: rows[0] ?? null, error: null };
  }

  async single() {
    const rows = await this.runSelect(1);
    if (!rows[0]) {
      return { data: null, error: new Error('No rows found') };
    }
    return { data: rows[0], error: null };
  }

  async insert(payload: T | T[]) {
    const rows = Array.isArray(payload) ? payload : [payload];
    if (rows.length === 0) {
      return { data: [], error: null };
    }

    const normalizedRows = rows.map((row) => {
      const copy: Record<string, any> = { ...row };
      copy.id = copy.id ?? randomUUID();
      copy.created_at = copy.created_at ?? new Date();
      copy.meta = copy.meta ?? {};
      if (copy.counterparty_user_id === undefined) {
        copy.counterparty_user_id = null;
      }
      if (copy.ref_type === undefined) {
        copy.ref_type = null;
      }
      if (copy.ref_id === undefined) {
        copy.ref_id = null;
      }
      if (copy.reversal_of_entry_id === undefined) {
        copy.reversal_of_entry_id = null;
      }
      return copy;
    });

    const [schema, tableName] = this.parseTable();

    if (schema === 'public' && tableName === 'wallet_ledger') {
      for (const row of normalizedRows) {
        const { user_id, amount_credits } = row;
        if (!user_id) {
          continue;
        }

        let allowNegative = false;

        if (row.reversal_of_entry_id) {
          const original = await this.pg.oneOrNone(
            'SELECT user_id FROM public.wallet_ledger WHERE id = $1',
            [row.reversal_of_entry_id],
          );

          if (!original) {
            return {
              data: null,
              error: { message: `Original ledger entry ${row.reversal_of_entry_id} not found` },
            };
          }

          if (original.user_id !== user_id) {
            return {
              data: null,
              error: {
                message: `Reversal user mismatch for ledger entry ${row.reversal_of_entry_id}`,
              },
            };
          }

          const existingReversal = await this.pg.oneOrNone(
            'SELECT id FROM public.wallet_ledger WHERE reversal_of_entry_id = $1',
            [row.reversal_of_entry_id],
          );

          if (existingReversal) {
            return {
              data: null,
              error: { message: `Ledger entry ${row.reversal_of_entry_id} already reversed` },
            };
          }

          allowNegative = true;
        }

        const { balance_after: latestBalance } =
          (await this.pg.oneOrNone(
            `SELECT balance_after FROM public.wallet_ledger WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
            [user_id],
          )) ?? { balance_after: 0 };

        const previousBalance = Number(latestBalance ?? 0);
        const delta = Number(amount_credits ?? 0);
        const nextBalance = previousBalance + delta;

        if (nextBalance < 0 && !allowNegative) {
          return {
            data: null,
            error: { message: `Insufficient credits for user ${user_id}, balance would be ${nextBalance}` },
          };
        }

        row.balance_before = previousBalance;
        row.balance_after = nextBalance;
      }
    }

    const columns = Array.from(
      normalizedRows.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set<string>()),
    );

    const table = new this.pgp.helpers.TableName({ table: tableName, schema });
    const cs = new this.pgp.helpers.ColumnSet(columns, { table });
    const query = this.pgp.helpers.insert(normalizedRows, cs);
    try {
      await this.pg.none(query);
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }

    return { data: normalizedRows, error: null };
  }

  private parseTable(): [string, string] {
    if (this.table.includes('.')) {
      const [schema, table] = this.table.split('.');
      return [schema, table];
    }
    return ['public', this.table];
  }

  private async runSelect(limit?: number) {
    const whereClauses: string[] = [];
    const values: any[] = [];

    this.filters.forEach((filter, index) => {
      const placeholder = `$${index + 1}`;
      let columnExpr = filter.column;
      if (columnExpr.includes('->>') && !columnExpr.includes("'")) {
        const [base, key] = columnExpr.split('->>');
        columnExpr = `${base.trim()}->>'${key.trim()}'`;
      }
      if (filter.value === null) {
        whereClauses.push(`${columnExpr} IS NULL`);
      } else {
        whereClauses.push(`${columnExpr} = ${placeholder}`);
        values.push(filter.value);
      }
    });

    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const limitClause = typeof limit === 'number' ? `LIMIT ${limit}` : '';
    const orderClause = this.orderByClause ? `ORDER BY ${this.orderByClause}` : '';
    const query = `SELECT ${this.selectColumns} FROM ${this.table} ${where} ${orderClause} ${limitClause}`;
    const rows = await this.pg.any(query, values);
    this.selectColumns = '*';
    this.filters = [];
    this.orderByClause = null;
    return rows;
  }
}

class TestSupabaseClient {
  constructor(private readonly harness: SupabaseTestHarness) {}

  from<T extends Record<string, any>>(table: string) {
    return new SupabaseTableBuilder<T>(table, this.harness.pg, this.harness.pgp);
  }

  async rpc(name: string, params: Record<string, any>) {
    if (name !== 'get_wallet_balance') {
      throw new Error(`Unsupported RPC call: ${name}`);
    }

    const { p_user_id } = params;
    const result = await this.harness.pg.oneOrNone(
      `
      SELECT
        balance_credits,
        pending_credits
      FROM public.v_wallet_balances
      WHERE user_id = $1
    `,
      [p_user_id],
    );

    const balanceCredits = Number(result?.balance_credits ?? 0);
    const pendingCredits = Number(result?.pending_credits ?? 0);

    return {
      data: {
        balance_credits: balanceCredits,
        pending_credits: pendingCredits,
        available_credits: balanceCredits - pendingCredits,
      },
      error: null,
    };
  }
}

export class SupabaseTestHarness {
  private db: IMemoryDb;
  pg: IDatabase<any>;
  pgp: IMain;

  constructor() {
    this.db = newDb({ autoCreateForeignKeyIndices: true });
    this.db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: 'uuid',
      implementation: () => randomUUID(),
    });

    const adapter = this.db.adapters.createPgPromise();
    this.pg = adapter;
    this.pgp = adapter.$config.pgp;
  }

  async setup() {
    await this.pg.none('CREATE SCHEMA IF NOT EXISTS auth;');
    await this.pg.none(`
      CREATE TABLE auth.users (
        id uuid PRIMARY KEY,
        email text,
        raw_user_meta_data jsonb DEFAULT '{}'
      );
    `);

    await this.pg.none(`
      CREATE TABLE public.orders (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES auth.users(id),
        total_amount numeric NOT NULL,
        status text DEFAULT 'pending',
        created_at timestamptz DEFAULT NOW()
      );
    `);

    await this.pg.none(`
      CREATE TABLE public.wallet_ledger (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id),
        kind text NOT NULL,
        amount_credits bigint NOT NULL,
        ref_type text,
        ref_id text,
        counterparty_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        meta jsonb DEFAULT '{}'::jsonb,
        balance_before bigint NOT NULL DEFAULT 0,
        balance_after bigint NOT NULL DEFAULT 0,
        reversal_of_entry_id uuid REFERENCES public.wallet_ledger(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    await this.pg.none(`
      CREATE VIEW public.v_wallet_balances AS
      SELECT
        user_id,
        COALESCE(SUM(amount_credits), 0) AS balance_credits,
        COALESCE(
          SUM(
            CASE
              WHEN kind = 'topup' AND created_at > NOW() - INTERVAL '48 hours' THEN amount_credits
              ELSE 0
            END
          ),
          0
        ) AS pending_credits
      FROM public.wallet_ledger
      GROUP BY user_id;
    `);

  }

  async reset() {
    await this.pg.none('DELETE FROM public.wallet_ledger;');
    await this.pg.none('DELETE FROM public.orders;');
    await this.pg.none('DELETE FROM auth.users;');
  }

  createClient() {
    return new TestSupabaseClient(this);
  }

  async createUser(overrides: { id?: string; email?: string } = {}) {
    const id = overrides.id ?? randomUUID();
    await this.pg.none('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [id, overrides.email ?? `${id}@example.com`]);
    return id;
  }

  async createOrder(params: { id?: string; userId: string; totalAmount: number; status?: string }) {
    const id = params.id ?? randomUUID();
    await this.pg.none(
      'INSERT INTO public.orders (id, user_id, total_amount, status) VALUES ($1, $2, $3, $4)',
      [id, params.userId, params.totalAmount, params.status ?? 'pending'],
    );
    return id;
  }

  async getLedgerEntries() {
    const rows = await this.pg.any('SELECT * FROM public.wallet_ledger ORDER BY created_at');
    return rows.map((row) => ({
      ...row,
      amount_credits: Number(row.amount_credits),
      balance_before: Number(row.balance_before ?? 0),
      balance_after: Number(row.balance_after ?? 0),
    }));
  }
}

export type SupabaseHarnessClient = ReturnType<SupabaseTestHarness['createClient']>;
