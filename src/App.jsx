import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";
import { Document, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function App() {
  const [numPages, setNumPages] = useState(null);
  const [pdfPages, setPdfPages] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load PDF and render each page to a canvas, then extract as image
  useEffect(() => {
    async function loadPdf() {
      setLoading(true);
      setPdfPages(null);
      try {
        const loadingTask = pdfjs.getDocument('/textures/tests.pdf');
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
        setPdfPages([]);
      }
      setLoading(false);
    }
    loadPdf();
  }, []);

  return (
    <>
      <UI />
      <Loader />
      {loading || !pdfPages ? (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80">
          <span className="text-white text-2xl">Loading PDF...</span>
        </div>
      ) : (
        <Canvas shadows camera={{ position: [-0.5, 1, 4], fov: 45 }}>
          <group position-y={0}>
            <Suspense fallback={null}>
              <Experience pdfPages={pdfPages} />
            </Suspense>
          </group>
        </Canvas>
      )}
    </>
  );
}

export default App;
