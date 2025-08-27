import { Book } from "./Book";
import { useThree, useFrame } from "@react-three/fiber";
import { useMemo, useEffect, useState, useRef } from "react";
import { useAtom } from "jotai";
import { pageAtom } from "./UI";
import { pageSideAtom } from "./UI";
import { zoomAtom } from "./UI";
import { easing } from "maath";

// Responsive wrapper that scales the book to fit the viewport neatly
export const Experience = ({ pdfPages }) => {
  const { viewport } = useThree();
  // We don't need the actual page value here for layout; keeping atoms consistent for future use
  // const [page] = useAtom(pageAtom);
  const [side] = useAtom(pageSideAtom);
  const [zoom] = useAtom(zoomAtom);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 768px)').matches : false
  );

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

  // Base physical page size used by the book (in world units)
  const BOOK_WIDTH = 1.28; // single page width
  const BOOK_HEIGHT = 1.71; // page height

  const baseScale = useMemo(() => {
    // Leave some breathing room for UI and safe areas
    const marginW = isMobile ? 0.86 : 0.92;
    const marginH = isMobile ? 0.76 : 0.82;
    const maxW = viewport.width * marginW;
    const maxH = viewport.height * marginH;
    const s = Math.min(maxW / BOOK_WIDTH, maxH / BOOK_HEIGHT);
    // Clamp to avoid extreme zoom on ultra-wide/ultra-tall cases
    const clamped = Math.max(0.35, Math.min(s, 2));
    // Slight comfort factor: smaller on mobile, a touch larger on desktop
    return isMobile ? clamped * 0.9 : clamped * 1.05;
  }, [viewport.width, viewport.height, isMobile]);

  // Target X offset: on mobile show only one side by shifting horizontally
  const targetX = useMemo(() => {
    if (!isMobile) return 0;
    // Move by half page width so the visible side centers precisely
    const half = BOOK_WIDTH / 2;
    // Geometry is translated +W/2, so centering visible face tends to require negative offset for left
    return side === 'left' ? -half : half;
  }, [isMobile, side]);

  const groupRef = useRef();

  // Smoothly animate horizontal transitions between left/right views
  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    // Smooth horizontal slide
    easing.damp(g.position, 'x', targetX, 0.35, delta);
  // Smooth zoom: never below baseScale; zoomAtom is >= 1 per UI controls
  const targetScale = baseScale * Math.max(1, zoom);
  easing.damp(g.scale, 'x', targetScale, 0.35, delta);
  easing.damp(g.scale, 'y', targetScale, 0.35, delta);
  easing.damp(g.scale, 'z', targetScale, 0.35, delta);
  });

  return (
  <group ref={groupRef}>
      <Book pdfPages={pdfPages} />
    </group>
  );
};
