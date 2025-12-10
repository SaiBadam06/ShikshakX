import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, deleteDoc, doc, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Note } from '../types';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import type { User } from 'firebase/auth';

interface NotesProps {
  user: User;
}

const Notes: React.FC<NotesProps> = ({ user }) => {
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Authentication Required</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Please log in to view your notes.</p>
        </div>
      </div>
    );
  }
  const [notes, setNotes] = useState<Note[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (!user?.uid) return;
    
    const notesCollection = collection(db, "users", user.uid, "notes");
    const q = query(notesCollection, orderBy("createdAt", "desc"));
    
    console.log('Setting up notes listener for user:', user.uid);
    
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const notesData: Note[] = [];
      snapshot.docs.forEach(doc => {
        try {
            const data = doc.data();
            if (!data.createdAt) {
                console.warn(`Skipping malformed note document (ID: ${doc.id}):`, data);
                return;
            }
            notesData.push({
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate(),
            } as Note);
        } catch (error) {
            console.error(`Error processing note document (ID: ${doc.id}):`, error);
        }
      });
      setNotes(notesData);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const resetForm = useCallback(() => {
    setNewNoteTitle('');
    setNewNoteContent('');
  }, []);

  const handleCloseModal = () => {
    resetForm();
    setIsModalOpen(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      toast.error("You must be logged in to add a note.");
      return;
    }
    
    if (!newNoteTitle.trim() && !newNoteContent.trim()) {
      toast.error("A note must have a title or content.");
      return;
    }
    
    setIsSubmitting(true);

    try {
      const title = newNoteTitle || `Note - ${new Date().toLocaleString()}`;
      const notesCollection = collection(db, 'users', user.uid, 'notes');

      await addDoc(notesCollection, {
        title,
        content: newNoteContent,
        createdAt: new Date(),
        audioUrl: '', // Audio is disabled
      });

      toast.success('Note added successfully!');
      handleCloseModal();
    } catch (error) {
      console.error("Error adding note: ", error);
      toast.error("Failed to add note.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const deleteNote = async (noteId: string) => {
    if (!user?.uid) {
      toast.error("You must be logged in to delete notes.");
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this note?")) {
      try {
        const noteRef = doc(db, 'users', user.uid, 'notes', noteId);
        await deleteDoc(noteRef);
        toast.success('Note deleted.');
      } catch (error) {
        console.error('Error deleting note:', error);
        toast.error('Failed to delete note. Please try again.');
      }
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Notes</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Note
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.map(note => (
          <div key={note.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 flex flex-col justify-between group">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">{note.title}</h3>
              <p className="text-xs text-slate-500 mb-3">{note.createdAt.toLocaleString()}</p>
              {note.content && <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 whitespace-pre-wrap">{note.content}</p>}
              {note.audioUrl && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1 mt-3">AUDIO NOTE</p>
                  <audio controls src={note.audioUrl} className="w-full h-10">
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </div>
            <button onClick={() => deleteNote(note.id)} className="self-end mt-4 p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        ))}
        {notes.length === 0 && <p className="col-span-full text-center text-slate-500 py-8">No notes yet. Add one to get started!</p>}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Add New Note">
        <form onSubmit={handleAddNote} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Title</label>
            <input type="text" value={newNoteTitle} onChange={e => setNewNoteTitle(e.target.value)} placeholder="Note title" className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Content</label>
            <textarea value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600" rows={5}></textarea>
          </div>
          <div className="text-sm text-slate-500 p-3 bg-slate-100 dark:bg-slate-700 rounded-md">
            Audio recording is disabled in this demo to avoid Firebase billing setup.
          </div>
          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
              {isSubmitting ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Notes;
