import { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface CreateChannelModalProps {
  visible: boolean;
  onCancel: () => void;
  onCreate: (channelId: string) => void;
  userId: string;
}

export default function CreateChannelModal({ visible, onCancel, onCreate, userId }: CreateChannelModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const channelsRef = collection(db, 'channels');
      const docRef = await addDoc(channelsRef, {
        name: values.name,
        description: values.description || '',
        isPrivate: false,
        createdBy: userId,
        createdAt: serverTimestamp(),
        memberCount: 1,
        members: [userId]
      });
      
      message.success('Channel created successfully');
      onCreate(docRef.id);
      form.resetFields();
    } catch (error) {
      console.error('Error creating channel:', error);
      message.error('Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Create New Channel"
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="name"
          label="Channel Name"
          rules={[
            { required: true, message: 'Please enter a channel name' },
            { max: 50, message: 'Channel name must be less than 50 characters' }
          ]}
        >
          <Input placeholder="e.g., Study Group #1" />
        </Form.Item>
        
        <Form.Item
          name="description"
          label="Description (Optional)"
          rules={[
            { max: 200, message: 'Description must be less than 200 characters' }
          ]}
        >
          <Input.TextArea rows={3} placeholder="What's this channel about?" />
        </Form.Item>
        
        <Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button onClick={onCancel}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create Channel
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}
