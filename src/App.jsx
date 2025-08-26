import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function App() {
  const [numPages, setNumPages] = useState(null);
  const [pdfPages, setPdfPages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load PDF and render each page to a canvas, then extract as image
  useEffect(() => {
    async function loadPdf() {
      setLoading(true);
      setPdfPages(null);
      setError(null);
      try {
        // Resolve dynamic PDF URL from query param, else default to Supabase public URL
        const params = new URLSearchParams(window.location.search);
        const defaultUrl = 'https://vawfcntzmfwitqlcdnqx.supabase.co/storage/v1/object/public/Pdf/tes.pdf';
        const pdfUrl = params.get('pdf') || defaultUrl;

        const loadingTask = pdfjs.getDocument({ url: pdfUrl, withCredentials: false });
        const pdf = await loadingTask.promise;
        setNumPages(pdf.numPages);
        const images = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: context, viewport }).promise;
          images.push(canvas.toDataURL('image/jpeg', 0.92));
        }
        setPdfPages(images);
      } catch (e) {
        // Attempt a local fallback if remote load fails
        try {
          const loadingTask = pdfjs.getDocument('/textures/test.pdf');
          const pdf = await loadingTask.promise;
          setNumPages(pdf.numPages);
          const images = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport }).promise;
            images.push(canvas.toDataURL('image/jpeg', 0.92));
          }
          setPdfPages(images);
        } catch (fallbackErr) {
          setPdfPages([]);
          setError('Failed to load PDF. Please check the URL or CORS settings.');
        }
      }
      setLoading(false);
    }
    loadPdf();
  }, []);

  return (
    <>
      <UI totalSheets={pdfPages ? Math.ceil(pdfPages.length / 2) : 0} />
      <Loader />
    {loading || !pdfPages ? (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80">
      <span className="text-white text-2xl">{error ? error : 'Loading PDF...'}</span>
        </div>
      ) : (
        <Canvas
          className="w-full h-full"
          dpr={[1, Math.min(window.devicePixelRatio || 1, 2)]}
          shadows={false}
          camera={{ position: [0, 0, 4], fov: 28 }}
          gl={{ alpha: true, antialias: true }}
          onCreated={({ gl }) => gl.setClearAlpha(0)}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <Experience pdfPages={pdfPages} />
          </Suspense>
        </Canvas>
      )}
    </>
  );
}

export default App;
