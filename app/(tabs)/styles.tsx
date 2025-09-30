import { Platform, StyleSheet } from 'react-native';
import { BOT_ACTIVE_COLOR, BOT_AVATAR_BG, BOT_TEXT_COLOR, PRIMARY_TEXT_COLOR } from './chatbot';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb', // Latar belakang aplikasi yang sedikit abu-abu
  },

  // --- Header Style ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 35 : 55, // Padding lebih besar di atas
    paddingBottom: 20,
    // Sudut bawah yang lembut
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15, // Bayangan lebih jelas
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 22, // Ukuran font sedikit diperbesar
    fontWeight: 'bold',
    color: '#fff',
  },

  // --- Chat Area Style ---
  chatScrollArea: {
    flex: 1,
    paddingHorizontal: 15,
  },
  chatContent: {
    flexGrow: 1,
    paddingVertical: 15,
    justifyContent: 'flex-end',
  },
  welcomePromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100, // Dorong konten ke atas sedikit
  },
  chatPrompt: {
    fontSize: 22,
    fontWeight: '700',
    color: PRIMARY_TEXT_COLOR,
    textAlign: 'center',
  },

  // --- Bubble Styles ---
  bubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 6,
  },
  botContainer: {
    justifyContent: 'flex-start',
    flexDirection: 'row',
  },
  userContainer: {
    justifyContent: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    marginHorizontal: 8,
    marginBottom: 2, // Sesuaikan dengan posisi vertikal gelembung
  },
  avatar: {
    width: 32, // Ukuran avatar sedikit diperbesar
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f1f1', // Latar belakang avatar default
    borderWidth: 2,
  },
  userAvatar: {
    borderColor: BOT_ACTIVE_COLOR,
  },
  botAvatar: {
    backgroundColor: BOT_AVATAR_BG, // Light green
    borderColor: '#10b981',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '80%', // Gelembung lebih lebar
    borderRadius: 20, // Sudut yang lebih lembut
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  // Sudut tajam di sisi yang menjauhi avatar
  botBubble: {
    borderTopLeftRadius: 5,
  },
  userBubble: {
    borderTopRightRadius: 5,
  },

  botText: {
    color: BOT_TEXT_COLOR,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500', // Sedikit lebih tebal untuk visibilitas
  },
  userText: {
    color: PRIMARY_TEXT_COLOR,
    fontSize: 15,
  },

  // --- Parser Styles ---
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
    paddingRight: 10,
  },
  listBullet: {
    marginRight: 8,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: 'bold',
    color: BOT_TEXT_COLOR,
  },
  listText: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 22,
    color: BOT_TEXT_COLOR,
  },
  headingContainer: {
    marginTop: 10,
    marginBottom: 5,
  },
  headingText: {
    fontWeight: '900', // Sangat tebal untuk heading
    fontSize: 17,
    lineHeight: 24,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginVertical: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 20,
    borderTopLeftRadius: 5,
    maxWidth: '70%',
  },
  loadingText: {
    marginLeft: 10,
    color: '#0369a1',
    fontSize: 15,
    fontWeight: '600',
  },

  // --- Input & Suggested Questions Styles ---
  suggestedQuestionsWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  suggestedQuestions: {
    paddingHorizontal: 15,
  },
  questionButton: {
    borderWidth: 1,
    borderColor: '#93c5fd', // Border biru lembut
    borderRadius: 30, // Sangat membulat (Pill shape)
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginRight: 8,
    backgroundColor: '#f0f9ff', // Background biru sangat muda
  },
  questionButtonPressed: {
    backgroundColor: '#e0f7ff', // Efek tekan
    opacity: 0.8,
  },
  questionText: {
    color: '#1d4ed8', // Teks biru yang kontras
    fontWeight: '600',
    fontSize: 14,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Penting untuk multiline input
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    minHeight: 50, // Tinggi minimum yang lebih baik
    maxHeight: 120,
    backgroundColor: '#fff',
    borderRadius: 25, // Sudut yang lebih lembut
    padding: 15, // Padding dalam yang lebih besar
    fontSize: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000', // Bayangan halus pada input
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 55,
  },
  sendButton: {
    width: 50, // Tombol sedikit diperbesar
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0, // Dihapus: marginBottom: 55
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    marginBottom: 55,
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
});
