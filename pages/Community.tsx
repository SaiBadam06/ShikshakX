import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Input, Button, Avatar, List, message } from 'antd';
import { MessageOutlined, SendOutlined } from '@ant-design/icons';
import '../styles/community.css';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: any;
}

export default function Community() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, orderBy('timestamp'));
      
      unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const messagesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Message[];
          
          setMessages(messagesData);
          setIsLoading(false);
        },
        (error) => {
          console.error('Error fetching messages:', error);
          message.error('Failed to load messages');
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Error setting up Firestore listener:', error);
      message.error('Failed to connect to chat service');
      setIsLoading(false);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    
    try {
      await addDoc(collection(db, 'messages'), {
        text: messageText,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        userAvatar: currentUser.photoURL || '',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      message.error('Failed to send message. Please try again.');
      // Restore the message if sending failed
      setNewMessage(messageText);
    }
  };

  return (
    <div className="community-container">
      <div className="chat-header">
        <h2>Community Chat</h2>
        <p>Connect with other learners</p>
      </div>
      
      <div className="messages-container">
        {isLoading ? (
          <div className="loading-messages">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">No messages yet. Be the first to say hello!</div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="message">
              <Avatar src={msg.userAvatar} />
              <div className="message-content">
                <div className="message-header">
                  <span className="user-name">{msg.userName}</span>
                  <span className="timestamp">
                    {msg.timestamp?.toDate ? 
                      new Date(msg.timestamp.toDate()).toLocaleTimeString() : 
                      'Just now'}
                  </span>
                </div>
                <div className="message-text">{msg.text}</div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="message-input">
        <Input.TextArea
          rows={2}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type a message..."
        />
        <Button 
          type="primary" 
          icon={<SendOutlined />}
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
          className="send-button"
        />
      </div>
    </div>
  );
}
