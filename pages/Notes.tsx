import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, deleteDoc, doc, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Note } from '../types';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import { PlusIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/solid';
import type { User } from 'firebase/auth';
import { formatDateTime } from '../utils/date';

interface NotesProps {
  user: User;
}

const Notes: React.FC<NotesProps> = ({ user }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
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

  const filteredNotes = notes.filter((note) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    return [note.title, note.content || ''].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
  
  return (
    <div className="animate-fade-in space-y-6">
      <section className="app-panel-strong hero-gradient flex flex-col gap-6 rounded-[2rem] p-8 md:flex-row md:items-end md:justify-between md:p-10">
        <div className="max-w-3xl">
          <div className="page-eyebrow mb-5">
            <PencilSquareIcon className="h-4 w-4" />
            Notes workspace
          </div>
          <h1 className="page-title text-slate-950">Capture ideas before they disappear.</h1>
          <p className="page-copy mt-4 max-w-2xl text-lg">
            Keep lecture notes, quick summaries, and sparks of understanding in one clear place.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="app-button-primary px-5 py-3 text-sm"
        >
          <PlusIcon className="h-5 w-5" />
          Add Note
        </button>
      </section>

      <div className="app-panel rounded-[1.6rem] p-5">
        <label className="mb-2 block text-sm font-semibold text-slate-700">Search notes</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by title or content"
          className="app-input px-4 py-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredNotes.map(note => (
          <div key={note.id} className="app-panel group flex flex-col justify-between rounded-[1.6rem] p-5">
            <div>
              <div className="mb-4 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                Note
              </div>
              <h3 className="text-lg font-extrabold tracking-tight text-slate-950">{note.title}</h3>
              <p className="mb-4 mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{formatDateTime(note.createdAt)}</p>
              {note.content && <p className="mb-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{note.content}</p>}
              {note.audioUrl && (
                <div>
                  <p className="mb-1 mt-3 text-xs font-semibold text-slate-500">AUDIO NOTE</p>
                  <audio controls src={note.audioUrl} className="w-full h-10">
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </div>
            <button onClick={() => deleteNote(note.id)} className="mt-4 self-end rounded-full p-2 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
                <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        ))}
        {filteredNotes.length === 0 && (
          <div className="app-panel col-span-full rounded-[1.75rem] p-10 text-center">
            <PencilSquareIcon className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-bold text-slate-900">{searchQuery.trim() ? 'No matching notes' : 'No notes yet'}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {searchQuery.trim()
                ? 'Try a different search term to find the note you want.'
                : 'Add your first note and this space will start feeling like your second brain.'}
            </p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Add New Note">
        <form onSubmit={handleAddNote} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Title</label>
            <input type="text" value={newNoteTitle} onChange={e => setNewNoteTitle(e.target.value)} placeholder="Note title" className="app-input px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Content</label>
            <textarea value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)} className="app-input w-full px-4 py-3 text-sm leading-6" rows={6}></textarea>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-500">
            Audio recording is disabled in this demo to avoid Firebase billing setup.
          </div>
          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isSubmitting} className="app-button-primary px-5 py-3 text-sm">
              {isSubmitting ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Notes;
