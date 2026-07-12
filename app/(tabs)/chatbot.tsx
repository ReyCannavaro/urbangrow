import { Feather } from '@expo/vector-icons';
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
import { AppTheme } from '@/constants/theme';

const USER_COLOR = AppTheme.color.primaryDark;
const BOT_LOADING_COLOR = AppTheme.color.neutral;
const BOT_ACTIVE_COLOR = AppTheme.color.primary;

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

const SuggestedQuestions = [
    'Cek pH ideal',
    'Atur suhu air',
    'Rawat tanaman rumah',
    'Apa itu aquaponik?',
    'Kendalikan hama',
    'Bedanya hidroponik?',
];

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
            {!isUser ? (
                <View style={styles.botAvatar}>
                    <Feather name="message-square" size={15} color={AppTheme.color.primaryDark} />
                </View>
            ) : null}
            {isUser ? (
                <View style={[...bubbleStyles, { backgroundColor: USER_COLOR }]}>
                    <Text style={styles.userText}>{message.text}</Text>
                </View>
            ) : (
                <View style={bubbleStyles}>
                    <AdvancedMessageParser content={message.text} style={styles.botText} />
                </View>
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

            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Feather name="message-circle" size={22} color={AppTheme.color.primarySoft} />
                </View>
                <View style={styles.headerCopy}>
                    <Text style={styles.headerEyebrow}>Assistant</Text>
                    <Text style={styles.headerTitle}>AgriBot Console</Text>
                    <Text style={styles.headerSubtitle}>Jawaban praktis untuk air, tanaman, dan perawatan sistem.</Text>
                </View>
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.chatScrollArea}
                contentContainerStyle={styles.chatContent}
                showsVerticalScrollIndicator={false}
            >

                {messages.length <= 1 && !isLoading ? (
                    <View style={styles.welcomePromptContainer}>
                        <View style={styles.welcomeIconWrap}>
                            <Feather name="message-circle" size={34} color={AppTheme.color.primaryDark} />
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
                    placeholderTextColor={AppTheme.color.textSubtle}
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
                    <Feather name="send" size={22} color={AppTheme.color.surface} />
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
};

export default ChatbotPage;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppTheme.color.canvas,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 18,
        paddingVertical: 18,
        marginTop: 25,
        marginHorizontal: 16,
        marginBottom: 6,
        borderRadius: AppTheme.radius.panel,
        backgroundColor: AppTheme.color.surfaceStrong,
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(223, 242, 233, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(223, 242, 233, 0.18)',
        marginRight: 12,
    },
    headerCopy: {
        flex: 1,
        minWidth: 0,
    },
    headerEyebrow: {
        color: '#9fc8b7',
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 3,
    },
    headerTitle: {
        fontSize: 25,
        fontWeight: '900',
        color: AppTheme.color.surface,
    },
    headerSubtitle: {
        color: '#c7d8d1',
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4,
        fontWeight: '600',
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
        backgroundColor: AppTheme.color.primarySoft,
        marginBottom: 14,
    },
    chatPrompt: {
        fontSize: 22,
        fontWeight: '900',
        color: AppTheme.color.text,
        textAlign: 'center',
    },
    chatPromptSubtitle: {
        fontSize: 14,
        lineHeight: 20,
        color: AppTheme.color.textMuted,
        textAlign: 'center',
        marginTop: 6,
    },

    bubbleContainer: {
        flexDirection: 'row',
        marginVertical: 6,
        alignItems: 'flex-end',
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
        borderRadius: AppTheme.radius.card,
        shadowColor: AppTheme.shadow.color,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    botBubble: {
        borderTopLeftRadius: 5,
        backgroundColor: AppTheme.color.surface,
        borderWidth: 1,
        borderColor: AppTheme.color.line,
    },
    userBubble: {
        borderTopRightRadius: 5,
    },
    
    botText: {
        color: AppTheme.color.text,
        fontSize: 15,
        lineHeight: 22,
    },
    botAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AppTheme.color.primarySoft,
        marginRight: 8,
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
        color: AppTheme.color.primaryDark,
    },
    listText: {
        flexShrink: 1,
        fontSize: 15,
        lineHeight: 22,
        color: AppTheme.color.text,
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
        color: AppTheme.color.surface,
        fontSize: 15,
        lineHeight: 21,
        fontWeight: '700',
    },

    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginVertical: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: AppTheme.color.primaryMist,
        borderRadius: AppTheme.radius.card,
        borderTopLeftRadius: 6,
        maxWidth: '70%',
    },
    loadingText: {
        marginLeft: 10,
        color: AppTheme.color.primaryDark,
        fontSize: 15,
        fontWeight: '700',
    },

    suggestedQuestionsWrapper: {
        borderTopWidth: 1,
        borderTopColor: AppTheme.color.line,
        paddingVertical: 10,
    },
    suggestedQuestions: {
        paddingHorizontal: 16,
    },
    questionButton: {
        borderWidth: 1,
        borderColor: AppTheme.color.lineStrong,
        borderRadius: AppTheme.radius.pill,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        backgroundColor: AppTheme.color.surface,
    },
    questionText: {
        color: AppTheme.color.text,
        fontWeight: '700',
        fontSize: 14,
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: AppTheme.color.surface,
        paddingBottom: 96,
        borderTopWidth: 1,
        borderTopColor: AppTheme.color.line,
    },
    textInput: {
        flex: 1,
        minHeight: 45,
        maxHeight: 120,
        backgroundColor: AppTheme.color.surfaceMuted,
        borderRadius: 25,
        padding: 10,
        paddingHorizontal: 18,
        fontSize: 16,
        marginRight: 10,
        borderWidth: 1,
        borderColor: AppTheme.color.line,
        color: AppTheme.color.text,
        fontWeight: '700',
    },
    sendButton: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
