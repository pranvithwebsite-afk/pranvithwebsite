import { api } from '../lib/api';

export const sendCameraAiMessage = async ({ message, conversationId, history }) => {
  try {
    const { data } = await api.post('/camera-ai/chat', { message, conversation_id: conversationId || undefined, history });
    if (!data?.message || !data?.conversation_id) throw new Error('Camera AI returned an incomplete response.');
    return data;
  } catch (error) {
    if (error?.response?.status === 429) throw new Error('Camera AI is busy right now. Please wait a moment and try again.');
    throw new Error('Camera AI is having trouble responding right now. Please try again.');
  }
};
