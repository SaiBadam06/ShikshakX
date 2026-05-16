import type { User } from 'firebase/auth';
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { AppUserProfile, CommunityMessage, CommunityRoom, FriendConnection, FriendRequest } from '../types';
import { toDate } from '../utils/date';

export const PUBLIC_COMMUNITY_ID = 'public-lobby';

const getUserProfileRef = (uid: string) => doc(db, 'users', uid);
const getIncomingRequestRef = (uid: string, requesterId: string) => doc(db, 'users', uid, 'incomingFriendRequests', requesterId);
const getOutgoingRequestRef = (uid: string, recipientId: string) => doc(db, 'users', uid, 'outgoingFriendRequests', recipientId);
const getFriendRef = (uid: string, friendId: string) => doc(db, 'users', uid, 'friends', friendId);
const getMembershipRef = (uid: string, communityId: string) => doc(db, 'users', uid, 'communityMemberships', communityId);

export const ensureUserProfile = async (user: User) => {
  const existingSnapshot = await getDoc(getUserProfileRef(user.uid));
  const existingData = existingSnapshot.exists() ? existingSnapshot.data() : null;

  await setDoc(
    getUserProfileRef(user.uid),
    {
      displayName: existingData?.displayName || user.displayName || 'Student',
      email: user.email || existingData?.email || '',
      lowerEmail: (user.email || existingData?.email || '').toLowerCase(),
      photoURL: existingData?.photoURL || user.photoURL || '',
      age: existingData?.age ?? null,
      gender: existingData?.gender || '',
      skills: existingData?.skills || [],
      headline: existingData?.headline || '',
      updatedAt: serverTimestamp(),
      createdAt: existingData?.createdAt || serverTimestamp(),
    },
    { merge: true },
  );
};

export const subscribeToUserProfile = (
  uid: string,
  callback: (profile: AppUserProfile | null) => void,
) => onSnapshot(getUserProfileRef(uid), (snapshot) => {
  if (!snapshot.exists()) {
    callback(null);
    return;
  }

  callback({
    id: snapshot.id,
    displayName: snapshot.data().displayName || 'Student',
    email: snapshot.data().email || '',
    lowerEmail: snapshot.data().lowerEmail || '',
    photoURL: snapshot.data().photoURL || '',
    age: typeof snapshot.data().age === 'number' ? snapshot.data().age : null,
    gender: snapshot.data().gender || '',
    skills: Array.isArray(snapshot.data().skills) ? snapshot.data().skills : [],
    headline: snapshot.data().headline || '',
    createdAt: toDate(snapshot.data().createdAt),
    updatedAt: toDate(snapshot.data().updatedAt),
  });
});

export const ensurePublicCommunity = async () => {
  await setDoc(
    doc(db, 'communities', PUBLIC_COMMUNITY_ID),
    {
      name: 'ShikshakX Learners',
      description: 'Shared community hub for everyone using ShikshakX.',
      type: 'public',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      memberIds: [],
    },
    { merge: true },
  );
};

export const searchUsersByEmail = async (email: string, currentUserId: string): Promise<AppUserProfile[]> => {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const snapshot = await getDocs(query(collection(db, 'users'), where('lowerEmail', '==', normalized), limit(5)));
  return snapshot.docs
    .map((docSnapshot) => ({
      id: docSnapshot.id,
      displayName: docSnapshot.data().displayName || 'Learner',
      email: docSnapshot.data().email || '',
      lowerEmail: docSnapshot.data().lowerEmail || '',
      photoURL: docSnapshot.data().photoURL || '',
      createdAt: toDate(docSnapshot.data().createdAt),
      updatedAt: toDate(docSnapshot.data().updatedAt),
    } as AppUserProfile))
    .filter((profile) => profile.id !== currentUserId);
};

export const sendFriendRequest = async (currentUser: User, target: AppUserProfile) => {
  const now = serverTimestamp();
  const incomingRef = getIncomingRequestRef(target.id, currentUser.uid);
  const outgoingRef = getOutgoingRequestRef(currentUser.uid, target.id);

  const batch = writeBatch(db);
  batch.set(incomingRef, {
    requesterId: currentUser.uid,
    requesterName: currentUser.displayName || 'Learner',
    requesterEmail: currentUser.email || '',
    requesterPhotoURL: currentUser.photoURL || '',
    recipientId: target.id,
    createdAt: now,
  });
  batch.set(outgoingRef, {
    requesterId: currentUser.uid,
    requesterName: currentUser.displayName || 'Learner',
    requesterEmail: currentUser.email || '',
    requesterPhotoURL: currentUser.photoURL || '',
    recipientId: target.id,
    createdAt: now,
  });
  await batch.commit();
};

