import { atom, useAtom } from "jotai";
import logo from '../assets/LOGO AB.png'; // Import the image
import { useEffect, useState } from "react";

export const pageAtom = atom(0);
export const pageSideAtom = atom('left'); // 'left' | 'right' for mobile single-page mode

export const UI = ({ totalSheets = 2 }) => {
  const [page, setPage] = useAtom(pageAtom);
  const [side, setSide] = useAtom(pageSideAtom);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 768px)').matches : false
  );
  
  // Calculate max pages based on PDF structure (each spread = 2 pages)
  const maxPages = totalSheets;

  useEffect(() => {
    const audio = new Audio("/audios/page-flip.mp3");
    audio.play();
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
      </main>
    </>
  );
};
