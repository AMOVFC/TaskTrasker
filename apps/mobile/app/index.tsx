import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const fallbackUrl = 'https://tasktasker.com';
const webAppUrl =
  (Constants.expoConfig?.extra?.webAppUrl as string | undefined)?.trim() || fallbackUrl;

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <WebView
        source={{ uri: webAppUrl }}
        startInLoadingState
        setSupportMultipleWindows={false}
        javaScriptEnabled
        domStorageEnabled
      />
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
