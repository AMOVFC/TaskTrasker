import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState } from 'react';

const fallbackUrl = 'https://tasktrasker.com';
const webAppUrl =
  (Constants.expoConfig?.extra?.webAppUrl as string | undefined)?.trim() || fallbackUrl;

export default function HomeScreen() {
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Error Loading App</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorUrl}>URL: {webAppUrl}</Text>
        </View>
      ) : (
        <WebView
          source={{ uri: webAppUrl }}
          startInLoadingState
          setSupportMultipleWindows={false}
          javaScriptEnabled
          domStorageEnabled
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            setError(`Failed to load: ${nativeEvent.description}`);
            setLoading(false);
          }}
          onLoadEnd={() => setLoading(false)}
        />
      )}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Android-first setup • iOS on request</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#020617'
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12
  },
  errorText: {
    color: '#e2e8f0',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20
  },
  errorUrl: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'monospace'
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  badgeText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600'
  }
});
