import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { apiPost } from '@/constants/api';

const PRIMARY_GRADIENT = ['#3b82f6', '#10b981'] as const;
const USER_COLOR = '#e0f2fe';
const BOT_LOADING_COLOR = '#d1d5db';
const BOT_ACTIVE_COLOR = '#3b82f6';

interface Message {
    id: number | string;
    text: string;
    sender: 'user' | 'bot';
}

const initialMessage: Message = {
    id: 0,
    text: 'Halo! Saya AgriBot, asisten ahli Aquaponik dan Urban Farming. Peran saya hanya seputar **Pertanian Perkotaan**, **Kualitas Air**, dan **Pemeliharaan Sistem**. Silakan tanyakan hal-hal spesifik terkait sistem Anda!',
    sender: 'bot'
};

const SuggestedQuestions = ['Bagaimana cara menanam yang baik ?', 'Tentang tanaman rumah', 'Apa itu aquaponik?', 'Bagaimana cara mengatur pH air?', 'Bagaimana cara mengendalikan hama?', 'Apa itu hidroponik?'];

interface ChatResponse {
    reply: string;
}

const AdvancedMessageParser: React.FC<{ content: string; style: any }> = ({ content, style }) => {
    const parseBold = (text: string, keyPrefix: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        
        return parts.map((part, index) => {
            const key = `${keyPrefix}_${index}`;
            if (part.startsWith('**') && part.endsWith('**')) {
                return (
                    <Text key={key} style={{ fontWeight: 'bold' }}>
                        {part.slice(2, -2)}
                    </Text>
                );
            }
            return <Text key={key}>{part}</Text>;
        });
    };

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        const key = `l_${index}`;

        if (!trimmedLine) {
            return;
        }

        let contentElement;
        let isList = false;

        if (trimmedLine.startsWith('### ')) {
            const text = trimmedLine.substring(4).trim();
            contentElement = (
                <View key={key} style={styles.headingContainer}>
                    <Text style={[style, styles.headingText]}>
                        {parseBold(text, key)}
                    </Text>
                </View>
            );
        }
        else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
            const text = trimmedLine.substring(2).trim();
            isList = true;
            contentElement = (
                <View key={key} style={styles.listItemContainer}>
                    <Text style={[style, styles.listBullet]}>•</Text>
                    <Text style={[style, styles.listText]}>
                        {parseBold(text, key)}
                    </Text>
                </View>
            );
        }
        else {
            contentElement = (
                <Text key={key} style={style}>
                    {parseBold(trimmedLine, key)}
                </Text>
            );
        }

        elements.push(contentElement);
        
        if (index < lines.length - 1 && !isList) {
            elements.push(<View key={`s_${index}`} style={{ height: 8 }} />);
        }
    });

    return <View>{elements}</View>;
};

const ChatBubble: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.sender === 'user';
    
    const bubbleStyles = [
        styles.bubble,
        isUser ? styles.userBubble : styles.botBubble,
    ];

    return (
        <View style={[styles.bubbleContainer, isUser ? styles.userContainer : styles.botContainer]}>
            {isUser ? (
                <View style={[...bubbleStyles, { backgroundColor: USER_COLOR }]}>
                    <Text style={styles.userText}>{message.text}</Text>
                </View>
            ) : (
                <LinearGradient
                    colors={PRIMARY_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={bubbleStyles}
                >
                    <AdvancedMessageParser content={message.text} style={styles.botText} />
                </LinearGradient>
            )}
        </View>
    );
};

const ChatbotPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([initialMessage]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [nextId, setNextId] = useState(1);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]);

    const callGeminiAPI = async (query: string): Promise<string> => {
        const maxRetries = 3;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const result = await apiPost<ChatResponse>('/api/chat', { message: query });
                return result.reply || "Maaf, AgriBot tidak dapat menghasilkan balasan yang relevan.";

            } catch (error) {
                console.error(`Attempt ${attempt + 1} failed:`, error);
                if (attempt < maxRetries - 1) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    return "AgriBot saat ini tidak dapat terhubung. Silakan periksa koneksi internet Anda.";
                }
            }
        }
        return "Terjadi kesalahan yang tidak terduga saat menghubungi AI.";
    };

    const handleSendMessage = async (text: string) => {
        const messageText = text.trim();
        if (!messageText || isLoading) return;

        setIsLoading(true);
        setInputText('');

        const newUserMessage: Message = { id: nextId, text: messageText, sender: 'user' };
        setMessages(prev => [...prev, newUserMessage]);
        setNextId(prev => prev + 1);

        const botResponseText = await callGeminiAPI(messageText);

        const newBotMessage: Message = { id: nextId + 1, text: botResponseText, sender: 'bot' };
        setMessages(prev => [...prev, newBotMessage]);
        setNextId(prev => prev + 2);

        setIsLoading(false);
    };

    const handleQuestionPress = (question: string) => {
        handleSendMessage(question);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >

            <LinearGradient
                colors={PRIMARY_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}>
                <Text style={styles.headerTitle}>AgriBot</Text>
            </LinearGradient>

            <ScrollView
                ref={scrollViewRef}
                style={styles.chatScrollArea}
                contentContainerStyle={styles.chatContent}
                showsVerticalScrollIndicator={false}
            >

                {messages.length <= 1 && !isLoading ? (
                    <View style={styles.welcomePromptContainer}>
                        <View style={styles.welcomeIconWrap}>
                            <Feather name="message-circle" size={34} color="#2563eb" />
                        </View>
                        <Text style={styles.chatPrompt}>Ada yang bisa saya bantu?</Text>
                        <Text style={styles.chatPromptSubtitle}>Tanyakan pH, suhu, nutrisi, atau perawatan sistem.</Text>
                    </View>
                ) : (
                    messages.map(msg => (
                        <ChatBubble key={msg.id} message={msg} />
                    ))
                )}
                
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={BOT_ACTIVE_COLOR} />
                        <Text style={styles.loadingText}>AgriBot sedang berpikir...</Text>
                    </View>
                )}

            </ScrollView>

            <View style={styles.suggestedQuestionsWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestedQuestions}
                >
                    {SuggestedQuestions.map((q, index) => (
                        <Pressable
                            key={index}
                            style={styles.questionButton}
                            onPress={() => handleQuestionPress(q)}
                            disabled={isLoading}
                        >
                            <Text style={styles.questionText}>{q}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.textInput}
                    placeholder={isLoading ? "Menunggu balasan..." : "Tanya AgriBot"}
                    placeholderTextColor="#a3a3a3"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline={true}
                    editable={!isLoading}
                />
                <Pressable
                    style={[
                        styles.sendButton,
                        {
                            backgroundColor: (inputText.trim() && !isLoading) ? BOT_ACTIVE_COLOR : BOT_LOADING_COLOR
                        }
                    ]}
                    onPress={() => handleSendMessage(inputText)}
                    disabled={!inputText.trim() || isLoading}
                >
                    <Feather name="send" size={22} color="#fff" />
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
};

export default ChatbotPage;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 18,
        marginTop: 25,
        marginHorizontal: 16,
        borderRadius: 18,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },

    chatScrollArea: {
        flex: 1,
        paddingHorizontal: 16,
    },
    chatContent: {
        flexGrow: 1,
        paddingVertical: 10,
        justifyContent: 'flex-end',
    },
    welcomePromptContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    welcomeIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#dbeafe',
        marginBottom: 14,
    },
    chatPrompt: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1f2937',
        textAlign: 'center',
    },
    chatPromptSubtitle: {
        fontSize: 14,
        lineHeight: 20,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 6,
    },

    bubbleContainer: {
        flexDirection: 'row',
        marginVertical: 6,
    },
    botContainer: {
        justifyContent: 'flex-start',
    },
    userContainer: {
        justifyContent: 'flex-end',
    },
    bubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        maxWidth: '85%',
        borderRadius: 18,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    botBubble: {
        borderTopLeftRadius: 5,
    },
    userBubble: {
        borderTopRightRadius: 5,
    },
    
    botText: {
        color: '#fff',
        fontSize: 15,
        lineHeight: 22,
    },

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
        color: '#fff',
    },
    listText: {
        flexShrink: 1,
        fontSize: 15,
        lineHeight: 22,
        color: '#fff',
    },
    headingContainer: {
        marginTop: 8,
        marginBottom: 4,
    },
    headingText: {
        fontWeight: 'bold',
        fontSize: 16,
        lineHeight: 24,
    },

    userText: {
        color: '#1f2937',
        fontSize: 15,
    },

    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginVertical: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#f0f9ff',
        borderRadius: 16,
        borderTopLeftRadius: 6,
        maxWidth: '70%',
    },
    loadingText: {
        marginLeft: 10,
        color: '#0369a1',
        fontSize: 15,
        fontWeight: '500',
    },

    suggestedQuestionsWrapper: {
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingVertical: 10,
    },
    suggestedQuestions: {
        paddingHorizontal: 16,
    },
    questionButton: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        backgroundColor: '#f9fafb',
    },
    questionText: {
        color: '#374151',
        fontWeight: '500',
        fontSize: 14,
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#fff',
        paddingBottom: 15,
    },
    textInput: {
        flex: 1,
        minHeight: 45,
        maxHeight: 120,
        backgroundColor: '#f3f4f6',
        borderRadius: 25,
        padding: 10,
        paddingHorizontal: 18,
        fontSize: 16,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 84,
    },
    sendButton: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 84,
    },
});
