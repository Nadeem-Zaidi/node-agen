export interface Migration {
  /**
   * Unique version/timestamp identifier for this migration
   * Format: YYYYMMDDHHMMSS (e.g., 20240115120000)
   */
  version: string;

  /**
   * Description of what this migration does
   */
  description: string;

  /**
   * SQL to run when migrating up
   */
  up: string | string[];

  /**
   * SQL to run when rolling back
   */
  down: string | string[];
}

export interface MigrationRecord {
  id?: number;
  version: string;
  description: string;
  applied_at: Date;
  execution_time_ms: number;
}

export interface MigrationResult {
  success: boolean;
  version: string;
  description: string;
  executionTime: number;
  error?: string;
}

export interface MigrationStatus {
  pending: Migration[];
  applied: MigrationRecord[];
  current: string | null;
}