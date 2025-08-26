import { useCursor, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useAtom } from "jotai";
import { easing } from "maath";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bone,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  MathUtils,
  Skeleton,
  SkinnedMesh,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector3,
  MeshBasicMaterial,
  LinearFilter,
  NearestFilter,
  ClampToEdgeWrapping,
} from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { pageAtom } from "./UI";

const easingFactor = 0.5; 
const easingFactorFold = 0.3; 
const insideCurveStrength = 0.08; 
const outsideCurveStrength = 0.02; 
const turningCurveStrength = 0.05; 

const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71; 
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

const pageGeometry = new BoxGeometry(
  PAGE_WIDTH,
  PAGE_HEIGHT,
  PAGE_DEPTH,
  PAGE_SEGMENTS,
  2
);

pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes = [];
const skinWeights = [];

for (let i = 0; i < position.count; i++) {
  vertex.fromBufferAttribute(position, i); 
  const x = vertex.x; 

  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH)); 
  let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH; 

  skinIndexes.push(skinIndex, skinIndex + 1, 0, 0); 
  skinWeights.push(1 - skinWeight, skinWeight, 0, 0); 
}

pageGeometry.setAttribute(
  "skinIndex",
  new Uint16BufferAttribute(skinIndexes, 4)
);
pageGeometry.setAttribute(
  "skinWeight",
  new Float32BufferAttribute(skinWeights, 4)
);

const whiteColor = new Color("white");

// 1x1 white PNG for missing backs (avoids loading errors with undefined)
const BLANK_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO4Fh1wAAAAASUVORK5CYII=";

const pageMaterials = [
  new MeshBasicMaterial({
    color: whiteColor,
  }),
  new MeshBasicMaterial({
    color: "#111",
  }),
  new MeshBasicMaterial({
    color: whiteColor,
  }),
  new MeshBasicMaterial({
    color: whiteColor,
  }),
];

// No more static pages array or preloading

