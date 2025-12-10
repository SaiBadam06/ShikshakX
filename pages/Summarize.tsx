import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient } from '../services/apiClient';
import type { Material } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { DocumentTextIcon, VideoCameraIcon, LinkIcon, Bars3BottomLeftIcon, ListBulletIcon, RectangleStackIcon } from '@heroicons/react/24/solid';
import type { User } from 'firebase/auth';

interface SummarizeProps {
  user: User;
}

const loadingTexts = [
  "Analyzing documents...",
  "Identifying key concepts...",
  "Synthesizing main ideas...",
  "Formatting the output...",
  "Almost there...",
];

const SummaryDisplay: React.FC<{ summary: string; format: 'paragraph' | 'bullets' | 'flashcards' }> = ({ summary, format }) => {
  const formattedSummary = useMemo(() => {
    if (format === 'flashcards') {
        return summary.split('---').map((card, index) => {
            const [term, definition] = card.split('///');
            if (!definition) return null;
            return (
                <div key={index} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg mb-4 shadow-sm">
                    <p className="font-bold text-slate-800 dark:text-slate-200">{term.trim()}</p>
                    <p className="mt-2 text-slate-600 dark:text-slate-300">{definition.trim()}</p>
                </div>
            );
        });
    }

    return summary.split('\n').map((line, index) => {
      line = line.trim();
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-bold text-slate-800 dark:text-white mt-4 mb-2">{line.substring(4)}</h3>;
      }
      if (line.startsWith('*   ')) {
        return <li key={index} className="ml-5 list-disc">{line.substring(4)}</li>;
      }
      if (line === '') {
        return <br key={index} />;
      }
      return <p key={index} className="mb-4">{line}</p>;
    });
  }, [summary, format]);

  return <div className="prose prose-slate dark:prose-invert max-w-none">{formattedSummary}</div>;
};


const Summarize: React.FC<SummarizeProps> = ({ user }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentLoadingText, setCurrentLoadingText] = useState(loadingTexts[0]);
  const [summaryFormat, setSummaryFormat] = useState<'paragraph' | 'bullets' | 'flashcards'>('paragraph');
  const summaryRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const fetchMaterials = async () => {
      const materialsCollection = collection(db, 'users', user.uid, 'materials');
      const querySnapshot = await getDocs(materialsCollection);
      const materialsData = querySnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data()))) as Material[];
      setMaterials(materialsData);
    };
    fetchMaterials();
  }, [user.uid]);
  
  useEffect(() => {
    // FIX: Refactored to use standard React effect cleanup pattern.
    // This resolves the `NodeJS.Timeout` type error by using the browser's `setInterval`
    // return type and prevents potential runtime errors with uninitialized interval IDs.
    if (isLoading) {
      const interval = setInterval(() => {
        setCurrentLoadingText(prev => {
          const currentIndex = loadingTexts.indexOf(prev);
          return loadingTexts[(currentIndex + 1) % loadingTexts.length];
        });
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);
  
  useEffect(() => {
    if (summary) {
        summaryRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [summary]);

  const handleToggleMaterial = (materialId: string) => {
    setSelectedMaterials(prev =>
      prev.includes(materialId)
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const handleGenerateSummary = async () => {
    if (selectedMaterials.length === 0) {
      setError('Please select at least one material to summarize.');
      return;
    }
    setError('');
    setIsLoading(true);
    setSummary('');
    try {
      const result = await apiClient.summarize(selectedMaterials, summaryFormat, user);
      setSummary(result);
    } catch (err) {
      setError('Failed to generate summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getFileIcon = (type: Material['type']) => {
      switch (type) {
          case 'pdf': return <DocumentTextIcon className="h-5 w-5 text-red-500 flex-shrink-0" />;
          case 'video': return <VideoCameraIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />;
          case 'link': return <LinkIcon className="h-5 w-5 text-green-500 flex-shrink-0" />;
          default: return <DocumentTextIcon className="h-5 w-5 text-slate-500 flex-shrink-0" />;
      }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Summarize Materials</h1>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">1. Select Materials</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-2 border-b dark:border-gray-700 pb-4">
            {materials.map(material => {
              const isSelected = selectedMaterials.includes(material.id);
              return (
                <div 
                  key={material.id} 
                  onClick={() => handleToggleMaterial(material.id)}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                >
                  <input
                    id={`material-${material.id}`}
                    type="checkbox"
                    readOnly
                    checked={isSelected}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                  />
                  <div className="ml-3 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {getFileIcon(material.type)}
                    <span className="truncate" title={material.name}>{material.name}</span>
                  </div>
                </div>
              );
            })}
             {materials.length === 0 && <p className="text-sm text-gray-500 p-3">No materials available. Upload some in the Materials section.</p>}
          </div>
           <h2 className="text-xl font-semibold my-4">2. Choose Format</h2>
            <div className="flex space-x-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                <button onClick={() => setSummaryFormat('paragraph')} className={`w-full py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${summaryFormat === 'paragraph' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}><Bars3BottomLeftIcon className="h-5 w-5"/>Paragraph</button>
                <button onClick={() => setSummaryFormat('bullets')} className={`w-full py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${summaryFormat === 'bullets' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}><ListBulletIcon className="h-5 w-5"/>Bullets</button>
                <button onClick={() => setSummaryFormat('flashcards')} className={`w-full py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${summaryFormat === 'flashcards' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}><RectangleStackIcon className="h-5 w-5"/>Flashcards</button>
            </div>

          <button
            onClick={handleGenerateSummary}
            disabled={isLoading || selectedMaterials.length === 0}
            className="mt-6 w-full px-6 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Summarizing...' : 'Generate Summary'}
          </button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>
      <div className="lg:col-span-2">
        <div ref={summaryRef} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md min-h-[30rem] relative">
          <h2 className="text-2xl font-bold mb-4">Generated Summary</h2>
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex flex-col items-center justify-center rounded-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="mt-4 font-semibold text-slate-600 dark:text-slate-300">{currentLoadingText}</p>
            </div>
          )}
          {summary && <SummaryDisplay summary={summary} format={summaryFormat}/>}
          {!isLoading && !summary && <p className="text-gray-500">Select materials and choose a format to see the result here.</p>}
        </div>
      </div>
    </div>
  );
};

export default Summarize;