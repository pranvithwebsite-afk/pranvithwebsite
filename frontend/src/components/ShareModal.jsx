import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Mail, Smartphone, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard, getProductShareUrl, safeImageSrc, handleImageError } from '../lib/utils';

// Brand Social SVG Icons for clean, high-fidelity rendering
const WhatsAppIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.301-.15-1.782-.879-2.058-.979-.276-.1-.476-.15-.676.15-.2.301-.776.979-.951 1.18-.175.2-.351.225-.652.075-.301-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.675-2.084-.175-.301-.019-.464.132-.614.135-.135.301-.351.451-.527.15-.175.2-.301.301-.501.1-.2.05-.376-.025-.526-.075-.15-.676-1.629-.926-2.23-.244-.587-.493-.507-.676-.516l-.576-.01c-.2 0-.526.075-.802.376s-1.053 1.028-1.053 2.507 1.078 2.908 1.228 3.109c.15.2 2.122 3.24 5.141 4.544.718.31 1.279.496 1.716.635.721.229 1.377.197 1.896.119.578-.087 1.782-.728 2.032-1.431.25-.703.25-1.305.175-1.431-.075-.125-.276-.2-.577-.35zM12.042 2C6.516 2 2.03 6.486 2.03 12.012c0 1.983.58 3.832 1.586 5.39L2 22l4.743-1.545c1.503.882 3.247 1.385 5.3 1.385 5.525 0 10.012-4.486 10.012-10.012C22.054 6.486 17.568 2 12.042 2z" />
  </svg>
);

const XTwitterIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TelegramIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const LinkedInIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.65 1.65 0 1 0 0 3.3 1.65 1.65 0 0 0 0-3.3z" />
  </svg>
);

const FacebookIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export default function ShareModal({ product, open, onClose, fallbackUrl }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = getProductShareUrl(product, fallbackUrl);
  const title = product?.title || product?.name || 'Asset';
  const category = product?.category || 'Creative Asset';
  const isFree = product?.is_free === true || product?.isFree === true || product?.price === 0;
  const price = product?.price;
  const image = safeImageSrc(product?.hero_image || product?.image || product?.heroImage || product?.thumbnail_url || product?.images?.[0] || '');
  const hasNativeShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error('Could not copy link');
    }
  };

  const handleNativeShare = async () => {
    if (!hasNativeShare || !shareUrl) return;
    try {
      await navigator.share({
        title: `${title} | Pranvith DOP`,
        text: `Check out ${title} on Pranvith DOP:`,
        url: shareUrl,
      });
    } catch (err) {
      if (err?.name !== 'AbortError') {
        toast.error('Could not open share sheet');
      }
    }
  };

  const shareText = `Check out ${title} on Pranvith DOP:\n${shareUrl}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(`Check out ${title} on Pranvith DOP`);
  const encodedUrl = encodeURIComponent(shareUrl);

  const socialChannels = [
    {
      name: 'WhatsApp',
      icon: WhatsAppIcon,
      href: `https://api.whatsapp.com/send?text=${encodedText}`,
      color: 'hover:bg-[#25D366]/15 hover:border-[#25D366]/40 text-[#25D366]',
    },
    {
      name: 'X (Twitter)',
      icon: XTwitterIcon,
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      color: 'hover:bg-white/10 hover:border-white/30 text-white',
    },
    {
      name: 'Telegram',
      icon: TelegramIcon,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'hover:bg-[#0088cc]/15 hover:border-[#0088cc]/40 text-[#0088cc]',
    },
    {
      name: 'LinkedIn',
      icon: LinkedInIcon,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'hover:bg-[#0077b5]/15 hover:border-[#0077b5]/40 text-[#0077b5]',
    },
    {
      name: 'Facebook',
      icon: FacebookIcon,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'hover:bg-[#1877F2]/15 hover:border-[#1877F2]/40 text-[#1877F2]',
    },
    {
      name: 'Email',
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}`,
      color: 'hover:bg-[#ff8a5c]/15 hover:border-[#ff8a5c]/40 text-[#ff8a5c]',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-[#0a0b0e] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.85)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle top glow highlight */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-40 w-72 rounded-full bg-gradient-to-b from-[#ff4d00]/25 to-transparent blur-2xl" />

        {/* Header */}
        <div className="relative mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#ff8a5c]">
              <Share2 size={18} />
            </div>
            <div>
              <h2 id="share-modal-title" className="text-lg font-bold text-white tracking-tight">
                Share this Asset
              </h2>
              <p className="text-xs text-white/50">Send link to friends or collaborators</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Product preview card */}
        <div className="relative mb-5 flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur">
          {image ? (
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
              <img
                src={image}
                alt={title}
                className="h-full w-full object-cover"
                onError={handleImageError}
              />
            </div>
          ) : (
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#ff4d00]/20 to-[#1683ff]/20 text-white font-bold">
              <Share2 size={20} className="text-white/70" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/60">
                {category}
              </span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ${
                isFree ? 'bg-[#3b82f6]/20 text-[#93c5fd] border border-[#3b82f6]/30' : 'bg-[#ff4d00]/20 text-[#ff8a5c] border border-[#ff4d00]/30'
              }`}>
                {isFree ? 'FREE' : price ? `₹${price}` : 'PRO'}
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-white">{title}</p>
          </div>
        </div>

        {/* Link input with 1-click copy */}
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/45">
            Page Link
          </label>
          <div className="relative flex items-center rounded-xl border border-white/12 bg-black/60 p-1.5 focus-within:border-[#ff4d00]/60 transition">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onClick={(e) => e.target.select()}
              className="w-full bg-transparent px-3 py-1.5 text-xs text-white/85 focus:outline-none select-all truncate"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition flex-shrink-0 ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-[#ff4d00] hover:bg-[#ff6a2f] text-white shadow-[0_4px_14px_rgba(255,77,0,0.3)]'
              }`}
            >
              {copied ? (
                <>
                  <Check size={14} className="animate-in zoom-in" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Share destinations */}
        <div className="mb-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">
            Share on
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
            {socialChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <a
                  key={channel.name}
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-center transition ${channel.color}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[11px] font-medium text-white/80">{channel.name}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Native share sheet trigger if supported */}
        {hasNativeShare && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-white transition hover:border-white/25 hover:bg-white/10"
            >
              <Smartphone size={15} />
              Share via device apps / AirDrop
              <ExternalLink size={13} className="text-white/50" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
