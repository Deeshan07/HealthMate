export const metrics = [
  { key: 'steps', label: 'Steps walked', unit: 'steps', color: '#256347' },
  { key: 'calories', label: 'Calories burned', unit: 'kcal', color: '#A33537' },
  { key: 'water', label: 'Water intake', unit: 'ml', color: '#175E9B' },
];

export function dateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function validateDate(value, today = dateKey()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Use YYYY-MM-DD.';
  const date = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return 'Enter a real calendar date.';
  }
  if (value < '1900-01-01' || value > today) return 'Enter a date from 1900 through today.';
  return '';
}

export function validateRecord(draft) {
  const errors = {};
  const dateError = validateDate(draft.date);
  if (dateError) errors.date = dateError;
  for (const { key } of metrics) {
    const value = draft[key].trim();
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
      errors[key] = 'Enter a whole number of zero or more.';
    }
  }
  return errors;
}

export function totalsForDate(records, date) {
  const totals = { steps: 0, calories: 0, water: 0 };
  for (const record of records) {
    if (record.date === date) {
      for (const { key } of metrics) totals[key] += record[key];
    }
  }
  return totals;
}
