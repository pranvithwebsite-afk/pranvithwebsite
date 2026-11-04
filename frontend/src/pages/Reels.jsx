import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Disc,
  ExternalLink,
  Heart,
  Info,
  Maximize2,
  Minimize2,
  Music,
  Pause,
  Play,
  RotateCcw,
  Share2,
  ShieldAlert,
  Sparkles,
  Tv,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchPublicReels, recordReelView, toggleReelLike } from '../lib/api';
import { FALLBACK_IMAGE, handleImageError, safeImageSrc } from '../lib/utils';
import { Link } from 'react-router-dom';

// Default sponsor / advertiser cards for realistic Google Ad Manager simulation
const SPONSOR_ADS = [
  {
    sponsor: 'Pranvith Creative LUT Pack',
    tagline: 'Transform Your Footage to S-Log3 Cinematic Perfection',
    cta: 'Get LUT Pack for ₹49',
    url: '/assets',
    duration: 8,
    skipAfter: 5,
    badge: 'Sponsored Creative',
  },
  {
    sponsor: 'Cinematic Sound FX Pack',
    tagline: '100+ Professional 24-bit Impacts, Risers & Atmospheres',
    cta: 'Explore Audio FX',
    url: '/assets',
    duration: 7,
    skipAfter: 4,
    badge: 'Sponsored Audio',
  },
  {
    sponsor: 'Sony Alpha Filmmaking Masterclass',
    tagline: 'Master S-Log3, Dual Native ISO & 10-bit Color Science',
    cta: 'View Course Roadmap',
    url: '/courses',
    duration: 8,
    skipAfter: 5,
    badge: 'Official Training',
  },
];

