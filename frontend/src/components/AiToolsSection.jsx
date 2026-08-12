import React, { useState } from 'react';
import { Sparkles, Bot, Send, Zap, Sliders, Film } from 'lucide-react';

const AiToolsSection = () => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'user', text: 'Can you generate cinematic lower thirds for my travel vlog?' },
    { sender: 'ai', text: 'Sure! I have generated 3 motion title presets matching your clip color palette.' },
  ]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: userMsg },
      { sender: 'ai', text: 'Applying smart AI color correction and audio enhancement to your timeline...' },
    ]);
    setChatInput('');
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
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-[#93c5fd] to-[#60a5fa]">Powered Tools</span>
          </h2>

          <p className="mt-5 text-white/65 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
            Create, edit, and transform your creative workflow with our suite of next-generation AI video tools built right into your timeline.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-16">
          <div className="cinematic-card p-6 border border-white/10 bg-[#0e1322] rounded-3xl hover:border-[#ea580c]/40 transition-all duration-300">
            <div className="h-12 w-12 rounded-2xl bg-[#ea580c]/15 border border-[#ea580c]/30 flex items-center justify-center text-[#f97316] mb-5">
              <Sliders size={22} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Smart Color Match AI</h3>
            <p className="text-sm text-white/65 leading-relaxed">
              Match color grades instantly across different camera logs and lighting conditions with one-click neural LUT matching.
            </p>
          </div>

          <div className="cinematic-card p-6 border border-white/10 bg-[#0e1322] rounded-3xl hover:border-[#3b82f6]/40 transition-all duration-300">
            <div className="h-12 w-12 rounded-2xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center text-[#60a5fa] mb-5">
              <Film size={22} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Auto Cut & Transition AI</h3>
            <p className="text-sm text-white/65 leading-relaxed">
              Automatically detect scene transitions, silence gaps, and beat markers to generate polished draft edits in seconds.
            </p>
          </div>

          <div className="cinematic-card p-6 border border-white/10 bg-[#0e1322] rounded-3xl hover:border-emerald-500/40 transition-all duration-300">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5">
              <Zap size={22} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Audio Enhancement AI</h3>
            <p className="text-sm text-white/65 leading-relaxed">
              Isolate vocals, remove background room noise, and normalize audio tracks to studio master standards automatically.
            </p>
          </div>
        </div>

        {/* Interactive AI Chat Mockup */}
        <div className="relative mx-auto max-w-4xl rounded-3xl border border-white/12 bg-[#0b0f19]/90 p-6 md:p-8 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#ea580c] to-[#3b82f6] flex items-center justify-center text-white font-bold text-xs shadow-[0_0_15px_rgba(234,88,12,0.4)]">
                AI
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">PranvithDOP AI Studio Assistant</h4>
                <p className="text-xs text-white/50">Online • Ready to assist</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-white/60">Active Session</span>
            </div>
          </div>

          {/* Chat Conversation */}
          <div className="space-y-4 mb-6 min-h-[160px] max-h-[260px] overflow-y-auto pr-2">
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
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs md:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white rounded-br-none'
                      : 'bg-white/6 border border-white/10 text-white/90 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Form Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask AI to color grade, add LUTs, or generate titles..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#ea580c]/60 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] px-5 py-3 text-sm font-semibold text-white transition-all duration-300 shadow-[0_4px_20px_rgba(234,88,12,0.35)]"
            >
              <Send size={16} />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default AiToolsSection;
