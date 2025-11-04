import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

const categories = ['All', 'Work', 'Home', 'Study', 'Reminder', 'Idea'] as const;
type CategoryFilter = typeof categories[number];

type Note = {
  id: number;
  category: string;
  note: string;
  datetime: string | null;
  created_at: string;
  transcript?: string;
};

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:4000';

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>('All');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setFetching] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission is required to capture notes.');
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => null);
      }
    };
  }, [recording]);

  useEffect(() => {
    fetchNotes(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchNotes = async (category: CategoryFilter) => {
    try {
      setFetching(true);
      const query = category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
      const response = await fetch(`${API_BASE_URL}/notes${query}`);
      if (!response.ok) {
        throw new Error('Failed to load notes');
      }
      const data = await response.json();
      setNotes(data.notes ?? []);
    } catch (err) {
      console.error(err);
      setError('Unable to load notes.');
    } finally {
      setFetching(false);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
    } catch (err) {
      console.error('Failed to start recording', err);
      setError('Unable to start recording.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      setUploading(true);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) {
        throw new Error('No recording URI');
      }

      const formData = new FormData();
      const audioFile: any = {
        uri,
        name: `note-${Date.now()}.m4a`,
        type: Platform.select({ ios: 'audio/m4a', android: 'audio/m4a', default: 'audio/m4a' }) ?? 'audio/m4a'
      };
      formData.append('audio', audioFile);

      const response = await fetch(`${API_BASE_URL}/notes`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to process note');
      }

      const data = await response.json();
      if (data?.note) {
        setNotes((prev) => [data.note, ...prev]);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      setError('We could not save your note. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const header = useMemo(
    () => (
      <View style={styles.filters}>
        {categories.map((item) => {
          const isActive = filter === item;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setFilter(item)}
              disabled={isFetching && filter === item}
            >
              <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ),
    [filter, isFetching]
  );

  const renderItem = ({ item }: { item: Note }) => {
    const formatted = formatDateTime(item.datetime ?? item.created_at);
    return (
      <View style={styles.noteCard}>
        <View style={styles.noteHeader}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.time}>{formatted}</Text>
        </View>
        <Text style={styles.noteText}>{item.note}</Text>
        {item.transcript && item.transcript !== item.note ? (
          <Text style={styles.transcript}>“{item.transcript}”</Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>EchoMind</Text>
        <Text style={styles.subtitle}>Capture your thoughts. Let AI organise them.</Text>
        {header}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {isFetching ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#111" />
          </View>
        ) : (
          <FlatList
            data={notes}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            ListEmptyComponent={<Text style={styles.empty}>No notes yet. Tap record to begin.</Text>}
            contentContainerStyle={notes.length === 0 ? styles.emptyContainer : undefined}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      <View style={styles.recordWrapper}>
        <TouchableOpacity
          style={[styles.recordButton, recording && styles.recording]}
          onPress={toggleRecording}
          activeOpacity={0.7}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.recordLabel}>{recording ? 'Stop' : 'Record'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function formatDateTime(isoString: string | null) {
  if (!isoString) return 'No time';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'No time';
  }
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  return formatter.format(date);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#111'
  },
  subtitle: {
    marginTop: 4,
    fontSize: 16,
    color: '#666'
  },
  filters: {
    flexDirection: 'row',
    marginTop: 24,
    flexWrap: 'wrap'
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderColor: '#e0e0e0',
    borderWidth: 1,
    marginRight: 12,
    marginBottom: 12
  },
  filterPillActive: {
    backgroundColor: '#111'
  },
  filterLabel: {
    fontSize: 14,
    color: '#111'
  },
  filterLabelActive: {
    color: '#fff'
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  empty: {
    textAlign: 'center',
    color: '#999'
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111'
  },
  time: {
    fontSize: 12,
    color: '#666'
  },
  noteText: {
    fontSize: 16,
    color: '#222'
  },
  transcript: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic'
  },
  recordWrapper: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center'
  },
  recordButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center'
  },
  recording: {
    backgroundColor: '#d7263d'
  },
  recordLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  error: {
    color: '#d7263d',
    marginTop: 12
  }
});