const Reels = () => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [likedMap, setLikedMap] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [heartAnim, setHeartAnim] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [simulatedAdsEnabled, setSimulatedAdsEnabled] = useState(true);
  const [copied, setCopied] = useState(false);

  // Ad states
  const [currentAd, setCurrentAd] = useState(null); // { type: 'preroll' | 'midroll', reelId, sponsor, timeLeft, canSkip }
  const [adTimeRemaining, setAdTimeRemaining] = useState(0);
  const [canSkipAd, setCanSkipAd] = useState(false);
  const [viewedAdReels, setViewedAdReels] = useState(new Set()); // track pre-rolls shown
  const [midrollFiredReels, setMidrollFiredReels] = useState(new Set()); // track mid-rolls shown

  // Video progress
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const adTimerRef = useRef(null);
  const lastTapRef = useRef(0);

  // 1. Fetch active reels from backend
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchPublicReels();
        if (mounted) {
          const list = Array.isArray(data) && data.length ? data : [];
          setReels(list);
          const initialLikes = {};
          list.forEach((r) => {
            initialLikes[r.id] = r.likes_count || 0;
          });
          setLikeCounts(initialLikes);
        }
      } catch (err) {
        console.warn('Failed to fetch reels', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const activeReel = reels[activeIndex] || null;

  // 2. Playback control on index change
  useEffect(() => {
    if (!activeReel) return;

    // Reset progress and states
    setProgress(0);
    setCurrentTime(0);
    setExpandedDesc(false);

    // Record view in backend
    recordReelView(activeReel.id).catch(() => {});

    // Check pre-roll ad trigger
    const adSettings = activeReel.ad_settings || {};
    const shouldShowPreroll =
      simulatedAdsEnabled &&
      adSettings.pre_roll_enabled !== false &&
      !viewedAdReels.has(activeReel.id);

    if (shouldShowPreroll) {
      triggerAd('preroll', activeReel);
    } else {
      playCurrentVideo();
    }

    // Pause all other videos
    Object.keys(videoRefs.current).forEach((key) => {
      const v = videoRefs.current[key];
      if (v && key !== activeReel.id) {
        v.pause();
        v.currentTime = 0;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, reels, simulatedAdsEnabled]);

  const playCurrentVideo = () => {
    if (!activeReel) return;
    const currentVideo = videoRefs.current[activeReel.id];
    if (currentVideo && !userPaused) {
      currentVideo.muted = isMuted;
      currentVideo.play().catch(() => {
        // Autoplay policy fallback: mute and play
        currentVideo.muted = true;
        setIsMuted(true);
        currentVideo.play().catch(() => {});
      });
      setIsPlaying(true);
    }
  };

  // Trigger Google Ad Manager placeholder (pre-roll or mid-roll)
  const triggerAd = (type, reel) => {
    const video = videoRefs.current[reel.id];
    if (video) video.pause();
    setIsPlaying(false);

    const randomSponsor = SPONSOR_ADS[Math.floor(Math.random() * SPONSOR_ADS.length)];
    const adDuration = randomSponsor.duration || 7;
    const skipThreshold = randomSponsor.skipAfter || 4;

    setCurrentAd({
      type,
      reelId: reel.id,
      sponsor: randomSponsor,
      adTagUrl: reel.ad_settings?.ad_tag_url || '',
      gamUnit: reel.ad_settings?.gam_ad_unit_path || '/21775744923/pranvith_reels_video',
    });
    setAdTimeRemaining(adDuration);
    setCanSkipAd(false);

    if (type === 'preroll') {
      setViewedAdReels((prev) => new Set([...prev, reel.id]));
    } else if (type === 'midroll') {
      setMidrollFiredReels((prev) => new Set([...prev, reel.id]));
    }

    clearInterval(adTimerRef.current);
    let remaining = adDuration;

    adTimerRef.current = setInterval(() => {
      remaining -= 1;
      setAdTimeRemaining(remaining);
      if (adDuration - remaining >= skipThreshold) {
        setCanSkipAd(true);
      }
      if (remaining <= 0) {
        clearInterval(adTimerRef.current);
        finishAd(reel.id);
      }
    }, 1000);
  };

  const finishAd = (reelId) => {
    clearInterval(adTimerRef.current);
    setCurrentAd(null);
    setAdTimeRemaining(0);
    setCanSkipAd(false);

    const video = videoRefs.current[reelId];
    if (video && !userPaused) {
      video.muted = isMuted;
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSkipAd = () => {
    if (!currentAd) return;
    finishAd(currentAd.reelId);
  };

  // Video time update: progress bar and mid-roll cue detector
  const handleTimeUpdate = (e) => {
    const video = e.target;
    if (!video || !video.duration) return;

    const current = video.currentTime;
    const total = video.duration;
    setCurrentTime(current);
    setDuration(total);
    setProgress((current / total) * 100);

    // Check mid-roll ad cue point
    if (activeReel && simulatedAdsEnabled) {
      const ad = activeReel.ad_settings || {};
      const cuePoint = Number(ad.mid_roll_cue_seconds) || 10;
      if (
        ad.mid_roll_enabled !== false &&
        !midrollFiredReels.has(activeReel.id) &&
        current >= cuePoint &&
        current <= cuePoint + 1.2
      ) {
        triggerAd('midroll', activeReel);
      }
    }
  };

  // Toggle Play / Pause
  const togglePlayPause = () => {
    if (currentAd) return;
    if (!activeReel) return;
    const video = videoRefs.current[activeReel.id];
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
      setUserPaused(false);
    } else {
      video.pause();
      setIsPlaying(false);
      setUserPaused(true);
    }
  };

  // Double tap to like or single tap to play/pause
  const handleVideoTap = (e) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleLike();
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 800);
    } else {
      togglePlayPause();
    }
    lastTapRef.current = now;
  };

  // Toggle Mute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    Object.values(videoRefs.current).forEach((v) => {
      if (v) v.muted = nextMuted;
    });
  };

  // Handle Like Button
  const handleLike = async () => {
    if (!activeReel) return;
    const id = activeReel.id;
    const isCurrentlyLiked = !!likedMap[id];

    setLikedMap((prev) => ({ ...prev, [id]: !isCurrentlyLiked }));
    setLikeCounts((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + (isCurrentlyLiked ? -1 : 1),
    }));

    try {
      await toggleReelLike(id);
    } catch (err) {
      // Revert if API fails
      setLikedMap((prev) => ({ ...prev, [id]: isCurrentlyLiked }));
      setLikeCounts((prev) => ({
        ...prev,
        [id]: (prev[id] || 0) + (isCurrentlyLiked ? 1 : -1),
      }));
    }
  };

  // Share Reel
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: activeReel?.title || 'Pranvith DOP Reel',
          text: `Check out this reel by Pranvith DOP: ${activeReel?.title}`,
          url,
        });
      } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success('Reel link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        toast.info(url);
      }
    }
  };

  // Keyboard navigation on desktop
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToReel(activeIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToReel(activeIndex - 1);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, reels.length, isMuted, isPlaying, currentAd]);

  const goToReel = (newIndex) => {
    if (newIndex < 0 || newIndex >= reels.length) return;
    setActiveIndex(newIndex);
    const targetElement = document.getElementById(`reel-item-${newIndex}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Intersection observer to track active scroll item on mobile snap scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const height = container.clientHeight;
    const scrollPos = container.scrollTop;
    const newIdx = Math.round(scrollPos / height);
    if (newIdx !== activeIndex && newIdx >= 0 && newIdx < reels.length) {
      setActiveIndex(newIdx);
    }
  }, [activeIndex, reels.length]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black text-white select-none">
      {/* Top Header / Nav Bar Overlay */}
      <header className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
            title="Back to Home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold tracking-wide uppercase">Reels</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
              9:16 Feed
            </span>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-2">
          {/* Ad Simulation Toggle (for Google Ad Manager Testing) */}
          <button
            onClick={() => {
              setSimulatedAdsEnabled(!simulatedAdsEnabled);
              toast.info(
                simulatedAdsEnabled
                  ? 'Google Ad Manager simulation turned OFF'
                  : 'Google Ad Manager simulation turned ON'
              );
            }}
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition border ${
              simulatedAdsEnabled
                ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                : 'border-white/10 bg-black/40 text-white/50 hover:text-white'
            }`}
            title="Toggle Google Ad Manager pre-roll and mid-roll placeholders"
          >
            <Tv className="h-3.5 w-3.5" />
            <span>GAM Ads: {simulatedAdsEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Mute / Unmute Toggle */}
          <button
            onClick={toggleMute}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
            title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5 text-rose-400" />
            ) : (
              <Volume2 className="h-5 w-5 text-emerald-400" />
            )}
          </button>
        </div>
      </header>

      {/* Main Snap Scrolling Container */}
      {loading ? (
        <div className="flex h-full w-full items-center justify-center flex-col gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="text-sm font-medium text-white/70 animate-pulse">Loading cinematic reels...</p>
        </div>
      ) : reels.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center flex-col p-6 text-center">
          <Film className="h-12 w-12 text-white/30" />
          <h2 className="mt-4 text-xl font-bold">No Reels Available</h2>
          <p className="mt-2 max-w-sm text-sm text-white/60">
            Reels uploaded from the admin panel will appear here in vertical 9:16 fullscreen format.
          </p>
          <Link
            to="/admin/reels"
            className="mt-6 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500"
          >
            Go to Admin Panel to Upload
          </Link>
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
        >
          {reels.map((reel, idx) => {
            const isActive = idx === activeIndex;
            const isLiked = !!likedMap[reel.id];
            const likesCount = likeCounts[reel.id] ?? reel.likes_count ?? 0;
            const midrollCue = reel.ad_settings?.mid_roll_cue_seconds || 10;
            const showMidrollMarker = reel.ad_settings?.mid_roll_enabled !== false;

            return (
              <section
                key={reel.id}
                id={`reel-item-${idx}`}
                className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center bg-black"
              >
                {/* Desktop ambient blurred backdrop */}
                {reel.thumbnail_url && (
                  <div
                    className="absolute inset-0 hidden md:block bg-cover bg-center blur-3xl opacity-20 scale-125 pointer-events-none"
                    style={{ backgroundImage: `url(${safeImageSrc(reel.thumbnail_url)})` }}
                  />
                )}

                {/* 9:16 Centered Video Frame */}
                <div className="relative h-full w-full max-w-[430px] md:h-[95dvh] md:max-h-[880px] md:rounded-3xl md:overflow-hidden md:border md:border-white/10 md:shadow-2xl bg-slate-950 flex items-center justify-center">
                  {/* HTML5 Vertical Video */}
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current[reel.id] = el;
                    }}
                    src={reel.video_url}
                    poster={reel.thumbnail_url || undefined}
                    loop
                    playsInline
                    webkit-playsinline="true"
                    muted={isMuted}
                    onTimeUpdate={isActive ? handleTimeUpdate : undefined}
                    onClick={handleVideoTap}
                    className="h-full w-full object-cover cursor-pointer"
                  />

                  {/* Google Ad Manager (GAM) Overlay Container */}
                  {isActive && currentAd && currentAd.reelId === reel.id && (
                    <div
                      id={`gam-ad-slot-${reel.id}`}
                      className="absolute inset-0 z-30 flex flex-col justify-between bg-black/95 p-5 backdrop-blur-md animate-in fade-in duration-300"
                    >
                      {/* Ad Top Bar */}
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                            Ad · {currentAd.type === 'preroll' ? 'Pre-Roll' : 'Sponsored Mid-Roll'}
                          </span>
                          <span className="text-[11px] text-white/50">Google Ad Manager Ready</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-white/60">
                          <Info className="h-3.5 w-3.5 text-amber-400" />
                          <span>AdChoices</span>
                        </div>
                      </div>

                      {/* Ad Creative Center Body */}
                      <div className="my-auto text-center space-y-4 px-3">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 mx-auto">
                          <Sparkles className="h-6 w-6" />
                        </span>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                            {currentAd.sponsor?.badge || 'Sponsored Showcase'}
                          </p>
                          <h3 className="mt-1 text-xl font-extrabold text-white">
                            {currentAd.sponsor?.sponsor}
                          </h3>
                          <p className="mt-2 text-xs text-white/70 max-w-xs mx-auto leading-relaxed">
                            {currentAd.sponsor?.tagline}
                          </p>
                        </div>
                        <div>
                          <a
                            href={currentAd.sponsor?.url || '/assets'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/30 transition hover:bg-amber-400"
                          >
                            <span>{currentAd.sponsor?.cta}</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Ad Bottom Bar with Countdown & Skip Controls */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/10">
                        <div className="text-xs text-white/70 font-mono">
                          {adTimeRemaining > 0 ? (
                            <span>Video in {adTimeRemaining}s</span>
                          ) : (
                            <span>Resuming reel...</span>
                          )}
                        </div>

                        {canSkipAd ? (
                          <button
                            onClick={handleSkipAd}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-bold text-white hover:bg-white/30 backdrop-blur-md transition active:scale-95"
                          >
                            <span>Skip Ad</span>
                            <ArrowDown className="h-3.5 w-3.5 -rotate-90" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-white/40 font-mono">
                            Skip in {Math.max(1, adTimeRemaining - 2)}s...
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Play/Pause Pulse Overlay on Tap */}
                  {isActive && !isPlaying && !currentAd && (
                    <div
                      onClick={togglePlayPause}
                      className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md animate-scale-up">
                        <Play className="h-8 w-8 fill-white translate-x-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Double tap heart animation */}
                  {isActive && heartAnim && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <Heart className="h-24 w-24 fill-pink-500 text-pink-500 animate-ping opacity-80" />
                    </div>
                  )}

                  {/* Right Action Rail (Like, Share, Sound) */}
                  <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-4">
                    {/* Like Button */}
                    <button
                      onClick={handleLike}
                      className="group flex flex-col items-center gap-1 text-white"
                      title={isLiked ? 'Unlike' : 'Like'}
                    >
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md transition active:scale-75 ${
                          isLiked
                            ? 'bg-pink-600/30 text-pink-500'
                            : 'bg-black/40 text-white hover:bg-black/60'
                        }`}
                      >
                        <Heart
                          className={`h-6 w-6 transition ${
                            isLiked ? 'fill-pink-500 text-pink-500' : 'text-white'
                          }`}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-white/90">
                        {likesCount.toLocaleString()}
                      </span>
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={handleShare}
                      className="group flex flex-col items-center gap-1 text-white"
                      title="Share Reel"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-md transition hover:bg-black/60 active:scale-75">
                        {copied ? <Check className="h-5 w-5 text-emerald-400" /> : <Share2 className="h-5 w-5 text-white" />}
                      </div>
                      <span className="text-[11px] font-semibold text-white/90">Share</span>
                    </button>

                    {/* Mute Button in Rail */}
                    <button
                      onClick={toggleMute}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-md transition hover:bg-black/60 active:scale-75"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? (
                        <VolumeX className="h-5 w-5 text-rose-400" />
                      ) : (
                        <Volume2 className="h-5 w-5 text-emerald-400" />
                      )}
                    </button>

                    {/* Sound Disc / Vinyl animation */}
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-900/80 p-1 backdrop-blur-md ${
                        isPlaying && !isMuted ? 'animate-spin' : ''
                      }`}
                      style={{ animationDuration: '4s' }}
                    >
                      <Disc className="h-full w-full text-white/80" />
                    </div>
                  </div>

                  {/* Bottom Reel Details Overlay */}
                  <div className="absolute left-0 right-14 bottom-3 z-20 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                    {/* Creator Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 text-xs font-bold text-white shadow-md">
                        PD
                      </div>
                      <span className="font-bold text-sm tracking-wide text-white">
                        {reel.author_name || 'Pranvith DOP'}
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      <a
                        href="/about"
                        className="rounded-full border border-white/30 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/20"
                      >
                        Follow
                      </a>
                    </div>

                    {/* Reel Title */}
                    <h2 className="text-sm font-semibold text-white leading-snug line-clamp-1">
                      {reel.title}
                    </h2>

                    {/* Description / Caption */}
                    {reel.description && (
                      <div className="mt-1">
                        <p
                          className={`text-xs text-white/80 leading-relaxed ${
                            expandedDesc ? '' : 'line-clamp-2'
                          }`}
                        >
                          {reel.description}
                        </p>
                        {reel.description.length > 90 && (
                          <button
                            onClick={() => setExpandedDesc(!expandedDesc)}
                            className="mt-0.5 text-[11px] font-semibold text-white/60 hover:text-white"
                          >
                            {expandedDesc ? 'Show less' : '...more'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Audio track ticker */}
                    <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
                      <Music className="h-3.5 w-3.5 flex-shrink-0 text-violet-400 animate-pulse" />
                      <span className="truncate text-[11px] font-medium">
                        {reel.sound_title || 'Original Audio - Pranvith DOP'}
                      </span>
                    </div>
                  </div>

                  {/* Scrubber / Progress Bar at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 z-30 h-1 bg-white/20">
                    <div
                      className="h-full bg-violet-500 transition-all duration-100 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                    {/* Visual Mid-roll Ad Cue Point Marker */}
                    {showMidrollMarker && duration > 0 && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-amber-400 border border-black shadow"
                        style={{ left: `${Math.min(95, (midrollCue / duration) * 100)}%` }}
                        title={`Mid-roll Ad at ${midrollCue}s`}
                      />
                    )}
                  </div>
                </div>

                {/* Desktop navigation buttons floating beside reel */}
                <div className="hidden lg:flex flex-col gap-3 absolute right-8 top-1/2 -translate-y-1/2 z-30">
                  <button
                    disabled={idx === 0}
                    onClick={() => goToReel(idx - 1)}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition hover:bg-black/90 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
                    title="Previous Reel (Up Arrow)"
                  >
                    <ChevronUp className="h-6 w-6" />
                  </button>
                  <button
                    disabled={idx === reels.length - 1}
                    onClick={() => goToReel(idx + 1)}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition hover:bg-black/90 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
                    title="Next Reel (Down Arrow)"
                  >
                    <ChevronDown className="h-6 w-6" />
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Reels;
