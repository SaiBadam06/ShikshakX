import React, { useMemo, useState, useEffect } from 'react';
import { db, storage } from '../services/firebase.ts';
import { collection, onSnapshot, query, orderBy, Timestamp, addDoc, doc, updateDoc, QuerySnapshot, DocumentData, deleteDoc, writeBatch } from 'firebase/firestore';
import type { Material, Course, MaterialFolder } from '../types';
import { DocumentTextIcon, LinkIcon, ArrowDownTrayIcon, BeakerIcon, CheckCircleIcon, DocumentIcon, CloudArrowUpIcon, FolderIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import { apiClient } from '../services/apiClient.ts';
import { toast } from '../components/Toast.tsx';
import type { User } from 'firebase/auth';
import { formatDate } from '../utils/date';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

interface MaterialsProps {
  user: User;
}

const DOCUMENT_UPLOAD_ACCEPT = '.pdf,.docx,.txt,.md,.csv,.json';
const MAX_DOCUMENT_UPLOAD_BYTES = 700 * 1024;

const isTextReadableUpload = (file: File) => {
    const supportedPattern = /\.(txt|md|csv|json)$/i;
    const isSupportedMime = file.type.startsWith('text/') || ['application/json', 'text/csv'].includes(file.type);
    return supportedPattern.test(file.name) || isSupportedMime;
};

const isDocumentUpload = (file: File) => /\.(pdf|docx)$/i.test(file.name);

const AddMaterialForm: React.FC<{ user: User; folders: MaterialFolder[]; onMaterialAdded: () => void }> = ({ user, folders, onMaterialAdded }) => {
    const [sourceType, setSourceType] = useState<'url' | 'text' | 'upload'>('text');
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [content, setContent] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [folderId, setFolderId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [submitStatus, setSubmitStatus] = useState('Ready to add this material.');
    
    const resetForm = () => {
        setTitle('');
        setUrl('');
        setContent('');
        setFile(null);
        setSourceType('text');
        setFolderId('');
        setSubmitStatus('Ready to add this material.');
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

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragActive(false);
        const droppedFile = event.dataTransfer.files?.[0];
        if (!droppedFile) {
            return;
        }
        setFile(droppedFile);
        if (!title) {
            setTitle(droppedFile.name);
        }
    };

    const previewText = sourceType === 'text' ? content : sourceType === 'upload' && file ? file.name : url;
    const previewLength = sourceType === 'text' ? content.trim().length : sourceType === 'upload' && file ? file.size : url.trim().length;
    const estimatedReadMinutes = sourceType === 'text'
      ? Math.max(1, Math.ceil(content.trim().split(/\s+/).filter(Boolean).length / 180))
      : 1;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('Checking your material...');
        try {
            if (!title.trim()) {
                throw new Error("Title is required.");
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

            if (sourceType === 'upload' && file) {
                if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
                    throw new Error('Please upload a file smaller than 700 KB so it can be stored reliably.');
                }
            }

            let uploadedType: Material['type'] = sourceType === 'url' ? 'link' : 'text';
            let shouldIndexForAi = sourceType !== 'url';

            if (sourceType === 'upload' && file) {
                if (isTextReadableUpload(file)) {
                    uploadedType = 'text';
                } else if (isDocumentUpload(file)) {
                    uploadedType = 'document';
                } else {
                    throw new Error('Uploads currently support PDF, DOCX, TXT, MD, CSV, or JSON files.');
                }
            }

            setSubmitStatus('Creating the material entry in your library...');
            const newMaterialData: Omit<Material, 'id'> = {
                name: title,
                courseId: 'general',
                folderId: folderId || '',
                type: uploadedType,
                url: sourceType === 'url' ? url : '',
                content: sourceType === 'text' ? content : '',
                createdAt: new Date(),
                aiStatus: shouldIndexForAi ? 'indexing' : 'not_indexed',
            };
            
            const userMaterialsCollection = collection(db, 'users', user.uid, 'materials');
            const docRef = await addDoc(userMaterialsCollection, newMaterialData);

            if (sourceType === 'upload' && file) {
              toast.success(`"${newMaterialData.name}" was added to your library. Parsing and AI indexing will continue in the background.`);
            } else if (shouldIndexForAi && newMaterialData.content?.trim()) {
              toast.success('Material added! Starting AI indexing...');
            } else {
              toast.success('Material added to your library.');
            }

            resetForm();
            onMaterialAdded();

            // Continue the heavier upload + parsing + ingestion work after the user already has the material entry.
            if (sourceType === 'upload' && file) {
              const uploadedFile = file;
              const materialName = newMaterialData.name;

              void (async () => {
                try {
                  const { extractDocumentText } = await import('../services/documentParser.ts');
                  let uploadedUrl = '';

                  if (isDocumentUpload(uploadedFile)) {
                    const storageRef = ref(storage, `users/${user.uid}/materials/${Date.now()}-${uploadedFile.name}`);
                    await uploadBytes(storageRef, uploadedFile);
                    uploadedUrl = await getDownloadURL(storageRef);
                  }

                  const extractedContent = await extractDocumentText(uploadedFile);

                  await updateDoc(doc(db, 'users', user.uid, 'materials', docRef.id), {
                    url: uploadedUrl,
                    content: extractedContent,
                    aiStatus: 'indexing',
                  });

                  await apiClient.ingestFile(docRef.id, user);
                  await updateDoc(doc(db, 'users', user.uid, 'materials', docRef.id), { aiStatus: 'ready' });
                  toast.success(`"${materialName}" is ready for Q&A!`);
                } catch (backgroundError) {
                  console.error('Error during background material processing:', backgroundError);
                  toast.error(`Background processing failed for "${materialName}".`);
                  try {
                    await updateDoc(doc(db, 'users', user.uid, 'materials', docRef.id), { aiStatus: 'not_indexed' });
                  } catch (updateError) {
                    console.error("Failed to update material status to 'not_indexed':", updateError);
                  }
                }
              })();
            } else if (shouldIndexForAi && newMaterialData.content?.trim()) {
              void (async () => {
                try {
                  await apiClient.ingestFile(docRef.id, user);
                  await updateDoc(doc(db, 'users', user.uid, 'materials', docRef.id), { aiStatus: 'ready' });
                  toast.success(`"${newMaterialData.name}" is ready for Q&A!`);
                } catch (ingestionError) {
                  console.error("Error during AI ingestion/status update:", ingestionError);
                  toast.error(`AI indexing failed for "${newMaterialData.name}".`);
                  try {
                    await updateDoc(doc(db, 'users', user.uid, 'materials', docRef.id), { aiStatus: 'not_indexed' });
                  } catch (updateError) {
                    console.error("Failed to update material status to 'not_indexed':", updateError);
                  }
                }
              })();
            } else {
              toast.info(`"${newMaterialData.name}" is available in your library, but it could not be indexed for AI.`);
            }

        } catch (error: any) {
            console.error(error);
            setSubmitStatus('The material could not be added.');
            toast.error(error.message || "Failed to add material.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="app-panel-strong mb-8 rounded-[2rem] p-8">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Library intake</p>
                    <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">Add a new learning source</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        Bring in links, paste text notes, or upload documents like PDF and DOCX for your library.
                    </p>
                </div>
                <div className="rounded-[1.35rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    Supported uploads: <span className="font-semibold text-slate-900">PDF, DOCX, TXT, MD, CSV, JSON</span>
                </div>
            </div>
            
            <div className="mb-6">
                <label htmlFor="material-title" className="mb-2 block text-sm font-semibold text-slate-700">Title</label>
                <input id="material-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter a title for your material..." className="app-input px-4 py-3 text-sm" required />
            </div>

            <div className="mb-6">
                <label className="mb-3 block text-sm font-semibold text-slate-700">Source Type</label>
                <div className="flex space-x-4">
                    {(['URL', 'Text Note', 'Upload Notes'] as const).map(type => {
                        const value = type === 'URL' ? 'url' : type === 'Text Note' ? 'text' : 'upload';
                        return (
                            <label key={value} className="flex cursor-pointer items-center space-x-2 rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">
                                <input type="radio" name="sourceType" value={value} checked={sourceType === value} onChange={e => setSourceType(e.target.value as any)} className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"/>
                                <span>{type}</span>
                            </label>
                        )
                    })}
                </div>
            </div>

            {sourceType === 'url' && (
                <div className="mb-6">
                    <label htmlFor="material-url" className="mb-2 block text-sm font-semibold text-slate-700">URL</label>
                    <input id="material-url" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" className="app-input px-4 py-3 text-sm" required />
                </div>
            )}
            
            {sourceType === 'text' && (
                <div className="mb-6">
                    <label htmlFor="material-content" className="mb-2 block text-sm font-semibold text-slate-700">Material Content</label>
                    <textarea id="material-content" value={content} onChange={e => setContent(e.target.value)} rows={8} className="app-input w-full px-4 py-3 text-sm leading-6" placeholder="Enter your notes or material content here..."></textarea>
                </div>
            )}

            {sourceType === 'upload' && (
                 <div className="mb-6">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Upload a document</label>
                    <div
                        onDragOver={(event) => {
                            event.preventDefault();
                            setIsDragActive(true);
                        }}
                        onDragLeave={() => setIsDragActive(false)}
                        onDrop={handleDrop}
                        className={`rounded-[1.5rem] border-2 border-dashed p-6 text-center transition ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
                    >
                        <CloudArrowUpIcon className="mx-auto h-10 w-10 text-slate-400" />
                        <p className="mt-3 text-sm font-semibold text-slate-900">Drop a study file here</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">TXT, MD, CSV, JSON, PDF, and DOCX uploads are parsed into text so RAG can use them after indexing.</p>
                        <input type="file" onChange={handleFileChange} accept={DOCUMENT_UPLOAD_ACCEPT} className="mt-5 w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"/>
                        {file && <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Selected: {file.name}</p>}
                    </div>
                </div>
            )}

            <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Folder</label>
                <select value={folderId} onChange={e => setFolderId(e.target.value)} className="app-input px-4 py-3 text-sm">
                    <option value="">No folder</option>
                    {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                </select>
            </div>

            <div className="mb-6 rounded-[1.35rem] bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <div className="flex flex-wrap items-center gap-4">
                    <span><strong className="text-slate-900">Source preview:</strong> {previewText ? (previewText.length > 72 ? `${previewText.slice(0, 72)}...` : previewText) : 'Nothing added yet'}</span>
                    <span><strong className="text-slate-900">Size:</strong> {previewLength || 0}</span>
                    <span><strong className="text-slate-900">Est. read time:</strong> {estimatedReadMinutes} min</span>
                </div>
            </div>
            
            <div className="flex flex-col items-end gap-3">
                <p className={`text-sm ${isSubmitting ? 'text-blue-700' : 'text-slate-500'}`}>
                    {submitStatus}
                </p>
                <button type="submit" disabled={isSubmitting} className="app-button-primary px-6 py-3 text-sm">
                    {isSubmitting
                      ? sourceType === 'upload'
                        ? 'Processing upload...'
                        : 'Adding material...'
                      : 'Add Material'}
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

const MaterialsList: React.FC<{
  materials: Material[];
  courses: Course[];
  folders: MaterialFolder[];
  onDeleteMaterial: (material: Material) => void;
  onDeleteFolder: (folder: MaterialFolder) => void;
  isFiltered?: boolean;
}> = ({ materials, courses, folders, onDeleteMaterial, onDeleteFolder, isFiltered = false }) => {
  const getCourseName = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.title : 'General';
  };

  const groupedMaterials = useMemo(() => {
    const folderMap = new Map<string, Material[]>();

    folders.forEach((folder) => folderMap.set(folder.id, []));

    const uncategorized: Material[] = [];
    materials.forEach((material) => {
      if (material.folderId && folderMap.has(material.folderId)) {
        folderMap.get(material.folderId)?.push(material);
        return;
      }

      uncategorized.push(material);
    });

    const grouped = folders.map((folder) => ({
      key: folder.id,
      title: folder.name,
      folder,
      materials: folderMap.get(folder.id) || [],
      isUncategorized: false,
    }));

    grouped.push({
      key: 'uncategorized',
      title: 'Uncategorized',
      folder: null,
      materials: uncategorized,
      isUncategorized: true,
    });

    return grouped.filter((group) => group.isUncategorized || group.materials.length > 0);
  }, [folders, materials]);

  if (materials.length === 0) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{isFiltered ? 'No matching materials' : 'No materials yet'}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isFiltered ? 'Try a different search or filter combination.' : 'Get started by adding your first material.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groupedMaterials.map((group) => (
        <div key={group.key} className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${group.isUncategorized ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>
                <FolderIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-slate-950">{group.title}</h3>
                <p className="text-sm text-slate-500">{group.materials.length} material{group.materials.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            {!group.isUncategorized && group.folder && (
              <button
                onClick={() => onDeleteFolder(group.folder!)}
                className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                <TrashIcon className="h-4 w-4" />
                Delete Folder
              </button>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {group.materials.map((material) => (
              <div key={material.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold text-slate-900">
                        {material.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {getCourseName(material.courseId)}
                      </p>
                      {material.type === 'text' && material.content && (
                        <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                          {material.content.substring(0, 150)}{material.content.length > 150 ? '...' : ''}
                        </p>
                      )}
                      {material.type === 'document' && (
                        <p className="mt-2 text-sm text-slate-600">
                          Uploaded document stored in your library. Open or download it anytime.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="ml-4 flex-shrink-0">
                        {material.type === 'link' && <LinkIcon className="h-6 w-6 text-blue-500" />}
                        {material.type === 'document' && <DocumentIcon className="h-6 w-6 text-amber-500" />}
                        {material.type === 'text' && <DocumentTextIcon className="h-6 w-6 text-emerald-500" />}
                      </div>
                      <button
                        onClick={() => onDeleteMaterial(material)}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                        title="Delete material"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      {material.createdAt ? formatDate(material.createdAt) : 'Unknown date'}
                    </div>
                    <AIStatusBadge status={material.aiStatus} />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
                  <span className="text-sm font-medium text-slate-500">
                    {material.type === 'link' ? 'Web source' : material.type === 'document' ? 'Document file' : 'Text source'}
                  </span>
                  <div className="flex space-x-2">
                    {(material.type === 'link' || material.type === 'document') && material.url && (
                      <button
                        onClick={() => window.open(material.url, '_blank', 'noopener,noreferrer')}
                        className="rounded-full px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        {material.type === 'document' ? 'Open File' : 'Open Link'}
                      </button>
                    )}
                    <button
                      onClick={() => handleMaterialDownload(material)}
                      className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-500"
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const Materials: React.FC<MaterialsProps> = ({ user }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [key, setKey] = useState(0); // Used to force re-render/reset of form
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | Material['type']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | NonNullable<Material['aiStatus']>>('all');

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

    const foldersCollection = collection(db, "users", user.uid, "materialFolders");
    const foldersQuery = query(foldersCollection, orderBy("createdAt", "asc"));

    const unsubscribeFolders = onSnapshot(foldersQuery, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const foldersData: MaterialFolder[] = [];
      querySnapshot.forEach((snapshot) => {
        const data = snapshot.data();
        foldersData.push({
          id: snapshot.id,
          name: data.name || 'Untitled Folder',
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
          updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
        });
      });
      setFolders(foldersData);
    });
    
    // Cleanup function
    return () => {
      unsubscribeMaterials();
      unsubscribeCourses();
      unsubscribeFolders();
    };
  }, [user.uid]);

  const handleCreateFolder = async () => {
    const trimmedName = newFolderName.trim();
    if (!trimmedName) {
      toast.error('Please enter a folder name.');
      return;
    }

    setIsCreatingFolder(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'materialFolders'), {
        name: trimmedName,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setNewFolderName('');
      toast.success('Folder created.');
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Could not create the folder.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteMaterial = async (material: Material) => {
    if (!window.confirm(`Delete "${material.name}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'materials', material.id));
      toast.success('Material deleted.');
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Could not delete this material.');
    }
  };

  const handleDeleteFolder = async (folder: MaterialFolder) => {
    if (!window.confirm(`Delete folder "${folder.name}"? Materials inside it will be moved to Uncategorized.`)) {
      return;
    }

    try {
      const batch = writeBatch(db);
      const materialsInFolder = materials.filter((material) => material.folderId === folder.id);

      materialsInFolder.forEach((material) => {
        batch.update(doc(db, 'users', user.uid, 'materials', material.id), {
          folderId: '',
        });
      });

      batch.delete(doc(db, 'users', user.uid, 'materialFolders', folder.id));
      await batch.commit();
      toast.success('Folder deleted. Materials moved to Uncategorized.');
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Could not delete this folder.');
    }
  };

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return materials.filter((material) => {
      const matchesQuery = !normalizedQuery || [
        material.name,
        material.content || '',
        material.url || '',
      ].some((value) => value.toLowerCase().includes(normalizedQuery));

      const matchesType = typeFilter === 'all' || material.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || (material.aiStatus || 'not_indexed') === statusFilter;

      return matchesQuery && matchesType && matchesStatus;
    });
  }, [materials, searchQuery, typeFilter, statusFilter]);

  return (
    <div className="animate-fade-in space-y-8">
      <AddMaterialForm 
        key={key} 
        user={user} 
        folders={folders}
        onMaterialAdded={() => setKey(prev => prev + 1)} 
      />
      <div>
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Knowledge base</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">Your library</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Everything the app can use for grounded summaries and Q&amp;A lives here.</p>
            </div>
            <div className="rounded-[1.35rem] bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
                {materials.length} material{materials.length === 1 ? '' : 's'} indexed in your workspace
            </div>
        </div>
        <div className="app-panel mb-6 rounded-[1.75rem] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Create folder</label>
                    <input
                        type="text"
                        value={newFolderName}
                        onChange={(event) => setNewFolderName(event.target.value)}
                        placeholder="Semester Notes"
                        className="app-input px-4 py-3 text-sm"
                    />
                </div>
                <button
                    onClick={handleCreateFolder}
                    disabled={isCreatingFolder}
                    className="app-button-secondary px-5 py-3 text-sm"
                >
                    <PlusIcon className="h-4 w-4" />
                    {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
            </div>
        </div>
        <div className="app-panel mb-6 rounded-[1.75rem] p-5">
            <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Search materials</label>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by title, content, or URL"
                        className="app-input px-4 py-3 text-sm"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Type</label>
                    <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | Material['type'])} className="app-input px-4 py-3 text-sm">
                        <option value="all">All types</option>
                        <option value="text">Text</option>
                        <option value="document">Document</option>
                        <option value="link">Link</option>
                    </select>
                </div>
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">AI status</label>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | NonNullable<Material['aiStatus']>)} className="app-input px-4 py-3 text-sm">
                        <option value="all">All statuses</option>
                        <option value="ready">Ready</option>
                        <option value="indexing">Indexing</option>
                        <option value="not_indexed">Not indexed</option>
                    </select>
                </div>
            </div>
        </div>
        <MaterialsList
          materials={filteredMaterials}
          courses={courses}
          folders={folders}
          onDeleteMaterial={handleDeleteMaterial}
          onDeleteFolder={handleDeleteFolder}
          isFiltered={Boolean(searchQuery.trim() || typeFilter !== 'all' || statusFilter !== 'all')}
        />
      </div>
    </div>
  );
};

export default Materials;