const Page = ({ number, page, opened, bookClosed, frontImg, backImg, ...props }) => {
  // Use useTexture with data URLs
  const [picture, picture2] = useTexture([frontImg, backImg || BLANK_IMAGE]);
  picture.colorSpace = picture2.colorSpace = SRGBColorSpace;
  const { gl } = useThree();
  const group = useRef();
  const turnedAt = useRef(0);
  const lastOpened = useRef(opened);

  const skinnedMeshRef = useRef();

  // Drag state
  const dragging = useRef(false);
  const dragT = useRef(0); // 0 (closed) -> 1 (open)
  const dragStartedOnThis = useRef(false);
  const dragStartX = useRef(0);
  const dragMoved = useRef(false);
  const lastDragTime = useRef(0);
  const dragStartOpened = useRef(false);
  const dragStartT = useRef(0);
  const intendedDirection = useRef(/** 'forward' | 'backward' */ 'forward');

  // Improve text clarity by using sharper filtering and disabling mipmaps
  useEffect(() => {
    [picture, picture2].forEach((tex) => {
      if (!tex) return;
      tex.wrapS = ClampToEdgeWrapping;
      tex.wrapT = ClampToEdgeWrapping;
      // NPOT textures typically can't use mipmaps reliably; keep it off for crispness
      tex.generateMipmaps = false;
      // Sharper upscaling for small text
      tex.minFilter = LinearFilter;
      tex.magFilter = NearestFilter;
      // Anisotropy is ignored without mipmaps but harmless; keep small value just in case
      if (gl?.capabilities?.getMaxAnisotropy) {
        const maxAniso = gl.capabilities.getMaxAnisotropy();
        tex.anisotropy = Math.min(4, maxAniso || 0);
      }
      tex.needsUpdate = true;
    });
  }, [picture, picture2, gl]);

  const manualSkinnedMesh = useMemo(() => {
    const bones = [];
    for (let i = 0; i <= PAGE_SEGMENTS; i++) {
      let bone = new Bone();
      bones.push(bone);
      if (i === 0) {
        bone.position.x = 0;
      } else {
        bone.position.x = SEGMENT_WIDTH;
      }
      if (i > 0) {
        bones[i - 1].add(bone); 
      }
    }
    const skeleton = new Skeleton(bones);

    const materials = [
      ...pageMaterials,
      new MeshBasicMaterial({
        color: whiteColor,
        map: picture,
      }),
      new MeshBasicMaterial({
        color: whiteColor,
        map: picture2,
      }),
    ];
  const mesh = new SkinnedMesh(pageGeometry, materials);
  // Keep the book looking flat/static: no shadows
  mesh.castShadow = false;
  mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
  }, [picture, picture2]);

  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) {
      return;
    }
    if (lastOpened.current !== opened) {
      turnedAt.current = +new Date();
      lastOpened.current = opened;
    }
    let turningTime;
    if (dragging.current) {
      // During drag, use direct progress [0..1]
      turningTime = MathUtils.clamp(dragT.current, 0, 1);
    } else {
      // Time-based easing when not dragging (click/arrow)
      turningTime = Math.min(400, new Date() - turnedAt.current) / 400;
      turningTime = Math.sin(turningTime * Math.PI);
    }

    // Base target rotation for the root bone (i===0)
    // When dragging, interpolate directly based on dragT
    let targetRotation = dragging.current
      ? MathUtils.lerp(Math.PI / 2, -Math.PI / 2, MathUtils.clamp(dragT.current, 0, 1))
      : opened
      ? -Math.PI / 2
      : Math.PI / 2;
    if (!bookClosed) {
      targetRotation += degToRad(number * 0.8);
    }

    const bones = skinnedMeshRef.current.skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      const target = i === 0 ? group.current : bones[i];

      // Only apply curves during turning animation, not when page is fully opened/closed
      const isPageFullyOpened = !dragging.current && opened && turningTime < 0.1;
      const isPageFullyClosed = !dragging.current && !opened && turningTime < 0.1;
      
      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
      const turningIntensity =
        Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;
      
      let rotationAngle;
      if (bookClosed) {
        if (i === 0) {
          rotationAngle = targetRotation;
        } else {
          rotationAngle = 0;
        }
      } else if (isPageFullyOpened || isPageFullyClosed) {
        // Keep pages flat when fully opened or closed
        rotationAngle = i === 0 ? targetRotation : 0;
      } else {
        // Apply curves only during turning animation
        rotationAngle =
          insideCurveStrength * insideCurveIntensity * targetRotation -
          outsideCurveStrength * outsideCurveIntensity * targetRotation +
          turningCurveStrength * turningIntensity * targetRotation;
      }
      
      let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2);
      if (bookClosed || isPageFullyOpened || isPageFullyClosed) {
        foldRotationAngle = 0;
      }
      
      easing.dampAngle(
        target.rotation,
        "y",
        rotationAngle,
        easingFactor,
        delta
      );

      const foldIntensity =
        i > 8 && !isPageFullyOpened && !isPageFullyClosed
          ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime
          : 0;
      easing.dampAngle(
        target.rotation,
        "x",
        foldRotationAngle * foldIntensity,
        easingFactorFold,
        delta
      );
    }
  });

  const [currentPage, setPage] = useAtom(pageAtom);
  const [highlighted, setHighlighted] = useState(false);
  useCursor(highlighted);

  // Helpers to compute drag progress from pointer position in local space
  const computeLocalX = (e) => {
    const pt = e.point.clone();
    group.current?.worldToLocal(pt);
    return pt.x; // page geometry spans x in [0..PAGE_WIDTH]
  };

  const startDrag = (e) => {
    e.stopPropagation();
    // Allow drag only on the active top pages to avoid odd depth picks
  const canDragForward = !opened && number === currentPage; // next page to open
  const canDragBackward = opened && number === currentPage - 1; // last opened page to close
    if (!canDragForward && !canDragBackward) return;
  dragStartOpened.current = opened;
  intendedDirection.current = opened ? 'backward' : 'forward';
    // Initialize t from current pointer x
    const localX = computeLocalX(e);
  const t = MathUtils.clamp(localX / PAGE_WIDTH, 0, 1);
  // Map pointer X to progress: both modes use (1 - t) so moving right closes (t->1, progress->0)
  dragT.current = 1 - t;
  dragStartT.current = dragT.current;
    dragging.current = true;
    dragStartedOnThis.current = true;
  dragStartX.current = localX;
  dragMoved.current = false;
    setHighlighted(true);
    // Try to capture pointer so moves are delivered even if leaving the mesh
    try {
      e.target.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onDragMove = (e) => {
    if (!dragging.current || !dragStartedOnThis.current) return;
    e.stopPropagation();
    const localX = computeLocalX(e);
  const t = MathUtils.clamp(localX / PAGE_WIDTH, 0, 1);
  dragT.current = 1 - t;
    if (Math.abs(localX - dragStartX.current) > 0.01) {
      dragMoved.current = true;
    }
  };

  const endDrag = (e) => {
    if (!dragging.current || !dragStartedOnThis.current) return;
    e.stopPropagation();
    // Always commit on release; decide by progress delta with tiny-move fallback
    const diffT = dragT.current - dragStartT.current;
    const EPS = 0.01;
    if (Math.abs(diffT) <= EPS) {
      // Minimal movement: commit intended direction from where drag started
      if (intendedDirection.current === 'forward') {
        setPage(number + 1);
      } else {
        setPage(number);
      }
    } else if (diffT > 0) {
      // Progress increased => opening
      setPage(number + 1);
    } else {
      // Progress decreased => closing
      setPage(number);
    }
    dragging.current = false;
    dragStartedOnThis.current = false;
    // Suppress following click event
    lastDragTime.current = Date.now();
    setHighlighted(false);
    try {
      e.target.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  return (
    <group
      {...props}
      ref={group}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHighlighted(true);
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setHighlighted(false);
      }}
      onPointerDown={startDrag}
      onPointerMove={onDragMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={(e) => {
        e.stopPropagation();
        // If a drag just occurred, ignore click
        if (
          dragging.current ||
          dragStartedOnThis.current ||
          Date.now() - lastDragTime.current < 200
        )
          return;
        setPage(opened ? number : number + 1);
        setHighlighted(false);
      }}
    >
      <primitive
        object={manualSkinnedMesh}
        ref={skinnedMeshRef}
        position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH}
      />
    </group>
  );
};

export const Book = ({ pdfPages = [], ...props }) => {
  const [page] = useAtom(pageAtom);
  const [delayedPage, setDelayedPage] = useState(page);

  useEffect(() => {
    let timeout;
    const goToPage = () => {
      setDelayedPage((delayedPage) => {
        if (page === delayedPage) {
          return delayedPage;
        } else {
          timeout = setTimeout(
            () => {
              goToPage();
            },
            Math.abs(page - delayedPage) > 2 ? 50 : 150
          );
          if (page > delayedPage) {
            return delayedPage + 1;
          }
          if (page < delayedPage) {
            return delayedPage - 1;
          }
        }
      });
    };
    goToPage();
    return () => {
      clearTimeout(timeout);
    };
  }, [page]);

  // Build physical sheets: each sheet has a front (odd page) and back (even page)
  const sheets = useMemo(() => {
    const out = [];
    for (let i = 0; i < pdfPages.length; i += 2) {
      out.push({ front: pdfPages[i], back: pdfPages[i + 1] });
    }
    return out;
  }, [pdfPages]);

  return (
    <group {...props} rotation-y={-Math.PI / 2}>
      {sheets.map((sheet, index) => (
        <Page
          key={index}
          page={delayedPage}
          number={index}
          opened={delayedPage > index}
          bookClosed={delayedPage === 0}
          frontImg={sheet.front}
          backImg={sheet.back}
        />
      ))}
    </group>
  );
};