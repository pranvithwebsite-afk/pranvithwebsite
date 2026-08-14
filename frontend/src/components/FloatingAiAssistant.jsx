import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  MessageSquare,
  Sparkles,
  Star,
  X,
  Trash2,
  Send,
  ShoppingBag,
  Download,
  CreditCard,
  Package,
  HelpCircle,
  Headphones,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { askCameraAi } from '../lib/api';
import { Link } from 'react-router-dom';

const SHORTCUTS = [
  { id: 'find_product', label: 'Find a Product', icon: ShoppingBag, prompt: 'What editing packs, LUTs, and presets are available?' },
  { id: 'product_rec', label: 'Product Recommendation', icon: Star, prompt: 'Which LUT pack or preset is best for Sony and Canon wedding videos?' },
  { id: 'download_help', label: 'Download Help', icon: Download, prompt: 'How do I download my purchased assets and what if my link expired?' },
  { id: 'payment_help', label: 'Payment Help', icon: CreditCard, prompt: 'What payment methods do you support and how does Razorpay checkout work?' },
  { id: 'order_help', label: 'Order Help', icon: Package, prompt: 'How do I check my order status or re-access my download token?' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, prompt: 'What is your commercial license policy and software compatibility?' },
  { id: 'support', label: 'Talk to Support', icon: Headphones, prompt: 'How can I contact PranvithDOP support directly?' },
];

