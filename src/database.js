import { dateKey } from './records.js';

export const schema = `
  CREATE TABLE IF NOT EXISTS health_records (
    id INTEGER PRIMARY KEY,
    date TEXT NOT NULL,
    steps INTEGER NOT NULL CHECK (steps >= 0),
    calories INTEGER NOT NULL CHECK (calories >= 0),
    water INTEGER NOT NULL CHECK (water >= 0)
  );
  CREATE INDEX IF NOT EXISTS health_records_date ON health_records (date);
`;

export async function initializeDatabase(db) {
  await db.execAsync(schema);
}

export function listRecords(db) {
  return db.getAllAsync('SELECT * FROM health_records ORDER BY date DESC, id DESC');
}

export async function saveRecord(db, record) {
  const values = [record.date, record.steps, record.calories, record.water];
  if (record.id == null) {
    await db.runAsync(
      'INSERT INTO health_records (date, steps, calories, water) VALUES (?, ?, ?, ?)',
      values
    );
  } else {
    await db.runAsync(
      'UPDATE health_records SET date = ?, steps = ?, calories = ?, water = ? WHERE id = ?',
      [...values, record.id]
    );
  }
}

export function deleteRecord(db, id) {
  return db.runAsync('DELETE FROM health_records WHERE id = ?', id);
}

export function addExampleRecords(db) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return db.runAsync(
    'INSERT INTO health_records (date, steps, calories, water) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
    [dateKey(), 4200, 210, 1200, dateKey(yesterday), 6500, 320, 1800]
  );
}
