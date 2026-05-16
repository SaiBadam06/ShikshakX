import React, { useMemo, useState, useRef, useEffect } from 'react';
import { addDoc, collection, limitToLast, onSnapshot, orderBy, query, writeBatch, doc } from 'firebase/firestore';
import type { ChatMessage, ChatSession, PlanTask } from '../types';
import { apiClient } from '../services/apiClient';
import { generateAiTutorResponse } from '../services/geminiService';
import { db } from '../services/firebase';
import { createCalendarEvent } from '../services/calendarClient';
import { PaperAirplaneIcon, BeakerIcon, AcademicCapIcon, ArrowPathIcon, BookmarkSquareIcon, CalendarDaysIcon, CheckIcon, ClockIcon, RocketLaunchIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import type { User } from 'firebase/auth';
import ReactMarkdown from 'react-markdown';
import { toast } from '../components/Toast';
import { toDate } from '../utils/date';
import { useNavigate } from 'react-router-dom';

interface QAProps {
  user: User;
}

type ChatMode = 'rag' | 'ai_tutor';

const buildWelcomeMessage = (mode: ChatMode, scope: string): ChatMessage => ({
  id: `welcome-${mode}-${scope}`,
  text: mode === 'rag'
    ? `Hello! I'm ready to help with source-grounded answers. Ask about your selected scope and I’ll answer using ${scope === 'Web' ? 'web references with visible sources' : 'your materials and notes'}.`
    : "Hello! I'm your AI tutor. Ask for explanations, revision help, or even a study plan and I'll guide you through it.",
  sender: 'bot',
  mode,
  scope,
  canSaveToNotes: false,
});

const isPlanRequest = (prompt: string, mode: ChatMode) =>
  mode === 'ai_tutor' &&
  /\b(plan|roadmap|study plan|learning path)\b/i.test(prompt) &&
  /\b(learn|study|prepare|revise|master|build)\b/i.test(prompt);

const isCalendarFollowUpRequest = (prompt: string) =>
  /\b(add|save|put|schedule|sync)\b/i.test(prompt) &&
  /\b(calendar|calender)\b/i.test(prompt);

const isSaveToNotesFollowUpRequest = (prompt: string) =>
  /\b(save|store|keep|add)\b/i.test(prompt) &&
  /\b(notes?|notebook)\b/i.test(prompt);

const isQuizFollowUpRequest = (prompt: string) =>
  /\b(generate|create|make|turn|use|take)\b/i.test(prompt) &&
  /\b(quiz|mcq|test|assessment|questions?)\b/i.test(prompt);

const extractDurationDays = (prompt: string) => {
  const dayMatch = prompt.match(/(\d+)\s*day/i);
  if (dayMatch) {
    return Math.max(1, Math.min(60, Number(dayMatch[1])));
  }

  const weekMatch = prompt.match(/(\d+)\s*week/i);
  if (weekMatch) {
    return Math.max(7, Math.min(84, Number(weekMatch[1]) * 7));
  }

  const monthMatch = prompt.match(/(\d+)\s*month/i);
  if (monthMatch) {
    return Math.max(30, Math.min(90, Number(monthMatch[1]) * 30));
  }

  return 7;
};

const extractPlanTopic = (prompt: string) => {
  const cleaned = prompt
    .replace(/\b(generate|create|make|build|give me|prepare|help me with)\b/gi, '')
    .replace(/\b(a|an|my)\b/gi, '')
    .replace(/\b(study plan|learning path|roadmap|plan)\b/gi, '')
    .replace(/\bfor\s+\d+\s*(day|days|week|weeks|month|months)\b/gi, '')
    .replace(/\bfrom scratch\b/gi, '')
    .replace(/\bto learn\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || prompt.trim();
};

const formatPlanMessage = (topic: string, duration: number, planTasks: PlanTask[]) => {
  const groupedPlan = planTasks.reduce<Record<number, PlanTask[]>>((accumulator, task) => {
    if (!accumulator[task.day]) {
      accumulator[task.day] = [];
    }
    accumulator[task.day].push(task);
    return accumulator;
  }, {});

  const body = Object.entries(groupedPlan)
    .map(([day, tasks]) => {
      const taskLines = tasks.map((task) => `- **${task.title}** (${task.duration})\n  ${task.description}`).join('\n');
      return `### Day ${day}\n${taskLines}`;
    })
    .join('\n\n');

  return `## Beginner Study Plan for ${topic}\n\nHere is a ${duration}-day roadmap built from scratch.\n\n${body}\n\nWould you like me to add this full plan to your Google Calendar?`;
};

const buildNoteTitle = (question: string) =>
  question.trim().length > 64 ? `${question.trim().slice(0, 61)}...` : question.trim();

const buildSessionTitle = (question: string) => {
  const cleaned = question.trim().replace(/\s+/g, ' ');
  return cleaned.length > 54 ? `${cleaned.slice(0, 51)}...` : cleaned;
};

const deriveQuizTopic = (message: ChatMessage) => {
  const seed = message.relatedQuestion || message.text.split('\n')[0] || 'Study topic';
  return seed
    .replace(/\b(explain|teach|help me with|can you|please|what is|give me)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'Study topic';
};

const getAutomationOptions = (message: ChatMessage) => {
  const isBotAnswer = message.sender === 'bot';
  const isPlan = Boolean(message.planTasks?.length);
  const canSaveToNotes = Boolean(isBotAnswer && message.canSaveToNotes && message.relatedQuestion);
  const isOperationalMessage = /saved the latest|added the full day-by-day roadmap|could not add this plan|need an answer|ask me to create a plan first/i.test(message.text);

  return {
    canSaveToNotes,
    canAddToCalendar: Boolean(isBotAnswer && isPlan),
    canGenerateQuiz: Boolean(isBotAnswer && canSaveToNotes && !isPlan && !isOperationalMessage),
  };
};

const groupSessionsByDate = (sessions: ChatSession[]) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const lastWeekStart = todayStart - 7 * 24 * 60 * 60 * 1000;

  const groups: Array<{ label: string; sessions: ChatSession[] }> = [
    { label: 'Today', sessions: [] },
    { label: 'Yesterday', sessions: [] },
    { label: 'Previous 7 Days', sessions: [] },
    { label: 'Older', sessions: [] },
  ];

  sessions.forEach((session) => {
    const updatedAt = session.updatedAt ? toDate(session.updatedAt).getTime() : 0;

    if (updatedAt >= todayStart) {
      groups[0].sessions.push(session);
    } else if (updatedAt >= yesterdayStart) {
      groups[1].sessions.push(session);
    } else if (updatedAt >= lastWeekStart) {
      groups[2].sessions.push(session);
    } else {
      groups[3].sessions.push(session);
    }
  });

  return groups.filter((group) => group.sessions.length > 0);
};

const ChatBubble: React.FC<{
  message: ChatMessage;
  onSaveToNotes?: () => void;
  onDismissSavePrompt?: () => void;
  onAddPlanToCalendar?: () => void;
  onDismissPlanPrompt?: () => void;
  onUseForQuiz?: () => void;
  onDismissQuizPrompt?: () => void;
  isSavingToNotes?: boolean;
  isSavingPlan?: boolean;
  isSavedToNotes?: boolean;
  isPlanSaved?: boolean;
  isQuizPromptUsed?: boolean;
  showSavePrompt?: boolean;
  showPlanPrompt?: boolean;
  showQuizPrompt?: boolean;
}> = ({
  message,
  onSaveToNotes,
  onDismissSavePrompt,
  onAddPlanToCalendar,
  onDismissPlanPrompt,
  onUseForQuiz,
  onDismissQuizPrompt,
  isSavingToNotes = false,
  isSavingPlan = false,
  isSavedToNotes = false,
  isPlanSaved = false,
  isQuizPromptUsed = false,
  showSavePrompt = false,
  showPlanPrompt = false,
  showQuizPrompt = false,
}) => {
  const isUser = message.sender === 'user';
  const suggestedActions = [
    showSavePrompt || isSavedToNotes ? 'Save to Notes' : null,
    showPlanPrompt || isPlanSaved ? 'Add to Calendar' : null,
    showQuizPrompt || isQuizPromptUsed ? 'Turn into Quiz' : null,
  ].filter(Boolean);
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser &&
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm">
          AI
        </div>
      }
      <div className={`max-w-xl p-4 rounded-2xl shadow-sm ${isUser ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700'}`}>
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.text}</p>
        ) : (
          <div className="text-sm leading-relaxed ai-markdown max-w-none">
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        )}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
            <h4 className="text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">SOURCES:</h4>
            <ul className="text-xs space-y-1">
              {message.sources.map((source, index) => (
                <li key={index}>
                  <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!isUser && suggestedActions.length > 0 && (
          <div className="mt-4 rounded-[1rem] border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
            <p className="font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Suggested next steps</p>
            <p className="mt-2">
              {suggestedActions.join(' • ')}
            </p>
          </div>
        )}
        {!isUser && showSavePrompt && (
          <div className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Save this question and answer to Notes?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={onSaveToNotes} disabled={isSavingToNotes || isSavedToNotes} className="app-button-secondary px-4 py-2 text-xs">
                {isSavedToNotes ? <><CheckIcon className="h-4 w-4" />Saved</> : isSavingToNotes ? 'Saving...' : <><BookmarkSquareIcon className="h-4 w-4" />Save to Notes</>}
              </button>
              {!isSavedToNotes && (
                <button onClick={onDismissSavePrompt} disabled={isSavingToNotes} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100">
                  Not now
                </button>
              )}
            </div>
          </div>
        )}
        {!isUser && showPlanPrompt && (
          <div className="mt-4 rounded-[1rem] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <p className="font-semibold text-blue-900">Add this generated plan to Google Calendar?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={onAddPlanToCalendar} disabled={isSavingPlan || isPlanSaved} className="app-button-primary px-4 py-2 text-xs">
                {isPlanSaved ? <><CheckIcon className="h-4 w-4" />Plan Saved</> : isSavingPlan ? 'Adding plan...' : <><CalendarDaysIcon className="h-4 w-4" />Add Full Plan</>}
              </button>
              {!isPlanSaved && (
                <button onClick={onDismissPlanPrompt} disabled={isSavingPlan} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100">
                  Not now
                </button>
              )}
            </div>
          </div>
        )}
        {!isUser && showQuizPrompt && (
          <div className="mt-4 rounded-[1rem] border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
            <p className="font-semibold text-violet-900">Use this discussion as the topic for a fresh quiz?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={onUseForQuiz} disabled={isQuizPromptUsed} className="rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300">
                {isQuizPromptUsed ? <><CheckIcon className="h-4 w-4" />Ready in Assessments</> : <><RocketLaunchIcon className="h-4 w-4" />Generate Quiz</>}
              </button>
              {!isQuizPromptUsed && (
                <button onClick={onDismissQuizPrompt} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100">
                  Not now
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const QA: React.FC<QAProps> = ({ user }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ChatMode>('rag');
  const [messages, setMessages] = useState<ChatMessage[]>([buildWelcomeMessage('rag', 'Course')]);
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isDraftSession, setIsDraftSession] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scope, setScope] = useState('Course');
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [savingNoteMessageId, setSavingNoteMessageId] = useState<string | null>(null);
  const [savedToNotesIds, setSavedToNotesIds] = useState<Set<string>>(new Set());
  const [dismissedSavePromptIds, setDismissedSavePromptIds] = useState<Set<string>>(new Set());
  const [savingPlanMessageId, setSavingPlanMessageId] = useState<string | null>(null);
  const [savedPlanIds, setSavedPlanIds] = useState<Set<string>>(new Set());
  const [dismissedPlanPromptIds, setDismissedPlanPromptIds] = useState<Set<string>>(new Set());
  const [usedQuizPromptIds, setUsedQuizPromptIds] = useState<Set<string>>(new Set());
  const [dismissedQuizPromptIds, setDismissedQuizPromptIds] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const currentSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId],
  );
  const sessionGroups = useMemo(() => groupSessionsByDate(sessions), [sessions]);

  const modeCopy = useMemo(() => {
    if (mode === 'rag') {
      return {
        title: scope === 'Web' ? 'Ask web-grounded questions with visible sources.' : 'Ask grounded questions from your learning materials.',
        description: scope === 'Web'
          ? 'Use Web mode when you want cited public references. The answer will show the resources it used.'
          : `Use RAG chat when you want answers based on ${scope === 'My Notes' ? 'your notes' : 'your materials and notes'}.`,
        history: 'This conversation history is saved for the current RAG scope, and each answer can be saved to Notes or turned into a quiz topic.',
      };
    }

    return {
      title: 'Ask the AI tutor for explanations, plans, and study help.',
      description: 'Use AI Tutor when you want broader academic guidance, step-by-step explanations, or a generated study roadmap.',
      history: 'AI Tutor history is saved automatically, and plan answers can be added to Google Calendar while useful responses can go straight to Notes.',
    };
  }, [mode, scope]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let isMounted = true;

    const historyQuery = query(
      collection(db, 'users', user.uid, 'chatHistory'),
      orderBy('createdAt', 'asc'),
      limitToLast(200),
    );

    setIsHistoryLoading(true);

    const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
      if (!isMounted) {
        return;
      }

      const loadedMessages = snapshot.docs
        .map((docSnapshot) => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            text: data.text || '',
            sender: data.sender || 'bot',
            sources: Array.isArray(data.sources) ? data.sources : [],
            createdAt: data.createdAt ? toDate(data.createdAt) : undefined,
            mode: data.mode || 'rag',
            scope: data.scope || 'Course',
            relatedQuestion: data.relatedQuestion || '',
            canSaveToNotes: Boolean(data.canSaveToNotes),
            planTasks: Array.isArray(data.planTasks) ? data.planTasks : [],
            sessionId: data.sessionId || '',
            sessionTitle: data.sessionTitle || '',
          } as ChatMessage;
        })
        .filter((message) => message.mode === mode && (mode === 'ai_tutor' || message.scope === scope));

      setHistoryMessages(loadedMessages);

      const groupedMessages = new Map<string, ChatMessage[]>();
      loadedMessages.forEach((message) => {
        const fallbackLegacyId = `legacy-${mode}-${mode === 'rag' ? scope : 'ai_tutor'}`;
        const sessionId = message.sessionId || fallbackLegacyId;
        const nextMessages = groupedMessages.get(sessionId) || [];
        nextMessages.push(message);
        groupedMessages.set(sessionId, nextMessages);
      });

      const nextSessions = Array.from(groupedMessages.entries())
        .map(([sessionId, sessionMessages]) => {
          const firstUserPrompt = sessionMessages.find((message) => message.sender === 'user' && message.text.trim());
          const lastMessage = sessionMessages[sessionMessages.length - 1];

          return {
            id: sessionId,
            title: sessionMessages[0]?.sessionTitle || firstUserPrompt?.sessionTitle || buildSessionTitle(firstUserPrompt?.text || 'Earlier conversation'),
            mode,
            scope: mode === 'rag' ? scope : 'AI Tutor',
            updatedAt: lastMessage?.createdAt,
            preview: lastMessage?.text || 'Conversation ready',
          } as ChatSession;
        })
        .sort((left, right) => {
          const leftTime = left.updatedAt ? toDate(left.updatedAt).getTime() : 0;
          const rightTime = right.updatedAt ? toDate(right.updatedAt).getTime() : 0;
          return rightTime - leftTime;
        });

      setSessions(nextSessions);

      if (activeSessionId && groupedMessages.has(activeSessionId)) {
        setMessages(groupedMessages.get(activeSessionId) || [buildWelcomeMessage(mode, scope)]);
      } else if (!isDraftSession && nextSessions.length > 0) {
        const fallbackSessionId = nextSessions[0].id;
        setActiveSessionId(fallbackSessionId);
        setMessages(groupedMessages.get(fallbackSessionId) || [buildWelcomeMessage(mode, scope)]);
      } else if (!activeSessionId) {
        setMessages([buildWelcomeMessage(mode, scope)]);
      }

      setIsHistoryLoading(false);
    }, (error) => {
      console.error('Failed to load Q&A history:', error);
      if (isMounted) {
        setHistoryMessages([]);
        setSessions([]);
        setMessages([buildWelcomeMessage(mode, scope)]);
        setIsHistoryLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [activeSessionId, isDraftSession, mode, scope, user.uid]);

  const persistMessage = async (
    message: ChatMessage,
    selectedMode: ChatMode,
    selectedScope: string,
    sessionId: string,
    sessionTitle: string,
  ) => {
    await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
      text: message.text,
      sender: message.sender,
      sources: message.sources || [],
      createdAt: new Date(),
      mode: selectedMode,
      scope: selectedMode === 'rag' ? selectedScope : 'AI Tutor',
      relatedQuestion: message.relatedQuestion || '',
      canSaveToNotes: Boolean(message.canSaveToNotes),
      planTasks: message.planTasks || [],
      sessionId,
      sessionTitle,
    });
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setIsDraftSession(true);
    setInput('');
    setMessages([buildWelcomeMessage(mode, scope)]);
  };

  const openSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsDraftSession(false);
    const sessionMessages = historyMessages.filter((message) => (message.sessionId || `legacy-${mode}-${mode === 'rag' ? scope : 'ai_tutor'}`) === sessionId);
    setMessages(sessionMessages.length ? sessionMessages : [buildWelcomeMessage(mode, scope)]);
  };

  const deleteSession = async (sessionId: string) => {
    const sessionMessages = historyMessages.filter((message) => (message.sessionId || `legacy-${mode}-${mode === 'rag' ? scope : 'ai_tutor'}`) === sessionId);
    if (!sessionMessages.length) {
      return;
    }

    if (!window.confirm('Delete this chat session and all of its saved messages?')) {
      return;
    }

    try {
      const batch = writeBatch(db);
      sessionMessages.forEach((message) => {
        batch.delete(doc(db, 'users', user.uid, 'chatHistory', message.id));
      });
      await batch.commit();

      if (activeSessionId === sessionId) {
        startNewChat();
      }

      toast.success('Chat session deleted.');
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      toast.error('Could not delete that chat session.');
    }
  };

  const saveAnswerToNotes = async (message: ChatMessage) => {
    if (!message.relatedQuestion) {
      return false;
    }

    if (savedToNotesIds.has(message.id)) {
      toast.info('This answer is already in your Notes.');
      return true;
    }

    setSavingNoteMessageId(message.id);
    try {
      const noteContent = [
        `Question:\n${message.relatedQuestion}`,
        `Answer:\n${message.text}`,
        message.sources?.length
          ? `Sources:\n${message.sources.map((source, index) => `${index + 1}. ${source.title} - ${source.uri}`).join('\n')}`
          : '',
      ].filter(Boolean).join('\n\n');

      await addDoc(collection(db, 'users', user.uid, 'notes'), {
        title: `Q&A - ${buildNoteTitle(message.relatedQuestion)}`,
        content: noteContent,
        createdAt: new Date(),
        audioUrl: '',
      });

      setSavedToNotesIds((current) => new Set(current).add(message.id));
      toast.success('Saved this answer to Notes.');
      return true;
    } catch (error) {
      console.error('Failed to save answer to notes:', error);
      toast.error('Could not save this answer to Notes.');
      return false;
    } finally {
      setSavingNoteMessageId(null);
    }
  };

  const addPlanToCalendar = async (message: ChatMessage) => {
    if (!message.planTasks?.length) {
      return false;
    }

    if (savedPlanIds.has(message.id)) {
      toast.info('This plan is already in your Google Calendar.');
      return true;
    }

    setSavingPlanMessageId(message.id);
    try {
      for (const task of message.planTasks) {
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + task.day - 1);
        eventDate.setHours(9, 0, 0, 0);

        await createCalendarEvent({
          title: task.title,
          description: task.description,
          dueDate: eventDate,
        });
      }

      setSavedPlanIds((current) => new Set(current).add(message.id));
      toast.success('The generated plan was added to Google Calendar.');
      return true;
    } catch (error) {
      console.error('Failed to add generated plan to calendar:', error);
      toast.error('Could not add this plan to Google Calendar.');
      return false;
    } finally {
      setSavingPlanMessageId(null);
    }
  };

  const useMessageForQuiz = (message: ChatMessage) => {
    const quizTopic = deriveQuizTopic(message);
    localStorage.setItem('shikshakx-quiz-topic', quizTopic);
    setUsedQuizPromptIds((current) => new Set(current).add(message.id));
    toast.success('Quiz topic prepared. Opening Assessments.');
    navigate('/assessments');
  };

  const findLatestPlanMessage = () =>
    [...messages].reverse().find((message) => message.sender === 'bot' && message.planTasks?.length);

  const findLatestSavableAnswer = () =>
    [...messages].reverse().find((message) => message.sender === 'bot' && message.relatedQuestion && message.canSaveToNotes);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const prompt = input.trim();
    const sessionId = activeSessionId || globalThis.crypto?.randomUUID?.() || `session-${Date.now()}`;
    const sessionTitle = currentSession?.title || buildSessionTitle(prompt);

    if (!activeSessionId) {
      setActiveSessionId(sessionId);
    }
    setIsDraftSession(false);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: prompt,
      sender: 'user',
      mode,
      scope: mode === 'rag' ? scope : 'AI Tutor',
      createdAt: new Date(),
      canSaveToNotes: false,
      sessionId,
      sessionTitle,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    void persistMessage(userMessage, mode, scope, sessionId, sessionTitle).catch((error) => {
      console.error('Failed to store chat history for user message:', error);
    });

    try {
      let botMessage: ChatMessage;

      if (isPlanRequest(prompt, mode)) {
        const duration = extractDurationDays(prompt);
        const topic = extractPlanTopic(prompt);
        const planTasks = await apiClient.generatePlan(topic, duration, prompt);
        botMessage = {
          id: (Date.now() + 1).toString(),
          text: formatPlanMessage(topic, duration, planTasks),
          sender: 'bot',
          sources: [],
          relatedQuestion: prompt,
          canSaveToNotes: true,
          planTasks,
          mode,
          scope: 'AI Tutor',
          createdAt: new Date(),
          sessionId,
          sessionTitle,
        };
      } else if (isCalendarFollowUpRequest(prompt)) {
        const latestPlanMessage = findLatestPlanMessage();

        if (latestPlanMessage?.planTasks?.length) {
          const wasAdded = await addPlanToCalendar(latestPlanMessage);
          botMessage = {
            id: (Date.now() + 1).toString(),
            text: wasAdded
              ? 'I found the latest generated study plan in this chat and added the full day-by-day roadmap to your Google Calendar.'
              : 'I found the latest generated study plan, but adding it to Google Calendar did not complete. Please reconnect Google Calendar and try again.',
            sender: 'bot',
            sources: [],
            relatedQuestion: prompt,
            canSaveToNotes: false,
            mode,
            scope: mode === 'rag' ? scope : 'AI Tutor',
            createdAt: new Date(),
            sessionId,
            sessionTitle,
          };
        } else {
          botMessage = {
            id: (Date.now() + 1).toString(),
            text: 'I can add a generated study plan to your Google Calendar once a plan exists in this conversation. Ask me to create a plan first, then I can save it for you.',
            sender: 'bot',
            sources: [],
            relatedQuestion: prompt,
            canSaveToNotes: false,
            mode,
            scope: mode === 'rag' ? scope : 'AI Tutor',
            createdAt: new Date(),
            sessionId,
            sessionTitle,
          };
        }
      } else if (isSaveToNotesFollowUpRequest(prompt)) {
        const latestAnswerMessage = findLatestSavableAnswer();

        if (latestAnswerMessage?.relatedQuestion) {
          const wasSaved = await saveAnswerToNotes(latestAnswerMessage);
          botMessage = {
            id: (Date.now() + 1).toString(),
            text: wasSaved
              ? 'I saved the latest question and answer from this chat to your Notes area.'
              : 'I found the latest answer, but saving it to Notes did not complete. Please try again.',
            sender: 'bot',
            sources: [],
            relatedQuestion: prompt,
            canSaveToNotes: false,
            mode,
            scope: mode === 'rag' ? scope : 'AI Tutor',
            createdAt: new Date(),
            sessionId,
            sessionTitle,
          };
        } else {
          botMessage = {
            id: (Date.now() + 1).toString(),
            text: 'There is no saved AI answer in this conversation yet. Ask a question first, and then I can store that answer in Notes for you.',
            sender: 'bot',
            sources: [],
            relatedQuestion: prompt,
            canSaveToNotes: false,
            mode,
            scope: mode === 'rag' ? scope : 'AI Tutor',
            createdAt: new Date(),
            sessionId,
            sessionTitle,
          };
        }
      } else if (isQuizFollowUpRequest(prompt)) {
        const latestAnswerMessage = findLatestSavableAnswer();

        if (latestAnswerMessage) {
          useMessageForQuiz(latestAnswerMessage);
          botMessage = {
            id: (Date.now() + 1).toString(),
            text: `I prepared a quiz topic from our latest discussion and opened Assessments with **${deriveQuizTopic(latestAnswerMessage)}** ready to go.`,
            sender: 'bot',
            sources: [],
            relatedQuestion: prompt,
            canSaveToNotes: false,
            mode,
            scope: mode === 'rag' ? scope : 'AI Tutor',
            createdAt: new Date(),
            sessionId,
            sessionTitle,
          };
        } else {
          botMessage = {
            id: (Date.now() + 1).toString(),
            text: 'I need an answer or explanation in the chat first before I can turn it into a quiz topic for you.',
            sender: 'bot',
            sources: [],
            relatedQuestion: prompt,
            canSaveToNotes: false,
            mode,
            scope: mode === 'rag' ? scope : 'AI Tutor',
            createdAt: new Date(),
            sessionId,
            sessionTitle,
          };
        }
      } else if (mode === 'rag') {
        const botResponse = await apiClient.ragChat(prompt, scope, user);
        botMessage = {
          id: (Date.now() + 1).toString(),
          text: botResponse.text,
          sender: 'bot',
          sources: botResponse.sources,
          relatedQuestion: prompt,
          canSaveToNotes: true,
          mode,
          scope,
          createdAt: new Date(),
          sessionId,
          sessionTitle,
        };
      } else {
        const history = messages.map(m => ({
          role: m.sender as 'user' | 'bot',
          parts: [{ text: m.text }]
        }));
        const responseText = await generateAiTutorResponse(prompt, history);
        botMessage = {
          id: (Date.now() + 1).toString(),
          text: responseText,
          sender: 'bot',
          sources: [],
          relatedQuestion: prompt,
          canSaveToNotes: true,
          mode,
          scope: 'AI Tutor',
          createdAt: new Date(),
          sessionId,
          sessionTitle,
        };
      }

      setMessages(prev => [...prev, botMessage]);
      void persistMessage(botMessage, mode, scope, sessionId, sessionTitle).catch((error) => {
        console.error('Failed to store chat history for bot message:', error);
      });
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, something went wrong. Please try again.',
        sender: 'bot',
        canSaveToNotes: false,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-panel-strong flex h-full min-h-[44rem] flex-col overflow-hidden rounded-[2rem] lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-blue-200/30 bg-[linear-gradient(180deg,#12254d_0%,#102349_48%,#163064_100%)] text-slate-100 lg:w-[19rem] lg:border-b-0 lg:border-r lg:border-blue-200/20">
        <div className="border-b border-white/10 p-4">
          <button
            type="button"
            onClick={startNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-[1rem] border border-white/15 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:border-blue-300/60 hover:bg-white/12"
          >
            <PlusIcon className="h-4 w-4" />
            New chat
          </button>
          <div className="mt-4 flex space-x-1 rounded-2xl bg-white/8 p-1 backdrop-blur-sm">
            <button onClick={() => setMode('rag')} className={`w-full rounded-[1rem] py-2.5 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${mode === 'rag' ? 'bg-blue-500 text-white shadow-sm' : 'text-blue-50/85 hover:bg-white/10'}`}>
              <BeakerIcon className="h-5 w-5" />RAG
            </button>
            <button onClick={() => setMode('ai_tutor')} className={`w-full rounded-[1rem] py-2.5 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${mode === 'ai_tutor' ? 'bg-blue-500 text-white shadow-sm' : 'text-blue-50/85 hover:bg-white/10'}`}>
              <AcademicCapIcon className="h-5 w-5" />Tutor
            </button>
          </div>
          {mode === 'rag' && (
            <select value={scope} onChange={e => setScope(e.target.value)} className="mt-4 w-full rounded-[1rem] border border-white/15 bg-white/8 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-300/60 focus:outline-none">
              <option value="Course">All Materials</option>
              <option>My Notes</option>
              <option>Web</option>
            </select>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="space-y-5">
            <div>
              <p className="px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-100/55">Current</p>
              <button
                type="button"
                onClick={startNewChat}
                className={`mt-2 w-full rounded-[1rem] px-3 py-3 text-left transition ${
                  isDraftSession
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-blue-50/85 hover:bg-white/10'
                }`}
              >
                <p className="truncate text-sm font-semibold">New chat</p>
                <p className={`mt-1 text-xs ${isDraftSession ? 'text-blue-100' : 'text-blue-100/55'}`}>Fresh thread</p>
              </button>
            </div>

            {isHistoryLoading ? (
              <div className="rounded-[1rem] bg-white/8 px-3 py-4 text-sm text-blue-100/65">
                Loading saved conversations...
              </div>
            ) : sessionGroups.length > 0 ? (
              sessionGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-100/55">{group.label}</p>
                  <div className="mt-2 space-y-1.5">
                    {group.sessions.map((session) => (
                      <div key={session.id} className="group flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => openSession(session.id)}
                          className={`min-w-0 flex-1 rounded-[1rem] px-3 py-3 text-left transition ${
                            activeSessionId === session.id && !isDraftSession
                              ? 'bg-blue-500 text-white shadow-sm'
                              : 'text-blue-50/85 hover:bg-white/10'
                          }`}
                        >
                          <p className="truncate text-sm font-semibold">{session.title}</p>
                          <p className={`mt-1 line-clamp-2 text-xs ${
                            activeSessionId === session.id && !isDraftSession ? 'text-blue-100' : 'text-blue-100/55'
                          }`}>
                            {session.preview}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteSession(session.id)}
                          className="mt-2 rounded-full p-2 text-blue-100/45 opacity-0 transition hover:bg-white/10 hover:text-red-300 group-hover:opacity-100"
                          title="Delete chat session"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] bg-white/8 px-3 py-4 text-sm text-blue-100/65">
                No saved chats yet. Start one and it will appear here.
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="hero-gradient border-b border-slate-200/80 p-6">
          <div className="page-eyebrow mb-4">
            <AcademicCapIcon className="h-4 w-4" />
            {mode === 'rag' ? `RAG chat${scope === 'Web' ? ' / web' : ''}` : 'AI tutor'}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">{modeCopy.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {modeCopy.description}
          </p>
          <div className="mt-3 rounded-[1rem] bg-white/70 px-4 py-3 text-sm text-slate-600">
            {modeCopy.history}
            {currentSession && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                Active session: {currentSession.title}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/75 p-4 md:p-6">
          {!isHistoryLoading && messages.map((msg) => {
            const automationOptions = getAutomationOptions(msg);

            return (
              <ChatBubble
                key={msg.id}
                message={msg}
                showSavePrompt={Boolean(automationOptions.canSaveToNotes && !dismissedSavePromptIds.has(msg.id))}
                showPlanPrompt={Boolean(automationOptions.canAddToCalendar && !dismissedPlanPromptIds.has(msg.id))}
                showQuizPrompt={Boolean(automationOptions.canGenerateQuiz && !dismissedQuizPromptIds.has(msg.id))}
                onSaveToNotes={() => void saveAnswerToNotes(msg)}
                onDismissSavePrompt={() => setDismissedSavePromptIds((current) => new Set(current).add(msg.id))}
                onAddPlanToCalendar={() => void addPlanToCalendar(msg)}
                onDismissPlanPrompt={() => setDismissedPlanPromptIds((current) => new Set(current).add(msg.id))}
                onUseForQuiz={() => useMessageForQuiz(msg)}
                onDismissQuizPrompt={() => setDismissedQuizPromptIds((current) => new Set(current).add(msg.id))}
                isSavingToNotes={savingNoteMessageId === msg.id}
                isSavingPlan={savingPlanMessageId === msg.id}
                isSavedToNotes={savedToNotesIds.has(msg.id)}
                isPlanSaved={savedPlanIds.has(msg.id)}
                isQuizPromptUsed={usedQuizPromptIds.has(msg.id)}
              />
            );
          })}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0" />
              <div className="max-w-xl p-4 rounded-2xl bg-white dark:bg-slate-700 shadow-sm">
                <div className="flex items-center space-x-1">
                  <span className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="border-t border-slate-200/80 bg-white/88 p-4 backdrop-blur-xl">
          <div className="rounded-[1.7rem] border border-slate-200/80 bg-white/92 p-3 shadow-[0_20px_55px_rgba(15,23,42,0.08)] transition duration-200 focus-within:-translate-y-0.5 focus-within:border-blue-300/80 focus-within:shadow-[0_26px_65px_rgba(37,99,235,0.14)] dark:border-slate-700 dark:bg-slate-900/80">
            <div className="mb-3 flex flex-col gap-3 border-b border-slate-200/70 pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
                  {mode === 'rag' ? 'RAG Chat' : 'AI Tutor'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {mode === 'rag'
                    ? 'Ask using your materials and notes'
                    : 'Ask for broader academic guidance'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 rounded-[1.3rem] border border-slate-200/80 bg-slate-50/90 px-4 py-3 shadow-inner dark:border-slate-700 dark:bg-slate-950/60">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={mode === 'rag' ? 'Ask about your materials, notes, or uploaded sources...' : 'Ask the AI Tutor anything about studying, concepts, or revision...'}
                  className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
              <button
                type="button"
                onClick={startNewChat}
                className="app-button-secondary h-[3.4rem] rounded-[1.2rem] px-4 text-sm"
                title="Start a new chat"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="app-button-primary h-[3.4rem] min-w-[3.4rem] rounded-[1.2rem] px-5 text-sm"
                title="Send message"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QA;
