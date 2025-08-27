import { atom, useAtom } from "jotai";
import logo from '../assets/LOGO AB.png'; // Import the image
import { useEffect, useState, useRef } from "react";
import { Plus, Minus, Maximize, Minimize, Volume2, VolumeX, Share2, Copy as CopyIcon, Mail, Instagram, MessageCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export const pageAtom = atom(0);
export const pageSideAtom = atom('left'); // 'left' | 'right' for mobile single-page mode
// Zoom factor relative to the computed base scale. 1 = normal, >1 = zoomed in
export const zoomAtom = atom(1);
// Sound toggle: false = unmuted (play), true = muted (no sound)
export const muteAtom = atom(false);

export const UI = ({ totalSheets = 2 }) => {
  const [page, setPage] = useAtom(pageAtom);
  const [side, setSide] = useAtom(pageSideAtom);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 768px)').matches : false
  );
  
  // Calculate max pages based on PDF structure (each spread = 2 pages)
  const maxPages = totalSheets;

  const [muted] = useAtom(muteAtom);
  // Keep the latest mute state without retriggering the page sound effect
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  // Skip playing on initial mount, and only play when page actually changes
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (mutedRef.current) return;
    const audio = new Audio("/audios/page-flip.mp3");
    audio.play().catch(() => {});
  }, [page]);

  // Do not auto-reset side on page changes; we control side explicitly via navigation

  // Track mobile breakpoint
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e) => setIsMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const scrollAnimation = {
    display: 'flex',
    width: 'max-content',
    animation: 'horizontal-scroll 80s linear infinite', // Increased duration to slow down the animation
  };

  const keyframes = `
    @keyframes horizontal-scroll {
      0% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(-100%);
      }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>

      <main className="pointer-events-none select-none z-10 fixed inset-0 flex flex-col justify-between safe-area">
        {/* Navigation */}
        {isMobile ? (
          // Mobile: use side arrows with single-page forward/backward flow
          <div className="absolute inset-0 flex items-center justify-between px-3 sm:px-4 pointer-events-none">
            {/* Backward (left) */}
            <button
              className={`pointer-events-auto w-12 h-12 rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-200 flex items-center justify-center transition-all duration-300 ${
                (page === 0 && side === 'left') ? 'opacity-30 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105 hover:bg-gray-50'
              }`}
              onClick={() => {
                // If at front cover, cannot go back
                if (page === 0 && side === 'left') return;

                // If currently showing right page (side left), go back to left page (side right) of same spread
                if (side === 'left') {
                  setSide('right');
                  return;
                }

                // If currently showing left page (side right), move to previous spread's right page
                if (side === 'right') {
                  if (page > 1) {
                    setPage(page - 1);
                    setSide('left');
                  } else {
                    // Going back from first spread returns to front cover
                    setPage(0);
                    setSide('left');
                  }
                }
              }}
              disabled={page === 0 && side === 'left'}
              aria-label="Previous"
            >
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Forward (right) */}
            <button
              className={`pointer-events-auto w-12 h-12 rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-200 flex items-center justify-center transition-all duration-300 ${
                (page === maxPages && side === 'left') ? 'opacity-30 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105 hover:bg-gray-50'
              }`}
              onClick={() => {
                // Prevent advancing beyond the last right page
                if (page === maxPages && side === 'left') return;

                // First tap from closed front: open first spread and slide right to show left page
                if (page === 0 && side === 'left') {
                  if (maxPages >= 1) setPage(1);
                  setSide('right');
                  return;
                }

                // Once open: right (left page visible) -> left (right page visible) on same spread
                if (side === 'right') {
                  setSide('left');
                  return;
                }

                // From left (right page visible) -> advance to next spread and show left page
                if (side === 'left') {
                  if (page < maxPages) setPage(page + 1);
                  setSide('right');
                }
              }}
              disabled={page === maxPages && side === 'left'}
              aria-label="Next"
            >
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        ) : (
          // Desktop/tablet: show both directions
          <div className="absolute inset-0 flex items-center justify-between px-3 sm:px-6 lg:px-8 pointer-events-none">
            {/* Left Arrow */}
            <button
              className={`pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-200 flex items-center justify-center transition-all duration-300 ${
                page === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105 hover:bg-gray-50'
              }`}
              onClick={() => page > 0 && setPage(page - 1)}
              disabled={page === 0}
              aria-label="Previous"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Right Arrow */}
            <button
              className={`pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-200 flex items-center justify-center transition-all duration-300 ${
                page >= maxPages ? 'opacity-30 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105 hover:bg-gray-50'
              }`}
              onClick={() => page < maxPages && setPage(page + 1)}
              disabled={page >= maxPages}
              aria-label="Next"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Bottom-center zoom controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-3">
            <ZoomControls />
            <FullscreenToggle />
            <ShareButton />
            <VolumeToggle />
          </div>
        </div>
      </main>
    </>
  );
};

// Separate component so it can be positioned easily in both layouts
const ZoomControls = () => {
  const [zoom, setZoom] = useAtom(zoomAtom);

  const STEP = 0.15;      // zoom step per click
  const MAX_ZOOM = 3;     // cap max zoom in

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, +(z + STEP).toFixed(3)));
  const zoomOut = () => setZoom((z) => Math.max(1, +(z - STEP).toFixed(3)));

  return (
    <div className="flex items-center gap-3">
      <button
        className={`pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-200 flex items-center justify-center transition-all duration-300 ${
          zoom <= 1 ? 'opacity-60' : 'hover:shadow-lg hover:scale-105 hover:bg-gray-50'
        }`}
        onClick={zoomOut}
        aria-label="Zoom out"
      >
        <Minus className="w-5 h-5 text-gray-700" />
      </button>
      <button
        className={`pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-200 flex items-center justify-center transition-all duration-300 ${
          zoom >= 3 ? 'opacity-60' : 'hover:shadow-lg hover:scale-105 hover:bg-gray-50'
        }`}
        onClick={zoomIn}
        aria-label="Zoom in"
      >
        <Plus className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
};

const FullscreenToggle = () => {
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const handler = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFs(!!fsEl);
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    handler();
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  const supported = typeof document !== 'undefined' && (
    'fullscreenEnabled' in document || 'webkitFullscreenEnabled' in document ||
    'requestFullscreen' in document.documentElement || 'webkitRequestFullscreen' in document.documentElement
  );
  if (!supported) return null;

  const enter = async () => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch {}
  };
  const exit = async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    } catch {}
  };

  return (
    <button
      className="pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-200 flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:scale-105 hover:bg-gray-50"
      onClick={() => (isFs ? exit() : enter())}
      aria-label={isFs ? 'Exit full screen' : 'Enter full screen'}
    >
      {isFs ? (
        <Minimize className="w-5 h-5 text-gray-700" />
      ) : (
        <Maximize className="w-5 h-5 text-gray-700" />
      )}
    </button>
  );
};

const VolumeToggle = () => {
  const [muted, setMuted] = useAtom(muteAtom);
  return (
    <button
      className="pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-200 flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:scale-105 hover:bg-gray-50"
      onClick={() => setMuted((m) => !m)}
      aria-label={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? (
        <VolumeX className="w-5 h-5 text-gray-700" />
      ) : (
        <Volume2 className="w-5 h-5 text-gray-700" />
      )}
    </button>
  );
};
const ShareButton = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = typeof window !== 'undefined' ? window.location.href : '';

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const onEmail = () => {
    const subject = encodeURIComponent('Check this flipbook');
    const body = encodeURIComponent(`Have a look: ${url}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };
  const onWhatsApp = () => {
    const text = encodeURIComponent(`Have a look: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };
  const onInstagram = () => {
    // Instagram doesn't support web share prefill; open site and keep URL copied
    copyToClipboard();
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
  };
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        className="pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-200 flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:scale-105 hover:bg-gray-50"
        onClick={() => setOpen(true)}
        aria-label="Share"
      >
        <Share2 className="w-5 h-5 text-gray-700" />
      </button>

     {open && createPortal(
        <div className="pointer-events-auto fixed inset-0 z-[1000] flex items-center justify-center" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />

          {/* Transparent content */}
          <div className="relative z-10 mx-4 w-auto max-w-[90vw]">
            {/* Close button (no bg/border) */}
            <button
              className="absolute -top-12 right-0 text-white hover:opacity-80 transition"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="w-7 h-7" />
            </button>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
              {/* Copy */}
              <button onClick={copyToClipboard} className="group flex flex-col items-center gap-2 text-white hover:opacity-90 transition">
                <CopyIcon className="w-10 h-10 text-gray-200" />
                <span className="text-sm">{copied ? 'Copied!' : 'Copy link'}</span>
              </button>

              {/* Email */}
              <button onClick={onEmail} className="group flex flex-col items-center gap-2 text-white hover:opacity-90 transition">
                <Mail className="w-10 h-10 text-blue-500" />
                <span className="text-sm">Email</span>
              </button>

              {/* WhatsApp */}
              <button onClick={onWhatsApp} className="group flex flex-col items-center gap-2 text-white hover:opacity-90 transition">
                <MessageCircle className="w-10 h-10 text-green-500" />
                <span className="text-sm">WhatsApp</span>
              </button>

              {/* Instagram */}
              <button onClick={onInstagram} className="group flex flex-col items-center gap-2 text-white hover:opacity-90 transition">
                <Instagram className="w-10 h-10 text-pink-500" />
                <span className="text-sm">Instagram</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
