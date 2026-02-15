import { DatabaseFactory, DatabaseType } from "./databasefactory";
import { DatabaseConfig, IDatabaseAdapter } from "./idatabaseadapter";


export class DatabaseManager {
  private static instance: DatabaseManager;
  private connections: Map<string, IDatabaseAdapter> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Add a new database connection
   */
  async addConnection(
    name: string,
    type: DatabaseType,
    config: DatabaseConfig
  ): Promise<IDatabaseAdapter> {
    if (this.connections.has(name)) {
      throw new Error(`Connection with name "${name}" already exists`);
    }

    const adapter = await DatabaseFactory.createAndConnect(type, config);
    this.connections.set(name, adapter);
    return adapter;
  }

  /**
   * Get a database connection by name
   */
  getConnection(name: string): IDatabaseAdapter {
    const connection = this.connections.get(name);
    if (!connection) {
      throw new Error(`Connection with name "${name}" not found`);
    }
    return connection;
  }

  /**
   * Check if a connection exists
   */
  hasConnection(name: string): boolean {
    return this.connections.has(name);
  }

  /**
   * Remove a connection
   */
  async removeConnection(name: string): Promise<void> {
    const connection = this.connections.get(name);
    if (connection) {
      await connection.disconnect();
      this.connections.delete(name);
    }
  }

  /**
   * Get all connection names
   */
  getConnectionNames(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    const promises = Array.from(this.connections.values()).map(conn =>
      conn.disconnect()
    );
    await Promise.all(promises);
    this.connections.clear();
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}