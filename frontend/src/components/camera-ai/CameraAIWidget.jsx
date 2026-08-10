import React, { useCallback, useEffect, useRef, useState } from 'react';
import CameraAILauncher from './CameraAILauncher';
import CameraAIChat from './CameraAIChat';
import { sendCameraAiMessage } from '../../services/cameraAiService';
import './camera-ai.css';

export const openCameraAI = () => window.dispatchEvent(new Event('open-camera-ai'));

const CameraAIWidget = () => {
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const openWidget = () => setOpen(true);
    const onKeyDown = (event) => { if (event.key === 'Escape') close(); };
    window.addEventListener('open-camera-ai', openWidget);
    window.addEventListener('keydown', onKeyDown);
    window.openCameraAI = openCameraAI;
    return () => { window.removeEventListener('open-camera-ai', openWidget); window.removeEventListener('keydown', onKeyDown); delete window.openCameraAI; };
  }, [close]);
  useEffect(() => {
    if (sessionStorage.getItem('camera-ai-hint-seen')) return undefined;
    const timer = window.setTimeout(() => setShowHint(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  const dismissHint = useCallback(() => { setShowHint(false); sessionStorage.setItem('camera-ai-hint-seen', 'true'); }, []);
  const handleOpen = useCallback(() => { dismissHint(); setOpen((value) => !value); }, [dismissHint]);
  const send = useCallback(async (content) => {
    const createId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    const userMessage = { id: createId(), role: 'user', content };
    const history = messagesRef.current.map(({ role, content: text }) => ({ role, content: text }));
    setMessages((current) => [...current, userMessage]); setLoading(true); setError('');
    try {
      const result = await sendCameraAiMessage({ message: content, conversationId, history });
      setConversationId(result.conversation_id || conversationId);
      setMessages((current) => [...current, { id: createId(), role: 'assistant', content: result.message, settings: result.settings }]);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [conversationId]);

  return <div className="camera-ai-widget">{showHint && !open && <div className="camera-ai-hint"><button type="button" onClick={dismissHint} aria-label="Dismiss Camera AI hint">×</button><strong>Need help with camera settings?</strong><span>Ask Camera AI — Free</span></div>}<CameraAIChat open={open} onClose={close} onMinimize={close} messages={messages} loading={loading} error={error} onSend={send} /><CameraAILauncher open={open} onClick={handleOpen} /></div>;
};

export default CameraAIWidget;
