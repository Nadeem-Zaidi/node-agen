import { Pool, PoolClient } from "pg";
import { DatabaseConfig, IDatabaseAdapter, QueryResult } from "../idatabaseadapter";

export class PostgreSQLAdapter implements IDatabaseAdapter {
    private pool: Pool | null = null;
    private client: PoolClient | null = null;
    private config: DatabaseConfig;
    private inTransaction = false;

    constructor(config: DatabaseConfig) {
        this.config = config;
    }

    async connect(): Promise<void> {
        try {
            this.pool = new Pool({
                host: this.config.host,
                port: this.config.port,
                user: this.config.username,
                password: this.config.password,
                database: this.config.database,
                max: this.config.maxConnections || 10,
                connectionTimeoutMillis: this.config.connectionTimeout || 10000,
                ssl: this.config.ssl ? { rejectUnauthorized: false } : false
            });

            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            console.log(`Connected to PostgreSQL database: ${this.config.database}`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`PostgreSQL connection failed: ${errorMessage}`);
        }
    }

    async disconnect(): Promise<void> {
        try {
            if (this.pool) {
                await this.pool.end();
                this.pool = null;
                this.client = null;
                console.log('Disconnected from PostgreSQL database');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`PostgreSQL disconnection failed: ${errorMessage}`);
        }
    }

    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) {
        throw new Error('Database not connected');
    }

    try {
        const client = this.inTransaction && this.client ? this.client : this.pool;
        
        // DEBUG: Log what we're about to execute
        console.log('==================');
        console.log('SQL:', sql);
        console.log('Params:', params);
        console.log('Has params?', params && params.length > 0);
        console.log('==================');
        
        const result = params && params.length > 0 
            ? await client.query(sql, params)
            : await client.query(sql);

        return {
            rows: result.rows as T[],
            rowCount: result.rowCount || 0,
            fields: result.fields ? result.fields.map(f => f.name) : []
        };

    } catch (error) {
        console.error('QUERY ERROR:', error); // Add this
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`PostgreSQL query failed: ${errorMessage}`);
    }
}
    async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
        const result = await this.query<T>(sql, params);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    async beginTransaction(): Promise<void> {
        if (!this.pool) {
            throw new Error('Database not connected');
        }

        try {
            this.client = await this.pool.connect();
            await this.client.query('BEGIN');
            this.inTransaction = true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to begin transaction: ${errorMessage}`);
        }
    }

    async commit(): Promise<void> {
        if (!this.client || !this.inTransaction) {
            throw new Error('No active transaction');
        }

        try {
            await this.client.query('COMMIT');
            this.client.release();
            this.client = null;
            this.inTransaction = false;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to commit transaction: ${errorMessage}`);
        }
    }

    async rollback(): Promise<void> {
        if (!this.client || !this.inTransaction) {
            throw new Error('No active transaction');
        }

        try {
            await this.client.query('ROLLBACK');
            this.client.release();
            this.client = null;
            this.inTransaction = false;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to rollback transaction: ${errorMessage}`);
        }
    }

    isConnected(): boolean {
        return this.pool !== null;
    }

    getType(): string {
        return 'PostgreSQL';
    }
}