export const createCommunity = async (user: User, payload: { name: string; description: string }) => {
  const communityRef = await addDoc(collection(db, 'communities'), {
    name: payload.name.trim(),
    description: payload.description.trim(),
    type: 'group',
    ownerId: user.uid,
    ownerName: user.displayName || 'Learner',
    memberIds: [user.uid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    photoURL: '',
  });

  await setDoc(getMembershipRef(user.uid, communityRef.id), {
    name: payload.name.trim(),
    description: payload.description.trim(),
    type: 'group',
    ownerId: user.uid,
    ownerName: user.displayName || 'Learner',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return communityRef.id;
};

export const inviteFriendToCommunity = async (
  room: CommunityRoom,
  inviter: User,
  friend: FriendConnection,
) => {
  if (room.type !== 'group') {
    throw new Error('Only group communities can invite friends.');
  }

  const communityRef = doc(db, 'communities', room.id);
  const communitySnapshot = await getDoc(communityRef);
  if (!communitySnapshot.exists()) {
    throw new Error('This community could not be found.');
  }

  const memberIds = Array.isArray(communitySnapshot.data().memberIds) ? communitySnapshot.data().memberIds : [];
  if (memberIds.includes(friend.friendId)) {
    throw new Error(`${friend.friendName} is already in this community.`);
  }

  await updateDoc(communityRef, {
    memberIds: arrayUnion(friend.friendId),
    updatedAt: serverTimestamp(),
  });

  await setDoc(getMembershipRef(friend.friendId, room.id), {
    name: room.name,
    description: room.description,
    type: 'group',
    ownerId: room.ownerId || inviter.uid,
    ownerName: room.ownerName || inviter.displayName || 'Learner',
    createdAt: room.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    photoURL: room.photoURL || '',
  }, { merge: true });
};

export const acceptFriendRequest = async (
  currentUser: User,
  request: FriendRequest,
) => {
  const directCommunityRef = doc(collection(db, 'communities'));
  const batch = writeBatch(db);

  batch.set(directCommunityRef, {
    name: `${request.requesterName} & ${currentUser.displayName || 'You'}`,
    description: 'Private community space for friends.',
    type: 'direct',
    ownerId: currentUser.uid,
    ownerName: currentUser.displayName || 'Learner',
    memberIds: [currentUser.uid, request.requesterId],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    photoURL: '',
  });

  batch.set(getFriendRef(currentUser.uid, request.requesterId), {
    friendId: request.requesterId,
    friendName: request.requesterName,
    friendEmail: request.requesterEmail,
    friendPhotoURL: request.requesterPhotoURL || '',
    directCommunityId: directCommunityRef.id,
    createdAt: serverTimestamp(),
  });

  batch.set(getFriendRef(request.requesterId, currentUser.uid), {
    friendId: currentUser.uid,
    friendName: currentUser.displayName || 'Learner',
    friendEmail: currentUser.email || '',
    friendPhotoURL: currentUser.photoURL || '',
    directCommunityId: directCommunityRef.id,
    createdAt: serverTimestamp(),
  });

  batch.set(getMembershipRef(currentUser.uid, directCommunityRef.id), {
    name: request.requesterName,
    description: 'Private conversation',
    type: 'direct',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(getMembershipRef(request.requesterId, directCommunityRef.id), {
    name: currentUser.displayName || 'Learner',
    description: 'Private conversation',
    type: 'direct',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.delete(getIncomingRequestRef(currentUser.uid, request.requesterId));
  batch.delete(getOutgoingRequestRef(request.requesterId, currentUser.uid));
  await batch.commit();
  return directCommunityRef.id;
};

export const declineFriendRequest = async (currentUserId: string, requesterId: string) => {
  const batch = writeBatch(db);
  batch.delete(getIncomingRequestRef(currentUserId, requesterId));
  batch.delete(getOutgoingRequestRef(requesterId, currentUserId));
  await batch.commit();
};

export const sendCommunityMessage = async (
  room: CommunityRoom,
  currentUser: User,
  text: string,
  overrides?: { displayName?: string; photoURL?: string },
) => {
  const targetRoomId = room.id === PUBLIC_COMMUNITY_ID || room.type === 'public'
    ? PUBLIC_COMMUNITY_ID
    : room.id;

  const payload = {
    text: text.trim(),
    userId: currentUser.uid,
    userName: overrides?.displayName || currentUser.displayName || 'Learner',
    userAvatar: overrides?.photoURL || currentUser.photoURL || '',
    timestamp: serverTimestamp(),
  };

  await addDoc(collection(db, 'communities', targetRoomId, 'messages'), payload);
  await updateDoc(doc(db, 'communities', targetRoomId), { updatedAt: serverTimestamp() });
};

export const subscribeToPublicMessages = (
  callback: (messages: CommunityMessage[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(db, 'communities', PUBLIC_COMMUNITY_ID, 'messages'), orderBy('timestamp')),
  (snapshot) => {
    callback(snapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      text: docSnapshot.data().text || '',
      userId: docSnapshot.data().userId || '',
      userName: docSnapshot.data().userName || 'Learner',
      userAvatar: docSnapshot.data().userAvatar || '',
      timestamp: toDate(docSnapshot.data().timestamp),
    })));
  },
  (error) => onError(error as Error),
);

export const subscribeToCommunityMessages = (
  communityId: string,
  callback: (messages: CommunityMessage[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(db, 'communities', communityId, 'messages'), orderBy('timestamp')),
  (snapshot) => {
    callback(snapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      text: docSnapshot.data().text || '',
      userId: docSnapshot.data().userId || '',
      userName: docSnapshot.data().userName || 'Learner',
      userAvatar: docSnapshot.data().userAvatar || '',
      timestamp: toDate(docSnapshot.data().timestamp),
    })));
  },
  (error) => onError(error as Error),
);

export const subscribeToIncomingRequests = (
  uid: string,
  callback: (requests: FriendRequest[]) => void,
) => onSnapshot(collection(db, 'users', uid, 'incomingFriendRequests'), (snapshot) => {
  const requests = snapshot.docs
    .map((docSnapshot) => ({
      id: docSnapshot.id,
      requesterId: docSnapshot.data().requesterId,
      requesterName: docSnapshot.data().requesterName || 'Learner',
      requesterEmail: docSnapshot.data().requesterEmail || '',
      requesterPhotoURL: docSnapshot.data().requesterPhotoURL || '',
      recipientId: docSnapshot.data().recipientId || uid,
      createdAt: toDate(docSnapshot.data().createdAt),
    } as FriendRequest))
    .sort((left, right) => toDate(right.createdAt).getTime() - toDate(left.createdAt).getTime());
  callback(requests);
});

export const subscribeToOutgoingRequests = (
  uid: string,
  callback: (requests: FriendRequest[]) => void,
) => onSnapshot(collection(db, 'users', uid, 'outgoingFriendRequests'), (snapshot) => {
  const requests = snapshot.docs
    .map((docSnapshot) => ({
      id: docSnapshot.id,
      requesterId: docSnapshot.data().requesterId,
      requesterName: docSnapshot.data().requesterName || 'Learner',
      requesterEmail: docSnapshot.data().requesterEmail || '',
      requesterPhotoURL: docSnapshot.data().requesterPhotoURL || '',
      recipientId: docSnapshot.data().recipientId || '',
      createdAt: toDate(docSnapshot.data().createdAt),
    } as FriendRequest))
    .sort((left, right) => toDate(right.createdAt).getTime() - toDate(left.createdAt).getTime());
  callback(requests);
});

export const subscribeToFriends = (
  uid: string,
  callback: (friends: FriendConnection[]) => void,
) => onSnapshot(collection(db, 'users', uid, 'friends'), (snapshot) => {
  const friends = snapshot.docs
    .map((docSnapshot) => ({
      id: docSnapshot.id,
      friendId: docSnapshot.data().friendId || docSnapshot.id,
      friendName: docSnapshot.data().friendName || 'Friend',
      friendEmail: docSnapshot.data().friendEmail || '',
      friendPhotoURL: docSnapshot.data().friendPhotoURL || '',
      directCommunityId: docSnapshot.data().directCommunityId || '',
      createdAt: toDate(docSnapshot.data().createdAt),
    } as FriendConnection))
    .sort((left, right) => left.friendName.localeCompare(right.friendName));
  callback(friends);
});

export const subscribeToCommunityMemberships = (
  uid: string,
  callback: (rooms: CommunityRoom[]) => void,
) => onSnapshot(collection(db, 'users', uid, 'communityMemberships'), (snapshot) => {
  const memberships = snapshot.docs
    .map((docSnapshot) => ({
      id: docSnapshot.id,
      name: docSnapshot.data().name || 'Community',
      description: docSnapshot.data().description || '',
      type: docSnapshot.data().type || 'group',
      ownerId: docSnapshot.data().ownerId || '',
      ownerName: docSnapshot.data().ownerName || '',
      createdAt: toDate(docSnapshot.data().createdAt),
      updatedAt: toDate(docSnapshot.data().updatedAt),
      photoURL: docSnapshot.data().photoURL || '',
    } as CommunityRoom))
    .sort((left, right) => left.name.localeCompare(right.name));
  callback(memberships);
});

export const subscribeToCommunityRoom = (
  communityId: string,
  callback: (room: CommunityRoom | null) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(db, 'communities', communityId),
  (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback({
      id: snapshot.id,
      name: snapshot.data().name || 'Community',
      description: snapshot.data().description || '',
      type: snapshot.data().type || 'group',
      ownerId: snapshot.data().ownerId || '',
      ownerName: snapshot.data().ownerName || '',
      memberIds: Array.isArray(snapshot.data().memberIds) ? snapshot.data().memberIds : [],
      createdAt: toDate(snapshot.data().createdAt),
      updatedAt: toDate(snapshot.data().updatedAt),
      photoURL: snapshot.data().photoURL || '',
    } as CommunityRoom);
  },
  (error) => onError(error as Error),
);