const parseBoldText = (str, keyPrefix = '') => {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${keyPrefix}-b-${pIdx}`} className="text-[#ff8a5c] font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

const parseInlineContent = (str, keyPrefix = '', onLinkClick) => {
  if (!str) return null;
  // Match [label](url) even when label contains parentheses like (₹149)
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
          onClick={onLinkClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 my-1 mr-1.5 rounded-xl bg-gradient-to-r from-[#ff5a1f] to-[#ea580c] hover:from-[#e04e17] hover:to-[#ff5a1f] text-white font-bold text-xs shadow-md shadow-[#ea580c]/30 hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer no-underline"
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
          className="inline-flex items-center gap-1 text-[#ff8a5c] underline font-semibold hover:text-white transition cursor-pointer"
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

const FormattedAiMessage = ({ text, onLinkClick }) => {
  const lines = String(text || '').split('\n');
  return (
    <div className="space-y-1.5 text-xs md:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-1.5" />;
        const isBullet = line.startsWith('•');
        return (
          <div key={idx} className={isBullet ? 'pl-2 text-white/95' : 'text-white/90'}>
            {parseInlineContent(line, `l-${idx}`, onLinkClick)}
          </div>
        );
      })}
    </div>
  );
};

const FloatingAiAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('pranvith_ai_chat');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [isOpen, messages, isTyping]);

  useEffect(() => {
    try {
      sessionStorage.setItem('pranvith_ai_chat', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  const handleSend = async (customPrompt) => {
    const textToSend = typeof customPrompt === 'string' ? customPrompt : input;
    if (!textToSend.trim() || isTyping) return;

    const userMsg = textToSend.trim();
    if (typeof customPrompt !== 'string') setInput('');

    const newHistory = [...messages, { sender: 'user', text: userMsg }];
    setMessages(newHistory);
    setIsTyping(true);

    try {
      const history = newHistory.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      let response = '';
      const q = userMsg.toLowerCase();

      if (q.includes('find a product') || q.includes('available') || q.includes('packs')) {
        response = `🛍️ **PranvithDOP Editing Packs & Assets:**\n\n• **Wedding LUTs Master Pack:** 15+ high-grade cinematic LUTs calibrated for Sony S-Log3, Canon C-Log3, and Rec.709.\n• **Cinematic Sound FX Bundle:** 200+ whooshes, risers, impacts, and ambient soundscapes.\n• **Motion Transitions & Overlay Presets:** Seamless zooms, light leaks, and glitch transitions.\n• **Album PSD Templates:** Professional photo editing grids.\n\n👉 [Explore All Assets](/assets)`;
      } else if (q.includes('download help') || q.includes('download') || q.includes('expired')) {
        response = `📥 **Download Instructions:**\n\n1. Instant access is provided immediately after payment on the confirmation page.\n2. A download token link is also automatically sent to your billing email.\n3. If your token expired or you lost the email, send your Order ID to **info@pranvithdop.com** for instant renewal!`;
      } else if (q.includes('payment') || q.includes('methods') || q.includes('razorpay')) {
        response = `💳 **Payment & Checkout:**\n\n• We accept **UPI (GPay, PhonePe, Paytm)**, **Credit/Debit Cards**, **Net Banking**, and **International Cards** via Razorpay.\n• 100% encrypted and instant automatic delivery!`;
      } else if (q.includes('order help') || q.includes('status')) {
        response = `📦 **Order Status & Downloads:**\n\n• All digital assets are delivered instantly upon successful payment.\n• Please check your email inbox and spam folder for the download receipt.\n• Need instant re-send? Contact our support team below!`;
      } else if (q.includes('support') || q.includes('contact') || q.includes('talk to support')) {
        response = `💬 **Contact PranvithDOP Support:**\n\n• **Email:** info@pranvithdop.com\n• **WhatsApp / Phone:** +91 9059867883\n• **Location:** Hyderabad, India\n• **Hours:** 24/7 Response time for digital downloads & enquiries.`;
      } else {
        response = await askCameraAi(userMsg, history);
      }

      setMessages((prev) => [...prev, { sender: 'ai', text: response }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: '⚡ **Pranvith AI Assistant:** How can I help you today? Ask about presets, downloads, camera profiles, or support!',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    try {
      sessionStorage.removeItem('pranvith_ai_chat');
    } catch (e) {}
  };

  return (
    <>
      {/* Floating Chat Modal Popup */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-[999] w-[calc(100vw-2rem)] sm:w-[410px] max-h-[640px] h-[84vh] rounded-3xl border border-[#ff5a1f]/35 bg-[#07090e]/95 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_35px_rgba(255,90,31,0.15)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-label="Pranvith AI Assistant Chat"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/60 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff5a1f] to-[#0877ff] text-white shadow-[0_0_20px_rgba(255,90,31,0.4)]">
                <Camera size={20} className="text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#07090e] bg-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide font-[Space_Grotesk]">
                    Camera <span className="text-[#ff5a1f]">AI</span>
                  </h3>
                  <span className="rounded-md bg-[#ff5a1f]/20 border border-[#ff5a1f]/40 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#ff8a5c]">
                    PRO
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-white/60 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online • Instant Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClear}
                title="Clear Chat"
                className="h-8 w-8 rounded-xl flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="h-8 w-8 rounded-xl flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat Body & Conversation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {/* Welcome Card & Shortcuts (shown when empty or at top) */}
            <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,90,31,0.08),rgba(7,9,14,0.6)_50%,rgba(8,119,255,0.08))] p-5 text-center shadow-lg">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff5a1f]/15 border border-[#ff5a1f]/30 text-[#ff8a5c] shadow-[0_0_20px_rgba(255,90,31,0.25)]">
                <MessageSquare size={22} />
              </div>
              <h4 className="text-base font-bold text-white font-[Space_Grotesk]">
                Hi 👋 Welcome to <span className="text-[#ff5a1f]">PranvithDOP!</span>
              </h4>
              <p className="mt-1.5 text-xs text-white/65 leading-relaxed max-w-xs mx-auto">
                I can help you explore editing packs, find presets, verify order downloads, and answer camera & technical questions.
              </p>

              {/* Quick Shortcuts Grid */}
              <div className="mt-4 pt-3 border-t border-white/10 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#ff8a5c] mb-2.5">
                  QUICK SHORTCUTS:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SHORTCUTS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSend(item.prompt)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] hover:bg-[#ff5a1f]/20 hover:border-[#ff5a1f]/50 px-3 py-1.5 text-[11px] font-medium text-white/90 hover:text-white transition duration-200"
                      >
                        <Icon size={12} className="text-[#ff8a5c]" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chat Message Bubbles */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 text-sm ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="h-7 w-7 rounded-xl bg-[#ff5a1f]/15 border border-[#ff5a1f]/35 flex items-center justify-center shrink-0 text-[#ff8a5c] mt-0.5">
                    <Sparkles size={13} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#ff5a1f] to-[#ea580c] text-white rounded-br-none font-medium shadow-md shadow-[#ea580c]/30 text-xs md:text-sm'
                      : 'bg-white/[0.06] border border-white/10 rounded-bl-none text-white shadow-md'
                  }`}
                >
                  {msg.sender === 'ai' ? <FormattedAiMessage text={msg.text} /> : msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 text-sm justify-start">
                <div className="h-7 w-7 rounded-xl bg-[#ff5a1f]/15 border border-[#ff5a1f]/35 flex items-center justify-center shrink-0 text-[#ff8a5c]">
                  <Sparkles size={13} className="animate-spin" />
                </div>
                <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs text-white/70 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-[#ff5a1f]" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3.5 border-t border-white/10 bg-black/80 shrink-0">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about presets, order downloads, camera settings..."
                className="w-full rounded-2xl border border-[#ff5a1f]/35 bg-white/[0.05] py-3 pl-4 pr-12 text-xs md:text-sm text-white placeholder:text-white/40 focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f] focus:outline-none shadow-inner"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-[#ff5a1f] to-[#ea580c] text-white shadow-md shadow-[#ea580c]/40 hover:brightness-110 disabled:opacity-40 transition"
                aria-label="Send message"
              >
                {isTyping ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </form>
            <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-white/40">
              <span>Camera AI Assistant</span>
              <span className="flex items-center gap-1 text-emerald-400/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Support Verified
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Minimized Floating Trigger Button (Bottom Right) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-[998] flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff5a1f] via-[#ea580c] to-[#0877ff] text-white shadow-[0_8px_30px_rgba(255,90,31,0.55)] hover:scale-105 active:scale-95 transition-all duration-300 group border border-white/20"
        aria-label="Open Camera AI Chat"
      >
        {isOpen ? (
          <X size={26} className="transition-transform duration-200 group-hover:rotate-90" />
        ) : (
          <div className="relative flex items-center justify-center">
            <Camera size={24} className="transition-transform duration-300 group-hover:scale-110" />
            <Sparkles
              size={12}
              className="absolute -top-1.5 -right-2 text-yellow-300 fill-yellow-400 animate-pulse"
            />
            {hasUnread && (
              <span className="absolute -top-3 -right-3 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5a1f] opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#ff5a1f] border-2 border-black" />
              </span>
            )}
          </div>
        )}
      </button>
    </>
  );
};

export default FloatingAiAssistant;

