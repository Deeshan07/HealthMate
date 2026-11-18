import { useCallback, useEffect, useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import * as database from './database';

export default function useRecords() {
  const db = useSQLiteContext();
  const [records, setRecords] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const locked = useRef(false);

  const run = useCallback(async (operation) => {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      if (operation) await operation(db);
      try {
        setRecords(await database.listRecords(db));
      } catch {
        setError('Could not load records. Tap Reload to try again.');
      }
      return true;
    } catch {
      setError('Could not save the change. Please try again.');
      return false;
    } finally {
      setBusy(false);
      locked.current = false;
    }
  }, [db]);

  useEffect(() => { run(); }, [run]);

  return {
    records, busy, error,
    reload: () => run(),
    save: record => run(db => database.saveRecord(db, record)),
    remove: id => run(db => database.deleteRecord(db, id)),
    seed: () => run(database.addExampleRecords),
  };
}
