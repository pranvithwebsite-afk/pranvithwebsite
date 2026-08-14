import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Bot, Send, Zap, Sliders, Film, Loader2 } from 'lucide-react';
import { askCameraAi } from '../lib/api';

import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const QUICK_PROMPTS = [
  'Sony S-Log3 Exposure',
  'Low-Light Wedding Settings',
  '4K 60fps Slow Motion',
  'Fix 50Hz/60Hz Light Flicker',
  'Golden Hour Color Grade',
];

const parseBoldText = (str, keyPrefix = '') => {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${keyPrefix}-b-${pIdx}`} className="text-[#f97316] font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

const parseInlineContent = (str, keyPrefix = '') => {
  if (!str) return null;
  const regex = /\[([^\]]+)\]\s*\(([^)]+)\)/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    const textBefore = str.substring(lastIndex, match.index);
    if (textBefore) {
      elements.push(...parseBoldText(textBefore, `${keyPrefix}-pre-${lastIndex}`));
    }
    const label = match[1].trim();
    const url = match[2].trim();
    const isInternal = url.startsWith('/');

    if (isInternal) {
      elements.push(
        <Link
          key={`${keyPrefix}-link-${match.index}`}
          to={url}
          className="inline-flex items-center gap-1.5 px-3 py-1 my-1 mr-1.5 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] text-white font-bold text-xs shadow-md shadow-[#ea580c]/30 hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer no-underline"
        >
          <span>{label}</span>
          <ExternalLink size={12} className="shrink-0 text-white/90" />
        </Link>
      );
    } else {
      elements.push(
        <a
          key={`${keyPrefix}-link-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#f97316] underline font-semibold hover:text-white transition cursor-pointer"
        >
          <span>{label}</span>
          <ExternalLink size={11} className="shrink-0" />
        </a>
      );
    }
    lastIndex = regex.lastIndex;
  }

  const remainingText = str.substring(lastIndex);
  if (remainingText) {
    elements.push(...parseBoldText(remainingText, `${keyPrefix}-post-${lastIndex}`));
  }
  return elements;
};

const FormattedAiText = ({ text }) => {
  const lines = String(text || '').split('\n');
  return (
    <div className="space-y-1.5 text-xs md:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-1.5" />;
        const isBullet = line.startsWith('•');
        return (
          <div key={idx} className={isBullet ? 'pl-2 text-white/95' : 'text-white/90'}>
            {parseInlineContent(line, `ai-l-${idx}`)}
          </div>
        );
      })}
    </div>
  );
};

