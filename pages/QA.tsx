import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { apiClient } from '../services/apiClient';
import { generateAiTutorResponse } from '../services/geminiService';
import { PaperAirplaneIcon, BeakerIcon, AcademicCapIcon } from '@heroicons/react/24/solid';
import type { User } from 'firebase/auth';
import ReactMarkdown from 'react-markdown';

interface QAProps {
  user: User;
}

type ChatMode = 'rag' | 'ai_tutor';


const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.sender === 'user';
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
      </div>
    </div>
  );
};


const welcomeMessage: ChatMessage = {
  id: 'welcome-message',
  text: "Hello! I'm here to help. You can ask me questions about your course materials using 'RAG Chat', or switch to 'AI Tutor' for general academic help. What would you like to do first?",
  sender: 'bot',
};

const QA: React.FC<QAProps> = ({ user }) => {
  const [mode, setMode] = useState<ChatMode>('rag');
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scope, setScope] = useState('Course');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let botResponse: { text: string; sources?: { title: string; uri: string }[] };
      if (mode === 'rag') {
        botResponse = await apiClient.ragChat(input, scope, user);
      } else {
        const history = messages.map(m => ({
          role: m.sender as 'user' | 'bot',
          parts: [{ text: m.text }]
        }));
        const responseText = await generateAiTutorResponse(input, history);
        botResponse = { text: responseText, sources: [] };
      }

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botResponse.text,
        sender: 'bot',
        sources: botResponse.sources,
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, something went wrong. Please try again.',
        sender: 'bot',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
      <div className="p-4 border-b dark:border-slate-700">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Q & A</h1>
        <div className="mt-4 flex space-x-1 bg-slate-200 dark:bg-slate-900 p-1 rounded-lg">
          <button onClick={() => setMode('rag')} className={`w-full py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${mode === 'rag' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>
            <BeakerIcon className="h-5 w-5" />RAG Chat
          </button>
          <button onClick={() => setMode('ai_tutor')} className={`w-full py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${mode === 'ai_tutor' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>
            <AcademicCapIcon className="h-5 w-5" />AI Tutor
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-6">
        {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
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

      <form onSubmit={handleSendMessage} className="p-4 border-t dark:border-slate-700 flex items-center space-x-4">
        {mode === 'rag' && (
          <select value={scope} onChange={e => setScope(e.target.value)} className="bg-slate-100 border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white">
            <option value="Course">All Materials</option>
            <option>My Notes</option>
            <option>Web</option>
          </select>
        )}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={mode === 'rag' ? 'Ask about your materials...' : 'Ask the AI Tutor anything...'}
          className="flex-1 p-2.5 bg-slate-100 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
        />
        <button type="submit" disabled={isLoading || !input.trim()} className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors">
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
};

export default QA;
