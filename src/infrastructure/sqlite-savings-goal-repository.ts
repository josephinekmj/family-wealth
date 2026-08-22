import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  mapRecordToSavingsGoalProfile,
  mapSavingsGoalProfileToRecord,
  type SavingsGoalProfile,
  type SavingsGoalRecord,
  type SavingsGoalRepository,
} from "../application/savings-goal-contracts.js";

type SavingsGoalRow = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  expected_annual_return: number;
};

const SELECT_COLUMNS = `
  id,
  name,
  target_amount,
  current_amount,
  target_date,
  expected_annual_return
`;

export class SQLiteSavingsGoalRepository implements SavingsGoalRepository {
  private readonly database: DatabaseSync;

  constructor(databasePath: string) {
    if (databasePath !== ":memory:") {
      mkdirSync(dirname(databasePath), { recursive: true });
    }

    this.database = new DatabaseSync(databasePath);
    initializeSchema(this.database);
  }

  async findAll(): Promise<SavingsGoalProfile[]> {
    const rows = this.database
      .prepare(`SELECT ${SELECT_COLUMNS} FROM savings_goals ORDER BY rowid`)
      .all() as SavingsGoalRow[];

    return rows.map(mapRowToSavingsGoalProfile);
  }

  async findById(id: string): Promise<SavingsGoalProfile | null> {
    const row = this.database
      .prepare(`SELECT ${SELECT_COLUMNS} FROM savings_goals WHERE id = ?`)
      .get(id) as SavingsGoalRow | undefined;

    return row ? mapRowToSavingsGoalProfile(row) : null;
  }

  async save(goal: SavingsGoalProfile): Promise<void> {
    const record = mapSavingsGoalProfileToRecord(goal);

    this.database
      .prepare(
        `
          INSERT INTO savings_goals (
            id,
            name,
            target_amount,
            current_amount,
            target_date,
            expected_annual_return
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            target_amount = excluded.target_amount,
            current_amount = excluded.current_amount,
            target_date = excluded.target_date,
            expected_annual_return = excluded.expected_annual_return
        `,
      )
      .run(
        record.id,
        record.name,
        record.targetAmount,
        record.currentAmount,
        record.targetDate,
        record.expectedAnnualReturn,
      );
  }

  close(): void {
    this.database.close();
  }
}

function initializeSchema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL,
      target_date TEXT NOT NULL,
      expected_annual_return REAL NOT NULL
    )
  `);
}

function mapRowToSavingsGoalProfile(row: SavingsGoalRow): SavingsGoalProfile {
  const record: SavingsGoalRecord = {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount,
    targetDate: row.target_date,
    expectedAnnualReturn: row.expected_annual_return,
  };

  return mapRecordToSavingsGoalProfile(record);
}
