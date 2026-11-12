import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export function PdfPages({ url }: { url: string }) {
  const host = useRef<HTMLDivElement>(null);
  const pages = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | undefined;
    const container = pages.current!;
    setLoading(true);
    setError("");
    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        task = pdfjs.getDocument({ url });
        const pdf = await task.promise;
        const fragment = document.createDocumentFragment();
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelled) return;
          const available = 850;
          const ratio = Math.min(window.devicePixelRatio || 1, 2);
          const viewport = page.getViewport({
            scale: (available / page.getViewport({ scale: 1 }).width) * ratio,
          });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.style.width = "auto";
          canvas.style.maxWidth = "100%";
          canvas.style.height = "auto";
          canvas.setAttribute("role", "img");
          canvas.setAttribute(
            "aria-label",
            `Ficha de inscripción: página ${i} de ${pdf.numPages}`,
          );
          await page.render({ canvas, viewport }).promise;
          if (cancelled) return;
          fragment.append(canvas);
          page.cleanup();
        }
        if (!cancelled) {
          container.replaceChildren(fragment);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(
            "No se pudo mostrar la vista previa. Puedes abrir el PDF en otra pestaña o descargarlo.",
          );
          setLoading(false);
        }
      }
    }
    void render();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [url]);
  return (
    <div className="pdf-pages" ref={host}>
      {loading && <p role="status">Cargando vista previa…</p>}
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      <div ref={pages} className="pdf-page-list" />
    </div>
  );
}
