import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase.ts';
import { collection, onSnapshot, query, orderBy, Timestamp, getDocs, addDoc, doc, updateDoc, QuerySnapshot, DocumentData } from 'firebase/firestore';
import type { Material, Course } from '../types';
import { DocumentTextIcon, VideoCameraIcon, LinkIcon, ArrowDownTrayIcon, BeakerIcon, CheckCircleIcon, DocumentIcon, CloudArrowUpIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';
import { apiClient } from '../services/apiClient.ts';
import { toast } from '../components/Toast.tsx';
import type { User } from 'firebase/auth';

interface MaterialsProps {
  user: User;
}

const AddMaterialForm: React.FC<{ user: User; courses: Course[]; onMaterialAdded: () => void }> = ({ user, courses, onMaterialAdded }) => {
    const [sourceType, setSourceType] = useState<'url' | 'text' | 'upload'>('text');
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [content, setContent] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [courseId, setCourseId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (courses.length > 0 && !courseId) {
            setCourseId(courses[0].id);
        } else if (courses.length === 0 && !courseId) {
            setCourseId('general');
        }
    }, [courses, courseId]);
    
    const resetForm = () => {
        setTitle('');
        setUrl('');
        setContent('');
        setFile(null);
        setSourceType('text');
        if (courses.length > 0) {
            setCourseId(courses[0].id);
        } else {
            setCourseId('general');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            if (!title) {
                setTitle(selectedFile.name); // Autofill name with filename only if empty
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (!title.trim() || !courseId) {
                throw new Error("Title and course are required.");
            }
            if (sourceType === 'url' && !url.trim()) {
                throw new Error("URL is required for link materials.");
            }
            if (sourceType === 'text' && !content.trim()) {
                throw new Error("Content is required for text materials.");
            }
            if (sourceType === 'upload' && !file) {
                 throw new Error("A file must be selected for document materials.");
            }

            // Note: File upload to Firebase Storage is not yet implemented
            // For now, document type materials will need a URL to be functional
            const newMaterialData: Omit<Material, 'id'> = {
                name: title,
                courseId,
                type: sourceType === 'upload' ? 'document' : (sourceType === 'url' ? 'link' : 'text'),
                url: sourceType === 'url' ? url : (sourceType === 'upload' ? '#' : ''),
                content: sourceType === 'text' ? content : '',
                createdAt: new Date(),
                aiStatus: 'indexing', // Automatically start indexing
            };
            
            const userMaterialsCollection = collection(db, 'users', user.uid, 'materials');
            const docRef = await addDoc(userMaterialsCollection, newMaterialData);
            toast.success("Material added! Starting AI indexing...");
            
            // This async block runs in the background, allowing the UI to update immediately.
            (async () => {
                try {
                    // Simulate the AI processing delay
                    await apiClient.ingestFile(docRef.id, user);
                    // Update the material to 'ready' status
                    await updateDoc(doc(db, 'users', user.uid, 'materials', docRef.id), { aiStatus: 'ready' });
                    toast.success(`"${newMaterialData.name}" is ready for Q&A!`);
                } catch (ingestionError) {
                    console.error("Error during AI ingestion/status update:", ingestionError);
                    toast.error(`AI indexing failed for "${newMaterialData.name}".`);
                    // On failure, update the status to reflect it's not indexed
                    try {
                        await updateDoc(doc(db, 'users', user.uid, 'materials', docRef.id), { aiStatus: 'not_indexed' });
                    } catch (updateError) {
                        console.error("Failed to update material status to 'not_indexed':", updateError);
                    }
                }
            })();
            
            // Reset the form and close modal immediately
            resetForm();
            onMaterialAdded();

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to add material.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg mb-8">
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">Add Your Material</h2>
            
            <div className="mb-6">
                <label htmlFor="material-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input id="material-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter a title for your material..." className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" required />
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Source Type</label>
                <div className="flex space-x-4">
                    {(['URL', 'Text Note', 'Upload Notes'] as const).map(type => {
                        const value = type === 'URL' ? 'url' : type === 'Text Note' ? 'text' : 'upload';
                        return (
                            <label key={value} className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="sourceType" value={value} checked={sourceType === value} onChange={e => setSourceType(e.target.value as any)} className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"/>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{type}</span>
                            </label>
                        )
                    })}
                </div>
            </div>

            {sourceType === 'url' && (
                <div className="mb-6">
                    <label htmlFor="material-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL</label>
                    <input id="material-url" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" required />
                </div>
            )}
            
            {sourceType === 'text' && (
                <div className="mb-6">
                    <label htmlFor="material-content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Material Content</label>
                    <textarea id="material-content" value={content} onChange={e => setContent(e.target.value)} rows={6} className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="Enter your notes or material content here..."></textarea>
                    <div className="mt-2">
                        <button type="button" onClick={() => toast.info('Highlighting feature coming soon!')} className="px-3 py-1.5 text-sm font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md transition">Add Highlight</button>
                    </div>
                </div>
            )}

            {sourceType === 'upload' && (
                 <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Upload File</label>
                    <input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900"/>
                    {file && <p className="text-xs mt-2 text-slate-500">Selected: {file.name}</p>}
                </div>
            )}
            
            <div className="mb-6">
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Add Images to Notes</label>
                 <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                    <CloudArrowUpIcon className="mx-auto h-10 w-10 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Drag and drop files here</p>
                    <p className="text-xs text-slate-500">Limit 200MB per file - PNG, JPG, JPEG</p>
                    <button type="button" onClick={() => toast.info('Image upload feature coming soon!')} className="mt-4 px-4 py-2 text-sm font-semibold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">Browse files</button>
                 </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Associated Course</label>
                <select value={courseId} onChange={e => setCourseId(e.target.value)} className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" required>
                    <option value="general">General / Uncategorized</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
            </div>
            
            <div className="flex justify-end">
                <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-all shadow-md">
                    {isSubmitting ? 'Adding Material...' : 'Add Material'}
                </button>
            </div>

        </form>
    );
};


// Utility function to handle material downloads
const handleMaterialDownload = (material: Material) => {
    try {
        if (material.type === 'link') {
            // For links, open in new tab
            if (material.url && material.url !== '#') {
                window.open(material.url, '_blank');
            } else {
                toast.error('No valid URL for this material.');
            }
        } else if (material.type === 'text') {
            // For text content, create a blob and download
            const textContent = material.content || '';
            if (!textContent) {
                toast.error('No content to download.');
                return;
            }
            const blob = new Blob([textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${material.name.replace(/\s+/g, '_')}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else if (material.type === 'document' && material.url && material.url !== '#') {
            // For documents, create a temporary link and trigger download
            const a = document.createElement('a');
            a.href = material.url;
            a.download = material.name.includes('.') ? material.name : `${material.name}.pdf`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            toast.error('This document is not yet available for download.');
        }
    } catch (error) {
        console.error('Error downloading material:', error);
        toast.error('Failed to download material. Please try again.');
    }
};

const AIStatusBadge: React.FC<{ status: Material['aiStatus'] }> = ({ status }) => {
  switch (status) {
    case 'ready':
      return (
        <div className="flex items-center text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-300 px-2.5 py-1 rounded-full">
          <CheckCircleIcon className="h-4 w-4 mr-1.5" />
          Ready for Q&A
        </div>
      );
    case 'indexing':
      return (
        <div className="flex items-center text-xs font-medium text-yellow-700 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-300 px-2.5 py-1 rounded-full">
          <svg className="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Indexing...
        </div>
      );
    case 'not_indexed':
    default:
      return (
        <div className="flex items-center text-xs font-medium text-slate-700 bg-slate-100 dark:bg-slate-900/50 dark:text-slate-300 px-2.5 py-1 rounded-full">
          <BeakerIcon className="h-4 w-4 mr-1.5 opacity-60" />
          Not Indexed
        </div>
      );
  }
};

const MaterialsList: React.FC<{ materials: Material[]; courses: Course[] }> = ({ materials, courses }) => {
  const getCourseName = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.title : 'General';
  };

  if (materials.length === 0) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No materials yet</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Get started by adding your first material.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      {materials.map((material) => (
        <div key={material.id} className="group relative bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                  {material.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {getCourseName(material.courseId)}
                </p>
                {material.type === 'text' && material.content && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                    {material.content.substring(0, 150)}{material.content.length > 150 ? '...' : ''}
                  </p>
                )}
              </div>
              <div className="ml-4 flex-shrink-0">
                {material.type === 'link' && <LinkIcon className="h-6 w-6 text-blue-500" />}
                {material.type === 'document' && <DocumentIcon className="h-6 w-6 text-amber-500" />}
                {material.type === 'text' && <DocumentTextIcon className="h-6 w-6 text-emerald-500" />}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {material.createdAt ? material.createdAt.toLocaleDateString() : 'Unknown date'}
              </div>
              <AIStatusBadge status={material.aiStatus} />
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-3 flex justify-between items-center border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => toast.info('View details functionality coming soon!')}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View Details
            </button>
            <div className="flex space-x-2">
              <button
                onClick={() => handleMaterialDownload(material)}
                className="p-2 text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                title="Download"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const Materials: React.FC<MaterialsProps> = ({ user }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [key, setKey] = useState(0); // Used to force re-render/reset of form

  useEffect(() => {
    // Set up materials listener
    const materialsCollection = collection(db, "users", user.uid, "materials");
    const materialsQuery = query(materialsCollection, orderBy("createdAt", "desc"));
    
    const unsubscribeMaterials = onSnapshot(materialsQuery, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const materialsData: Material[] = [];
      querySnapshot.forEach((doc) => {
        try {
          const data = doc.data();
          if (!data.name || !data.createdAt) {
            console.warn(`Skipping malformed material document (ID: ${doc.id}):`, data);
            return;
          }
          materialsData.push({ 
            id: doc.id, 
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate(),
            aiStatus: data.aiStatus || 'not_indexed',
          } as Material);
        } catch (error) {
          console.error(`Error processing material document (ID: ${doc.id}):`, error);
        }
      });
      setMaterials(materialsData);
    });

    // Set up courses listener
    const coursesCollection = collection(db, "users", user.uid, "courses");
    const coursesQuery = query(coursesCollection, orderBy("createdAt", "desc"));
    
    const unsubscribeCourses = onSnapshot(coursesQuery, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const coursesData: Course[] = [];
      querySnapshot.forEach((doc) => {
        try {
          const data = doc.data();
          const courseData: Course = {
            id: doc.id,
            title: data.title || '',
            description: data.description || '',
            instructor: data.instructor || '',
            coverImage: data.coverImage || '',
            url: data.url || '',
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
            updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
          };
          coursesData.push(courseData);
        } catch (error) {
          console.error(`Error processing course document (ID: ${doc.id}):`, error);
        }
      });
      setCourses(coursesData);
    });
    
    // Cleanup function
    return () => {
      unsubscribeMaterials();
      unsubscribeCourses();
    };
  }, [user.uid]);

  return (
    <div className="space-y-8">
      <AddMaterialForm 
        key={key} 
        user={user} 
        courses={courses} 
        onMaterialAdded={() => setKey(prev => prev + 1)} 
      />
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Your Library</h2>
        <MaterialsList materials={materials} courses={courses} />
      </div>
    </div>
  );
};

export default Materials;