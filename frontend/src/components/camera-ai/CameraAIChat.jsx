import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Send, X } from 'lucide-react';
import CameraOrb from './CameraOrb';
import CameraMessage from './CameraMessage';

const prompts = ['Wedding settings', 'Night photography', 'Golden hour', 'Cinematic video', 'Low light', 'Creative shoot ideas'];

const CameraAIChat = ({ open, onClose, onMinimize, messages, loading, error, onSend }) => {
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const historyRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(timer);
  }, [open]);
  useEffect(() => { historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, loading]);

  const submit = useCallback((value = draft) => {
    const message = value.trim();
    if (!message || loading) return;
    setDraft('');
    onSend(message);
  }, [draft, loading, onSend]);

  return (
    <AnimatePresence>
      {open && <motion.aside className="camera-ai-chat" role="dialog" aria-modal="false" aria-label="Camera AI assistant" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} transition={{ duration: 0.24 }}>
        <header className="camera-ai-chat__header">
          <div className="camera-ai-avatar"><CameraOrb compact active={false} /></div>
          <div><h2>Camera AI</h2><p>PranvithDOP Assistant</p><span className="camera-ai-online"><i />Online</span></div>
          <div className="camera-ai-header-actions"><button type="button" onClick={onMinimize} aria-label="Minimize Camera AI"><ChevronDown size={18} /></button><button type="button" onClick={onClose} aria-label="Close Camera AI"><X size={18} /></button></div>
        </header>
        <div className="camera-ai-chat__history" ref={historyRef}>
          {!messages.length && <div className="camera-ai-welcome"><p>Hey <span aria-hidden="true">👋</span><br />Tell me your camera, lens and shooting situation.<br />I&apos;ll help you choose the right settings.</p><div className="camera-ai-prompts">{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => submit(prompt)}>{prompt}</button>)}</div></div>}
          {messages.map((message) => <CameraMessage key={message.id} message={message} />)}
          {loading && <div className="camera-ai-typing" role="status" aria-label="Camera AI is typing"><span>Thinking</span><i /><i /><i /></div>}
          {error && <p className="camera-ai-error" role="alert" aria-live="assertive">{error}</p>}
        </div>
        <form className="camera-ai-composer" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <textarea ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }} rows="1" placeholder="Ask about cameras, settings, lenses..." aria-label="Message Camera AI" />
          <button type="submit" disabled={!draft.trim() || loading} aria-label="Send message"><Send size={17} /></button>
        </form>
      </motion.aside>}
    </AnimatePresence>
  );
};

export default memo(CameraAIChat);
