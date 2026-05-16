import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BellAlertIcon,
  CheckBadgeIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PlusIcon,
  SparklesIcon,
  UserGroupIcon,
  UserPlusIcon,
  UsersIcon,
} from '@heroicons/react/24/solid';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import {
  PUBLIC_COMMUNITY_ID,
  acceptFriendRequest,
  createCommunity,
  declineFriendRequest,
  inviteFriendToCommunity,
  searchUsersByEmail,
  sendCommunityMessage,
  sendFriendRequest,
  subscribeToCommunityMemberships,
  subscribeToCommunityMessages,
  subscribeToCommunityRoom,
  subscribeToFriends,
  subscribeToIncomingRequests,
  subscribeToOutgoingRequests,
  subscribeToPublicMessages,
  subscribeToUserProfile,
} from '../services/communityService';
import type { AppUserProfile, CommunityMessage, CommunityRoom, FriendConnection, FriendRequest } from '../types';
import { formatDateTime, formatTime } from '../utils/date';

interface CommunityProps {
  user: User;
}

const publicRoom: CommunityRoom = {
  id: PUBLIC_COMMUNITY_ID,
  name: 'ShikshakX Learners',
  description: 'Announcements, study updates, and the shared community conversation.',
  type: 'public',
};

const buildAvatar = (name: string, photoURL?: string) =>
  photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

