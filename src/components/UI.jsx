import { atom, useAtom } from "jotai";
import logo from '../assets/LOGO AB.png'; // Import the image
import { useEffect } from "react";

export const pageAtom = atom(0);

export const UI = ({ totalSheets = 2 }) => {
  const [page, setPage] = useAtom(pageAtom);
  
  // Calculate max pages based on PDF structure (each spread = 2 pages)
  const maxPages = totalSheets;

  useEffect(() => {
    const audio = new Audio("/audios/page-flip.mp3");
    audio.play();
  }, [page]);

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

      <main className="pointer-events-none select-none z-10 fixed inset-0 flex flex-col justify-between">
        {/* Navigation Arrows */}
        <div className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none">
          {/* Left Arrow */}
          <button
            className={`pointer-events-auto w-14 h-14 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center transition-all duration-300 ${
              page === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105 hover:bg-gray-50'
            }`}
            onClick={() => page > 0 && setPage(page - 1)}
            disabled={page === 0}
          >
            <svg 
              className="w-5 h-5 text-gray-600" 
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
            className={`pointer-events-auto w-14 h-14 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center transition-all duration-300 ${
              page >= maxPages ? 'opacity-30 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105 hover:bg-gray-50'
            }`}
            onClick={() => page < maxPages && setPage(page + 1)}
            disabled={page >= maxPages}
          >
            <svg 
              className="w-5 h-5 text-gray-600" 
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
      </main>
    </>
  );
};
