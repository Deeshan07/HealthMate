import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text,
  TextInput, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import { initializeDatabase } from './src/database';
import { dateKey, metrics, totalsForDate, validateDate, validateRecord } from './src/records';
import useRecords from './src/useRecords';

function Button({ title, onPress, disabled, secondary = false, selected }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled, selected }}
      disabled={disabled} onPress={onPress}
      style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

function Field({ label, value, onChangeText, error, numeric, placeholder }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor="#62746C"
        keyboardType={numeric ? 'number-pad' : 'default'}
        autoCapitalize="none" autoCorrect={false} style={[styles.input, error && styles.invalid]} />
      {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
    </View>
  );
}

function Dashboard({ records, onAdd, busy }) {
  const today = dateKey();
  const totals = totalsForDate(records, today);
  return (
    <>
      <Text style={styles.title}>Today’s activity</Text>
      <Text style={styles.subtitle}>{today}</Text>
      {metrics.map(({ key, label, unit, color }) => (
        <View key={key} style={[styles.card, { borderLeftWidth: 5, borderLeftColor: color }]}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.value, { color }]}>{totals[key].toLocaleString()} {unit}</Text>
        </View>
      ))}
      <Button title="Add record" onPress={onAdd} disabled={busy} />
    </>
  );
}

function RecordForm({ record, busy, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    date: record?.date ?? dateKey(),
    steps: record ? String(record.steps) : '',
    calories: record ? String(record.calories) : '',
    water: record ? String(record.water) : '',
  });
  const [errors, setErrors] = useState({});

  function update(key, value) {
    setDraft(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  }

  function submit() {
    const clean = { ...draft, date: draft.date.trim() };
    const problems = validateRecord(clean);
    setErrors(problems);
    if (Object.keys(problems).length) return;
    onSave({
      id: record?.id,
      date: clean.date,
      steps: Number(clean.steps),
      calories: Number(clean.calories),
      water: Number(clean.water),
    });
  }

  return (
    <>
      <Text style={styles.title}>{record ? 'Edit record' : 'Add record'}</Text>
      <Field label="Date (YYYY-MM-DD)" value={draft.date}
        onChangeText={value => update('date', value)} error={errors.date} />
      {metrics.map(({ key, label, unit }) => (
        <Field key={key} label={key === 'steps' ? label : `${label} (${unit})`}
          value={draft[key]} onChangeText={value => update(key, value)}
          error={errors[key]} numeric />
      ))}
      <Button title="Save record" onPress={submit} disabled={busy} />
      <Button title="Cancel" onPress={onCancel} disabled={busy} secondary />
    </>
  );
}

function History({ records, busy, onEdit, onDelete, onSeed }) {
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const visibleRecords = filter ? records.filter(record => record.date === filter) : records;

  function applyFilter() {
    const date = input.trim();
    const problem = date ? validateDate(date) : '';
    setError(problem);
    if (!problem) setFilter(date);
  }

  return (
    <>
      <Text style={styles.title}>Record history</Text>
      <Field label="Filter by date (YYYY-MM-DD)" value={input} onChangeText={setInput}
        placeholder={dateKey()} error={error} />
      <View style={styles.row}>
        <Button title="Apply filter" onPress={applyFilter} />
        <Button title="Clear" secondary onPress={() => { setInput(''); setFilter(''); setError(''); }} />
      </View>
      {!!filter && <Text style={styles.subtitle}>Showing {filter}</Text>}
      {!busy && visibleRecords.length === 0 && (
        <Text style={styles.subtitle}>{filter ? 'No records on this date.' : 'No records yet.'}</Text>
      )}
      {visibleRecords.map(record => (
        <View key={record.id} style={styles.card}>
          <Text style={styles.label}>{record.date}</Text>
          {metrics.map(({ key, label, unit }) => (
            <Text key={key} style={styles.subtitle}>{label} · {record[key].toLocaleString()} {unit}</Text>
          ))}
          <View style={styles.row}>
            <Button title="Edit" secondary disabled={busy} onPress={() => onEdit(record)} />
            <Button title="Delete" secondary disabled={busy} onPress={() => onDelete(record)} />
          </View>
        </View>
      ))}
      {!records.length && !filter && (
        <Button title="Load sample records" secondary disabled={busy} onPress={onSeed} />
      )}
    </>
  );
}

function HealthMate() {
  const store = useRecords();
  const [screen, setScreen] = useState('dashboard');
  const [editing, setEditing] = useState(null);

  function openForm(record = null) {
    setEditing(record);
    setScreen('form');
  }

  function confirmDelete(record) {
    Alert.alert('Delete record?', `Remove this entry from ${record.date}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => store.remove(record.id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.brand}>HealthMate</Text>
        <View style={styles.row}>
          <Button title="Dashboard" selected={screen === 'dashboard'} disabled={store.busy}
            secondary={screen !== 'dashboard'} onPress={() => setScreen('dashboard')} />
          <Button title="History" selected={screen === 'history'} disabled={store.busy}
            secondary={screen !== 'history'} onPress={() => setScreen('history')} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {store.busy && <ActivityIndicator color="#225843" />}
        {!!store.error && (
          <View style={styles.card}>
            <Text accessibilityLiveRegion="polite" style={styles.error}>{store.error}</Text>
            <Button title="Reload" secondary onPress={store.reload} disabled={store.busy} />
          </View>
        )}
        {screen === 'dashboard' && (
          <Dashboard records={store.records} busy={store.busy} onAdd={() => openForm()} />
        )}
        {screen === 'form' && (
          <RecordForm record={editing} busy={store.busy}
            onCancel={() => setScreen(editing ? 'history' : 'dashboard')}
            onSave={async record => {
              const saved = await store.save(record);
              if (saved) setScreen(editing ? 'history' : 'dashboard');
            }} />
        )}
        {screen === 'history' && (
          <History records={store.records} busy={store.busy} onEdit={openForm}
            onDelete={confirmDelete} onSeed={store.seed} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const [databaseError, setDatabaseError] = useState(false);

  return (
    <SafeAreaProvider>
      {databaseError ? (
        <SafeAreaView style={[styles.page, styles.content]}>
          <Text style={styles.title}>HealthMate could not open its database</Text>
          <Button title="Try again" onPress={() => setDatabaseError(false)} />
        </SafeAreaView>
      ) : (
        <SQLiteProvider databaseName="healthmate.db" onInit={initializeDatabase}
          onError={() => setDatabaseError(true)}>
          <HealthMate />
        </SQLiteProvider>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F3F7F4' },
  header: { padding: 16, gap: 12, backgroundColor: '#FFFFFF' },
  content: { padding: 16, gap: 14, width: '100%', maxWidth: 600, alignSelf: 'center' },
  brand: { fontSize: 23, fontWeight: '800', color: '#225843' },
  title: { fontSize: 28, fontWeight: '800', color: '#182D25' },
  subtitle: { fontSize: 15, color: '#44584E' },
  label: { fontSize: 16, fontWeight: '600', color: '#182D25' },
  value: { fontSize: 26, fontWeight: '800' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    minHeight: 48, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10,
    backgroundColor: '#225843', alignItems: 'center', justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  secondary: { backgroundColor: '#DFEDE4' },
  secondaryText: { color: '#173F30' },
  disabled: { opacity: 0.5 },
  input: {
    minHeight: 48, borderWidth: 1, borderColor: '#849B90', borderRadius: 10,
    marginTop: 6, padding: 11, backgroundColor: '#FFFFFF', color: '#182D25', fontSize: 16,
  },
  invalid: { borderColor: '#A33537' },
  error: { color: '#A33537', fontSize: 14 },
});