const AiToolsSection = () => {
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: '🎬 **Welcome to Pranvith Camera AI!**\n\nAsk any camera setting, picture profile (S-Log3, C-Log3, V-Log), exposure rule, slow-motion frame rate, or on-set cinematography question.',
    },
    {
      sender: 'user',
      text: 'How should I expose S-Log3 on Sony FX3 for wedding receptions?',
    },
    {
      sender: 'ai',
      text: '🎥 **Sony S-Log3 Wedding Reception Settings:**\n\n• **Base ISO:** Switch directly to Base 2 (**ISO 12,800**) to eliminate shadow grain.\n• **Exposure:** Expose at **+1.7 to +2.0 EV** (ETTR).\n• **Shutter:** 1/50s at 24/25fps or 1/100s for 50fps.\n• **Gamut:** S-Gamut3.Cine.\n• **Pro Tip:** Keep skin tones between 52-55% Zebra!',
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isTyping]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isTyping) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const history = chatMessages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));
      const aiResponse = await askCameraAi(userMsg, history);
      setChatMessages((prev) => [...prev, { sender: 'ai', text: aiResponse }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: '⚡ **Pranvith Camera AI:** Ready to assist! Please try asking again.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickPrompt = (promptText) => {
    setChatInput(promptText);
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { sender: 'user', text: promptText }]);
      setIsTyping(true);
      askCameraAi(promptText)
        .then((res) => {
          setChatMessages((prev) => [...prev, { sender: 'ai', text: res }]);
        })
        .finally(() => setIsTyping(false));
      setChatInput('');
    }, 50);
  };

  return (
    <section className="section-block site-section--base relative py-24 px-6 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(234,88,12,0.12),transparent_60%)] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ea580c]/15 border border-[#ea580c]/35 text-[#f97316] text-xs font-semibold uppercase tracking-wider mb-5">
            <Bot size={14} className="text-[#ea580c]" />
            <span>AI-POWERED TOOLS</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] text-white">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#f97316] to-[#ea580c]">AI</span>{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-[#93c5fd] to-[#60a5fa]">Camera Assistant</span>
          </h2>

          <p className="mt-5 text-white/65 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
            Instant on-set camera recipes, log exposure formulas, and color grading workflows powered by intelligent cinematography algorithms.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          <div className="cinematic-card p-6 border border-white/10 bg-[#0e1322] rounded-3xl hover:border-[#ea580c]/40 transition-all duration-300">
            <div className="h-12 w-12 rounded-2xl bg-[#ea580c]/15 border border-[#ea580c]/30 flex items-center justify-center text-[#f97316] mb-5">
              <Sliders size={22} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Smart Log & Exposure AI</h3>
            <p className="text-sm text-white/65 leading-relaxed">
              Calculate exact Dual Native ISO values, Zebra percentages, and 180° shutter angles for Sony S-Log3, Canon C-Log3, and V-Log.
            </p>
          </div>

          <div className="cinematic-card p-6 border border-white/10 bg-[#0e1322] rounded-3xl hover:border-[#3b82f6]/40 transition-all duration-300">
            <div className="h-12 w-12 rounded-2xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center text-[#60a5fa] mb-5">
              <Film size={22} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">On-Set Lighting & Flicker Fix</h3>
            <p className="text-sm text-white/65 leading-relaxed">
              Eliminate 50Hz/60Hz LED light banding and compute key-to-fill lighting ratios for dramatic wedding and commercial visuals.
            </p>
          </div>

          <div className="cinematic-card p-6 border border-white/10 bg-[#0e1322] rounded-3xl hover:border-emerald-500/40 transition-all duration-300">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5">
              <Zap size={22} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Color Space & LUT Matching</h3>
            <p className="text-sm text-white/65 leading-relaxed">
              Seamlessly match multi-cam timelines across Sony, Canon, and Blackmagic using custom CST node pipelines in Premiere & Resolve.
            </p>
          </div>
        </div>

        {/* Interactive AI Chat Box */}
        <div className="relative mx-auto max-w-4xl rounded-3xl border border-white/12 bg-[#0b0f19]/90 p-6 md:p-8 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#ea580c] to-[#3b82f6] flex items-center justify-center text-white font-bold text-xs shadow-[0_0_15px_rgba(234,88,12,0.4)]">
                AI
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">PranvithDOP Camera AI</h4>
                <p className="text-xs text-white/50">Live Cinematography Technician</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Ready</span>
            </div>
          </div>

          {/* Quick Prompt Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
            <span className="text-[11px] font-semibold uppercase text-white/40 shrink-0">Try:</span>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleQuickPrompt(prompt)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-white/6 border border-white/10 text-white/80 hover:bg-[#ea580c]/20 hover:border-[#ea580c]/40 hover:text-white transition duration-200"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Conversation */}
          <div className="space-y-4 mb-5 min-h-[200px] max-h-[340px] overflow-y-auto pr-2 scrollbar-thin">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 text-sm ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="h-8 w-8 rounded-full bg-[#ea580c]/20 border border-[#ea580c]/40 flex items-center justify-center shrink-0 text-[#f97316]">
                    <Sparkles size={14} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white rounded-br-none shadow-[0_4px_15px_rgba(234,88,12,0.3)] font-medium text-xs md:text-sm'
                      : 'bg-white/6 border border-white/10 rounded-bl-none text-white'
                  }`}
                >
                  {msg.sender === 'ai' ? <FormattedAiText text={msg.text} /> : msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 text-sm justify-start">
                <div className="h-8 w-8 rounded-full bg-[#ea580c]/20 border border-[#ea580c]/40 flex items-center justify-center shrink-0 text-[#f97316]">
                  <Sparkles size={14} className="animate-spin" />
                </div>
                <div className="bg-white/6 border border-white/10 rounded-2xl rounded-bl-none px-4 py-3 text-xs text-white/70 flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-[#f97316]" />
                  <span>Analyzing camera profile & calculating exposure...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Form Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask camera settings (e.g. Sony A7 IV S-Log3 sunset portrait, 60fps slowmo...)"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#ea580c]/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isTyping}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] disabled:opacity-50 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 shadow-[0_4px_20px_rgba(234,88,12,0.35)]"
            >
              {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default AiToolsSection;
