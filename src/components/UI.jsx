import { atom, useAtom } from "jotai";
import logo from '../assets/LOGO AB.png'; // Import the image
import { useEffect } from "react";

export const pageAtom = atom(0);

export const UI = () => {
  const [page, setPage] = useAtom(pageAtom);

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
       
    
      </main>
    </>
  );
};
