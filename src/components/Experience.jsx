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
  const { viewport, size } = useThree();
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

  // Horizontal offset is applied in world space and must account for current scale (computed per-frame below)

  const groupRef = useRef();
  // Pan state (in world units)
  const panRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  // Determine when clicks should be disabled in favor of panning
  const STEP = 0.15; // must match UI ZoomControls step
  const disableAt = 1 + (isMobile ? 3 : 2) * STEP; // disable on >= 3 taps mobile, >= 2 taps desktop
  const clickEnabled = zoom < disableAt;

  // Smoothly animate horizontal transitions between left/right views
  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    // Smooth zoom: never below baseScale; zoomAtom is >= 1 per UI controls
    const targetScale = baseScale * Math.max(1, zoom);

    // Compute the horizontal offset in WORLD units so the visible page is centered
    const half = BOOK_WIDTH / 2; // half page width in local units
    const sideOffset = isMobile ? (side === 'left' ? -half : half) * targetScale : 0;

    // Compute clamped pan bounds based on current scale and viewport
  // Use a two-page spread width on desktop so horizontal bounds reach the far edges
  const spreadWidth = isMobile ? BOOK_WIDTH : BOOK_WIDTH * 2;
  const contentW = spreadWidth * targetScale;
  const contentH = BOOK_HEIGHT * targetScale;
    const overflowX = Math.max(0, (contentW - viewport.width) / 2);
    const overflowY = Math.max(0, (contentH - viewport.height) / 2);
    // Add a tiny margin to avoid hard stops
    const margin = 0.02 * targetScale;

    // Provide extra horizontal slack on wide screens so users can still pan a bit even
    // when the content isn't strictly wider than the viewport.
    const halfContentX = contentW / 2;
    let boundX = overflowX + margin;
    if (!clickEnabled) {
      // Allow reaching far edges when fully zoomed, but don't exceed half the content width
      const edgeReach = Math.max(viewport.width * 0.35, BOOK_WIDTH * targetScale * 0.6);
      boundX = Math.min(halfContentX, boundX + edgeReach);
    }
    const boundY = overflowY + margin;

    // Clamp pan values every frame (in case zoom changes while panned)
    panRef.current.x = Math.min(boundX, Math.max(-boundX, panRef.current.x));
    panRef.current.y = Math.min(boundY, Math.max(-boundY, panRef.current.y));

    const effectivePanX = clickEnabled ? 0 : panRef.current.x;
    const effectivePanY = clickEnabled ? 0 : panRef.current.y;
    const targetXWorld = sideOffset + effectivePanX;

    // Smooth horizontal slide using world-space offset
    easing.damp(g.position, 'x', targetXWorld, 0.35, delta);
    // Smooth vertical pan
    easing.damp(g.position, 'y', effectivePanY, 0.35, delta);

    // Apply smooth scaling
    easing.damp(g.scale, 'x', targetScale, 0.35, delta);
    easing.damp(g.scale, 'y', targetScale, 0.35, delta);
    easing.damp(g.scale, 'z', targetScale, 0.35, delta);
  });

  // Pointer/pan handlers (only active when click disabled)
  const onPointerDown = (e) => {
    if (clickEnabled) return;
    e.stopPropagation();
    draggingRef.current = true;
    dragStartRef.current.x = e.clientX;
    dragStartRef.current.y = e.clientY;
    panStartRef.current.x = panRef.current.x;
    panStartRef.current.y = panRef.current.y;
    if (e.target.setPointerCapture) {
      try { e.target.setPointerCapture(e.pointerId); } catch {}
    }
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current || clickEnabled) return;
    // convert pixel delta to world units
    const dxPx = e.clientX - dragStartRef.current.x;
    const dyPx = e.clientY - dragStartRef.current.y;
    const wppx = viewport.width / size.width;
    const wppy = viewport.height / size.height;
    const dx = dxPx * wppx;
    const dy = -dyPx * wppy; // invert so dragging up moves content up
    panRef.current.x = panStartRef.current.x + dx;
    panRef.current.y = panStartRef.current.y + dy;
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
  };

  useEffect(() => {
    const up = () => endDrag();
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  return (
    <group ref={groupRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
      <Book pdfPages={pdfPages} clickEnabled={clickEnabled} />
    </group>
  );
};
