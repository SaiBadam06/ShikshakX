import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Cog6ToothIcon, SparklesIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { db, auth } from '../services/firebase';
import { subscribeToUserProfile } from '../services/communityService';
import type { AppUserProfile } from '../types';
import { toast } from '../components/Toast';

interface SettingsProps {
  user: User;
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [headline, setHeadline] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToUserProfile(user.uid, (nextProfile) => {
      setProfile(nextProfile);
      setDisplayName(nextProfile?.displayName || user.displayName || 'Student');
      setAge(nextProfile?.age ? String(nextProfile.age) : '');
      setGender(nextProfile?.gender || '');
      setHeadline(nextProfile?.headline || '');
      setSkillsInput((nextProfile?.skills || []).join(', '));
      setPhotoURL(nextProfile?.photoURL || user.photoURL || '');
    });

    return () => unsubscribe();
  }, [user.displayName, user.photoURL, user.uid]);

  const skillTags = useMemo(
    () => skillsInput.split(',').map((skill) => skill.trim()).filter(Boolean),
    [skillsInput],
  );

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error('Please enter your display name.');
      return;
    }

    const parsedAge = age.trim() ? Number(age) : null;
    if (parsedAge !== null && (!Number.isFinite(parsedAge) || parsedAge < 0 || parsedAge > 120)) {
      toast.error('Please enter a valid age.');
      return;
    }

    const trimmedPhotoURL = photoURL.trim();
    if (trimmedPhotoURL) {
      try {
        new URL(trimmedPhotoURL);
      } catch {
        toast.error('Please enter a valid profile photo URL.');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: trimmedName,
          photoURL: trimmedPhotoURL || null,
        });
      }

      await setDoc(doc(db, 'users', user.uid), {
        displayName: trimmedName,
        email: user.email || profile?.email || '',
        lowerEmail: (user.email || profile?.email || '').toLowerCase(),
        photoURL: trimmedPhotoURL,
        age: parsedAge,
        gender: gender.trim(),
        headline: headline.trim(),
        skills: skillTags,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast.success('Your settings were updated.');
    } catch (error) {
      console.error('Failed to save profile settings:', error);
      toast.error('Could not save your settings right now.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <section className="app-panel-strong hero-gradient rounded-[2rem] p-8 md:p-10">
        <div className="page-eyebrow mb-5">
          <Cog6ToothIcon className="h-4 w-4" />
          Settings
        </div>
        <h1 className="page-title text-slate-950">Shape how your profile appears.</h1>
        <p className="page-copy mt-4 max-w-3xl text-lg">
          Personalize your name, age, gender, headline, and skill highlights so your workspace feels more like your own.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSave} className="app-panel rounded-[1.8rem] p-6 md:p-8 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="How should people see your name?"
                className="app-input px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Age</label>
              <input
                type="number"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                min="0"
                max="120"
                placeholder="18"
                className="app-input px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Gender</label>
              <select value={gender} onChange={(event) => setGender(event.target.value)} className="app-input px-4 py-3 text-sm">
                <option value="">Prefer not to say</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Profile photo URL</label>
              <input
                type="url"
                value={photoURL}
                onChange={(event) => setPhotoURL(event.target.value)}
                placeholder="https://example.com/my-photo.jpg"
                className="app-input px-4 py-3 text-sm"
              />
              <p className="mt-2 text-xs text-slate-500">Use any public image link for your custom avatar across the app.</p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder="Example: Frontend learner preparing for placements"
                className="app-input px-4 py-3 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Skills to showcase</label>
              <textarea
                value={skillsInput}
                onChange={(event) => setSkillsInput(event.target.value)}
                rows={4}
                placeholder="React, UI Design, Python, Public Speaking"
                className="app-input w-full px-4 py-3 text-sm leading-6"
              />
              <p className="mt-2 text-xs text-slate-500">Separate each skill with a comma.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={isSaving} className="app-button-primary px-6 py-3 text-sm">
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        <section className="app-panel rounded-[1.8rem] p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Profile preview</p>
          <div className="mt-5 rounded-[1.7rem] border border-slate-200/80 bg-slate-50/80 p-5">
            <div className="flex items-center gap-4">
              <img
                src={photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'Student')}&background=random`}
                alt={displayName || 'Student'}
                className="h-16 w-16 rounded-[1.4rem] object-cover"
              />
              <div className="min-w-0">
                <p className="text-xl font-extrabold tracking-tight text-slate-950">{displayName || 'Student'}</p>
                <p className="mt-1 text-sm text-slate-500">{headline || 'Add a short headline to introduce yourself.'}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Age</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{age || 'Not set'}</p>
              </div>
              <div className="rounded-[1.2rem] bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Gender</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{gender || 'Not set'}</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center gap-2">
                <UserCircleIcon className="h-5 w-5 text-blue-700" />
                <p className="text-sm font-bold text-slate-900">Skill showcase</p>
              </div>
              {skillTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skillTags.map((skill) => (
                    <span key={skill} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.2rem] bg-white px-4 py-4 text-sm text-slate-500 shadow-sm">
                  Your skills will appear here once you add them.
                </div>
              )}
            </div>

            <div className="mt-5 rounded-[1.2rem] bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
              <div className="flex items-center gap-2 text-slate-900">
                <SparklesIcon className="h-4 w-4 text-blue-700" />
                <span className="font-semibold">What this changes</span>
              </div>
              <p className="mt-2 leading-6">
                Your custom profile details stay in your workspace settings, and your display name and profile photo become the identity used inside the app going forward.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