export default function Community({ user }: CommunityProps) {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMessageLoading, setIsMessageLoading] = useState(true);
  const [messageError, setMessageError] = useState('');
  const [activeRoomId, setActiveRoomId] = useState(PUBLIC_COMMUNITY_ID);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<FriendConnection[]>([]);
  const [memberships, setMemberships] = useState<CommunityRoom[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<AppUserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [communityName, setCommunityName] = useState('');
  const [communityDescription, setCommunityDescription] = useState('');
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
  const [activeRoomDetails, setActiveRoomDetails] = useState<CommunityRoom | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [invitingFriendId, setInvitingFriendId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribeProfile = subscribeToUserProfile(user.uid, setProfile);
    const unsubscribeIncoming = subscribeToIncomingRequests(user.uid, setIncomingRequests);
    const unsubscribeOutgoing = subscribeToOutgoingRequests(user.uid, setOutgoingRequests);
    const unsubscribeFriends = subscribeToFriends(user.uid, setFriends);
    const unsubscribeMemberships = subscribeToCommunityMemberships(user.uid, setMemberships);

    return () => {
      unsubscribeProfile();
      unsubscribeIncoming();
      unsubscribeOutgoing();
      unsubscribeFriends();
      unsubscribeMemberships();
    };
  }, [user.uid]);

  const directRooms = useMemo<CommunityRoom[]>(
    () =>
      friends.map((friend) => ({
        id: friend.directCommunityId,
        name: friend.friendName,
        description: `Private community with ${friend.friendName}`,
        type: 'direct',
        photoURL: friend.friendPhotoURL || '',
        createdAt: friend.createdAt,
        updatedAt: friend.createdAt,
      })),
    [friends],
  );

  const groupRooms = useMemo(
    () =>
      memberships
        .filter((room) => room.type === 'group')
        .map((room) => ({
          ...room,
          description: room.description || 'Community created by learners you know.',
        })),
    [memberships],
  );

  const availableRooms = useMemo(() => {
    const roomMap = new Map<string, CommunityRoom>();
    roomMap.set(publicRoom.id, publicRoom);
    groupRooms.forEach((room) => roomMap.set(room.id, room));
    directRooms.forEach((room) => roomMap.set(room.id, room));
    return Array.from(roomMap.values());
  }, [directRooms, groupRooms]);

  const activeRoom = useMemo(() => {
    const baseRoom = availableRooms.find((room) => room.id === activeRoomId) || publicRoom;
    return activeRoomDetails && activeRoomDetails.id === baseRoom.id
      ? { ...baseRoom, ...activeRoomDetails }
      : baseRoom;
  }, [activeRoomDetails, activeRoomId, availableRooms]);

  useEffect(() => {
    if (!availableRooms.some((room) => room.id === activeRoomId)) {
      setActiveRoomId(PUBLIC_COMMUNITY_ID);
    }
  }, [activeRoomId, availableRooms]);

  useEffect(() => {
    if (activeRoomId === PUBLIC_COMMUNITY_ID) {
      setActiveRoomDetails(publicRoom);
      return;
    }

    const unsubscribe = subscribeToCommunityRoom(
      activeRoomId,
      (room) => setActiveRoomDetails(room),
      (error) => {
        console.error('Failed to load community room details:', error);
        setActiveRoomDetails(null);
      },
    );

    return () => unsubscribe();
  }, [activeRoomId]);

  useEffect(() => {
    setIsMessageLoading(true);
    setMessageError('');

    const onSuccess = (nextMessages: CommunityMessage[]) => {
      setMessages(nextMessages);
      setIsMessageLoading(false);
    };

    const onError = (error: Error) => {
      console.error('Community subscription error:', error);
      setMessageError('Unable to load this conversation right now.');
      setIsMessageLoading(false);
    };

    const unsubscribe =
      activeRoom.id === PUBLIC_COMMUNITY_ID
        ? subscribeToPublicMessages(onSuccess, onError)
        : subscribeToCommunityMessages(activeRoom.id, onSuccess, onError);

    return () => unsubscribe();
  }, [activeRoom.id]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeRoom.id]);

  const latestMessage = messages[messages.length - 1];
  const recentHighlights = useMemo(() => messages.slice(-4).reverse(), [messages]);
  const contributorCount = useMemo(() => new Set(messages.map((message) => message.userId)).size, [messages]);
  const outgoingRecipientIds = useMemo(() => new Set(outgoingRequests.map((request) => request.recipientId)), [outgoingRequests]);
  const friendIds = useMemo(() => new Set(friends.map((friend) => friend.friendId)), [friends]);
  const activeMemberIds = useMemo(() => new Set(activeRoom.memberIds || []), [activeRoom.memberIds]);
  const inviteableFriends = useMemo(
    () => friends.filter((friend) => !activeMemberIds.has(friend.friendId)),
    [activeMemberIds, friends],
  );

  const handleSearchFriends = async () => {
    const normalized = searchEmail.trim().toLowerCase();
    if (!normalized) {
      setSearchResults([]);
      return;
    }

    if (normalized === (user.email || '').toLowerCase()) {
      toast.info('Search for another learner to connect with.');
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsersByEmail(normalized, user.uid);
      setSearchResults(results);
      if (!results.length) {
        toast.info('No learner found with that Gmail yet.');
      }
    } catch (error) {
      console.error('Failed to search users:', error);
      toast.error('Could not search for that Gmail right now.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (target: AppUserProfile) => {
    setBusyRequestId(target.id);
    try {
      await sendFriendRequest(user, target);
      toast.success(`Friend request sent to ${target.displayName}.`);
    } catch (error) {
      console.error('Failed to send friend request:', error);
      toast.error('Could not send the friend request.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    setBusyRequestId(request.requesterId);
    try {
      const directCommunityId = await acceptFriendRequest(user, request);
      setActiveRoomId(directCommunityId);
      toast.success(`You and ${request.requesterName} are now connected.`);
    } catch (error) {
      console.error('Failed to accept request:', error);
      toast.error('Could not accept the request right now.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleDeclineRequest = async (request: FriendRequest) => {
    setBusyRequestId(request.requesterId);
    try {
      await declineFriendRequest(user.uid, request.requesterId);
      toast.info(`Request from ${request.requesterName} removed.`);
    } catch (error) {
      console.error('Failed to decline request:', error);
      toast.error('Could not decline the request right now.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleCreateCommunity = async () => {
    const trimmedName = communityName.trim();
    const trimmedDescription = communityDescription.trim();

    if (!trimmedName) {
      toast.error('Give your community a name.');
      return;
    }

    setIsCreatingCommunity(true);
    try {
      const communityId = await createCommunity(user, {
        name: trimmedName,
        description: trimmedDescription || 'A private study community for invited friends.',
      });
      setCommunityName('');
      setCommunityDescription('');
      setIsCreateModalOpen(false);
      setActiveRoomId(communityId);
      toast.success('Community created successfully.');
    } catch (error) {
      console.error('Failed to create community:', error);
      toast.error('Could not create your community.');
    } finally {
      setIsCreatingCommunity(false);
    }
  };

  const handleInviteFriend = async (friend: FriendConnection) => {
    setInvitingFriendId(friend.friendId);
    try {
      await inviteFriendToCommunity(activeRoom, user, friend);
      toast.success(`${friend.friendName} was added to ${activeRoom.name}.`);
    } catch (error: any) {
      console.error('Failed to invite friend to community:', error);
      toast.error(error.message || 'Could not invite that friend right now.');
    } finally {
      setInvitingFriendId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await sendCommunityMessage(activeRoom, user, messageText, {
        displayName: profile?.displayName || user.displayName || 'Learner',
        photoURL: profile?.photoURL || user.photoURL || '',
      });
    } catch (error) {
      console.error('Failed to send community message:', error);
      setNewMessage(messageText);
      toast.error('Message could not be sent. Please try again.');
    }
  };

  return (
    <>
      <div className="animate-fade-in">
        <div className="grid gap-6 xl:items-start xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="app-panel-strong flex flex-col overflow-hidden rounded-[2rem] xl:sticky xl:top-8 xl:h-[calc(100vh-4rem)]">
            <div className="bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.22),_transparent_42%),linear-gradient(135deg,_#1e3a8a,_#1d4ed8_54%,_#3b82f6)] px-6 py-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-white/12 shadow-[0_20px_40px_rgba(15,23,42,0.28)]">
                    <UserGroupIcon className="h-7 w-7 text-blue-100" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100/75">Community</p>
                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight">People & Spaces</h1>
                  </div>
                </div>
                <CheckBadgeIcon className="mt-1 h-6 w-6 text-blue-100" />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-200/90">
                Search classmates by Gmail, send friend requests, open private chats, and build your own learning communities.
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(241,245,249,0.98))] p-4 pb-8 pr-3 dark:bg-[linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(30,41,59,0.98))]">
              <div className="hover-lift rounded-[1.5rem] bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Your profile</p>
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={buildAvatar(profile?.displayName || user.displayName || 'Student', profile?.photoURL || user.photoURL || '')}
                    alt={profile?.displayName || user.displayName || 'Student'}
                    className="h-12 w-12 rounded-2xl object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{profile?.displayName || user.displayName || 'Student'}</p>
                    <p className="truncate text-xs text-slate-500">{profile?.email || user.email}</p>
                  </div>
                </div>
              </div>

              <div className="hover-lift rounded-[1.5rem] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Find friends</p>
                    <p className="mt-1 text-sm text-slate-500">Search by exact Gmail address.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-blue-800"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Community
                  </button>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={searchEmail}
                      onChange={(event) => setSearchEmail(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleSearchFriends();
                        }
                      }}
                      placeholder="friend@gmail.com"
                      className="app-input w-full rounded-[1.1rem] border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchFriends}
                    disabled={isSearching}
                    className="rounded-[1.1rem] bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {searchResults.map((profile) => {
                      const alreadyFriend = friendIds.has(profile.id);
                      const alreadyRequested = outgoingRecipientIds.has(profile.id);

                      return (
                        <div key={profile.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={buildAvatar(profile.displayName, profile.photoURL)}
                              alt={profile.displayName}
                              className="h-11 w-11 rounded-2xl object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-950">{profile.displayName}</p>
                              <p className="truncate text-xs text-slate-500">{profile.email}</p>
                            </div>
                            <button
                              type="button"
                              disabled={alreadyFriend || alreadyRequested || busyRequestId === profile.id}
                              onClick={() => handleSendRequest(profile)}
                              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${
                                alreadyFriend
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : alreadyRequested
                                    ? 'bg-slate-200 text-slate-500'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              } disabled:cursor-not-allowed`}
                            >
                              {busyRequestId === profile.id ? 'Sending...' : alreadyFriend ? 'Friends' : alreadyRequested ? 'Requested' : 'Send Request'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="hover-lift rounded-[1.5rem] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Incoming requests</p>
                    <p className="mt-1 text-sm text-slate-500">Accept and open private friend communities.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    {incomingRequests.length}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {incomingRequests.length ? (
                    incomingRequests.map((request) => (
                      <div key={request.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={buildAvatar(request.requesterName, request.requesterPhotoURL)}
                            alt={request.requesterName}
                            className="h-11 w-11 rounded-2xl object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-950">{request.requesterName}</p>
                            <p className="truncate text-xs text-slate-500">{request.requesterEmail}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          {formatDateTime(request.createdAt)}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAcceptRequest(request)}
                            disabled={busyRequestId === request.requesterId}
                            className="flex-1 rounded-[1rem] bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyRequestId === request.requesterId ? 'Accepting...' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclineRequest(request)}
                            disabled={busyRequestId === request.requesterId}
                            className="flex-1 rounded-[1rem] bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.2rem] bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No pending requests right now.
                    </div>
                  )}
                </div>
              </div>

              <div className="hover-lift rounded-[1.5rem] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Known friends</p>
                    <p className="mt-1 text-sm text-slate-500">Open a private room with any accepted friend.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    {friends.length}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {friends.length ? (
                    friends.map((friend) => (
                      <button
                        key={friend.id}
                        type="button"
                        onClick={() => setActiveRoomId(friend.directCommunityId)}
                        className={`w-full rounded-[1.2rem] border px-4 py-3 text-left transition ${
                          activeRoomId === friend.directCommunityId
                            ? 'border-slate-300 bg-slate-100'
                            : 'border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={buildAvatar(friend.friendName, friend.friendPhotoURL)}
                            alt={friend.friendName}
                            className="h-11 w-11 rounded-2xl object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-950">{friend.friendName}</p>
                            <p className="truncate text-xs text-slate-500">{friend.friendEmail}</p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            Private
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[1.2rem] bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      Add a friend and their personal community will appear here.
                    </div>
                  )}
                </div>
              </div>

              <div className="hover-lift rounded-[1.5rem] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Communities</p>
                    <p className="mt-1 text-sm text-slate-500">Your shared rooms and study circles.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    {groupRooms.length + 1}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {[publicRoom, ...groupRooms].map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setActiveRoomId(room.id)}
                      className={`w-full rounded-[1.2rem] border px-4 py-3 text-left transition ${
                        activeRoomId === room.id
                            ? 'border-slate-300 bg-slate-100'
                          : 'border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${room.type === 'public' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-700'}`}>
                          {room.type === 'public' ? <BellAlertIcon className="h-5 w-5" /> : <UsersIcon className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-950">{room.name}</p>
                          <p className="truncate text-xs text-slate-500">{room.description}</p>
                        </div>
                        {room.type === 'group' && (
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            Group
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {outgoingRequests.length > 0 && (
                <div className="hover-lift rounded-[1.5rem] bg-[linear-gradient(135deg,_rgba(241,245,249,0.98),_rgba(226,232,240,0.96))] p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <ClockIcon className="h-5 w-5 text-slate-700" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Pending sent requests</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {outgoingRequests.length} request{outgoingRequests.length === 1 ? '' : 's'} waiting for approval.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>

          <section className="app-panel-strong flex min-h-[48rem] flex-col overflow-hidden rounded-[2rem]">
            <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.98))] px-5 py-4 dark:bg-[linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(30,41,59,0.98))]">
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${activeRoom.type === 'public' ? 'bg-slate-200 text-slate-700' : activeRoom.type === 'direct' ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-700'}`}>
                  {activeRoom.type === 'public' ? <BellAlertIcon className="h-6 w-6" /> : activeRoom.type === 'direct' ? <UserPlusIcon className="h-6 w-6" /> : <UsersIcon className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-extrabold tracking-tight text-slate-950">{activeRoom.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {activeRoom.type === 'public'
                      ? 'Shared updates, announcements, and open discussion for all learners.'
                      : activeRoom.type === 'direct'
                        ? 'Private community space between friends.'
                        : activeRoom.description}
                  </p>
                </div>
                  <div className="flex items-center gap-3">
                    {activeRoom.type === 'group' && (
                      <button
                        type="button"
                        onClick={() => setIsInviteModalOpen(true)}
                        className="hidden rounded-full bg-blue-700 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-blue-800 md:inline-flex"
                      >
                        Invite Friends
                      </button>
                    )}
                    <div className="hidden rounded-full bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 md:block">
                      {activeRoom.type === 'public' ? 'Shared room' : activeRoom.type === 'direct' ? 'Private friend room' : 'Custom community'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-b border-slate-200/80 bg-white/95 px-5 py-4 dark:bg-slate-900/80">
                <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.3rem] bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Messages</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{messages.length}</p>
                  <p className="mt-2 text-sm text-slate-500">Live conversation in this room.</p>
                </div>
                  <div className="rounded-[1.3rem] bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      {activeRoom.type === 'group' ? 'Members' : 'People active'}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                      {activeRoom.type === 'group' ? activeMemberIds.size || 1 : contributorCount || 1}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {activeRoom.type === 'group' ? 'Learners currently included in this community.' : 'Unique contributors in the current room.'}
                    </p>
                  </div>
                <div className="rounded-[1.3rem] bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Latest activity</p>
                  <p className="mt-2 text-lg font-extrabold tracking-tight text-slate-950">
                    {latestMessage ? latestMessage.userName : 'No activity yet'}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {latestMessage ? formatTime(latestMessage.timestamp) : 'Start this room with a quick hello.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.72),_transparent_35%),linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.98))] px-4 py-5 md:px-6 dark:bg-[linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(30,41,59,0.98))]">
                <div className="hover-lift mx-auto max-w-3xl rounded-[1.4rem] bg-[linear-gradient(135deg,_rgba(241,245,249,0.98),_rgba(226,232,240,0.96))] p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <SparklesIcon className="h-5 w-5 text-slate-700" />
                  <p className="text-sm font-bold text-slate-900">
                    {activeRoom.type === 'public'
                      ? 'Community hub'
                      : activeRoom.type === 'direct'
                        ? 'Private friend space'
                        : 'Custom learning community'}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {activeRoom.type === 'public'
                    ? 'This is your shared ShikshakX commons for broad discussion, announcements, and quick collaboration.'
                    : activeRoom.type === 'direct'
                      ? 'You are inside a personal community. Use it for private planning, mentoring, and one-to-one collaboration.'
                      : 'Use this custom community to gather a focused learning circle around a course, project, or exam topic.'}
                </p>
              </div>

              {messageError ? (
                <div className="hover-lift mx-auto max-w-3xl rounded-[1.4rem] bg-white p-6 text-sm text-red-600 shadow-sm">
                  {messageError}
                </div>
              ) : isMessageLoading ? (
                <div className="hover-lift mx-auto max-w-3xl rounded-[1.4rem] bg-white p-6 text-sm text-slate-500 shadow-sm">
                  Loading conversation...
                </div>
              ) : messages.length === 0 ? (
                <div className="hover-lift mx-auto max-w-3xl rounded-[1.4rem] bg-white p-6 text-sm text-slate-500 shadow-sm">
                  No messages yet. Start the conversation and make this space feel alive.
                </div>
              ) : (
                <>
                  {recentHighlights.length > 0 && (
                    <div className="hover-lift mx-auto max-w-3xl rounded-[1.4rem] bg-white p-5 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Recent highlights</p>
                      <div className="mt-4 space-y-3">
                        {recentHighlights.map((message) => (
                          <div key={`highlight-${message.id}`} className="rounded-[1.1rem] bg-slate-50 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-bold text-slate-950">{message.userName}</p>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                {formatTime(message.timestamp)}
                              </p>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{message.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message) => {
                    const isCurrentUser = message.userId === user.uid;
                    return (
                      <div key={message.id} className={`mx-auto flex max-w-3xl ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-2xl gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                          <img
                            src={buildAvatar(message.userName, message.userAvatar)}
                            alt={message.userName}
                            className="h-10 w-10 rounded-2xl object-cover shadow-sm"
                          />
                          <div
                            className={`rounded-[1.25rem] px-4 py-3 shadow-sm ${
                               isCurrentUser ? 'bg-[linear-gradient(135deg,_rgba(241,245,249,0.98),_rgba(226,232,240,0.96))] text-slate-900' : 'bg-white text-slate-900'
                            }`}
                          >
                            <div className="mb-2 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em]">
                              <span className={isCurrentUser ? 'text-slate-700' : 'text-slate-600'}>{message.userName}</span>
                              <span className="text-slate-400">{formatTime(message.timestamp)}</span>
                            </div>
                            <p className="text-sm leading-7 text-slate-700">{message.text}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              <div ref={messageEndRef} />
            </div>

            <div className="border-t border-slate-200/80 bg-[linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.98))] px-4 py-4 md:px-6 dark:bg-slate-900/80">
              <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-end">
                <textarea
                  rows={2}
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Message ${activeRoom.name}`}
                  className="app-input min-h-[5.2rem] flex-1 resize-none rounded-[1.2rem] border-slate-200 bg-white px-4 py-3 text-sm leading-6"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="flex h-12 items-center justify-center rounded-full bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => {
          if (!invitingFriendId) {
            setIsInviteModalOpen(false);
          }
        }}
        title={`Invite Friends to ${activeRoom.name}`}
      >
        <div className="space-y-4">
          <div className="rounded-[1.2rem] bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Add accepted friends into this community so the room becomes a true shared group instead of just a personal space.
          </div>
          {activeRoom.type !== 'group' ? (
            <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-700">
              Friend invites are only available for custom group communities.
            </div>
          ) : inviteableFriends.length ? (
            <div className="space-y-3">
              {inviteableFriends.map((friend) => (
                <div key={friend.friendId} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={buildAvatar(friend.friendName, friend.friendPhotoURL)}
                      alt={friend.friendName}
                      className="h-11 w-11 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-950">{friend.friendName}</p>
                      <p className="truncate text-xs text-slate-500">{friend.friendEmail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInviteFriend(friend)}
                      disabled={invitingFriendId === friend.friendId}
                      className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {invitingFriendId === friend.friendId ? 'Inviting...' : 'Invite'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Every accepted friend you know is already in this community, or you need to accept more friend requests first.
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              disabled={Boolean(invitingFriendId)}
              className="rounded-[1rem] bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!isCreatingCommunity) {
            setIsCreateModalOpen(false);
          }
        }}
        title="Create Community"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Community name</label>
            <input
              type="text"
              value={communityName}
              onChange={(event) => setCommunityName(event.target.value)}
              placeholder="Exam Prep Circle"
              className="app-input w-full"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
            <textarea
              rows={4}
              value={communityDescription}
              onChange={(event) => setCommunityDescription(event.target.value)}
              placeholder="Share resources, weekly goals, and doubts with a focused group."
              className="app-input w-full resize-none"
            />
          </div>
          <div className="rounded-[1.2rem] bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Create a room first, then use your friend connections to coordinate inside private spaces while your broader study communities stay organized.
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreatingCommunity}
              className="rounded-[1rem] bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateCommunity}
              disabled={isCreatingCommunity}
              className="rounded-[1rem] bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingCommunity ? 'Creating...' : 'Create community'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
