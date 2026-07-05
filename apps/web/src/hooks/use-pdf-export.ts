"use client";

import { useState, useCallback } from "react";

export interface UsePdfExportOptions {
  /** Filename (without extension). Defaults to `report-YYYY-MM-DD`. */
  filename?: string;
}

export interface PdfExportResult {
  success: boolean;
  error?: string;
}

interface UsePdfExportReturn {
  /** True while the PDF is being generated. */
  isExporting: boolean;
  /** Last error message, if any. */
  error: string | null;
  /** Call to start PDF generation. Provide the element to capture. */
  exportPdf: (element: HTMLElement) => Promise<PdfExportResult>;
  /** Clear the error state. */
  clearError: () => void;
}

export function usePdfExport(options: UsePdfExportOptions = {}): UsePdfExportReturn {
  const { filename } = options;
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultFilename = `report-${new Date().toISOString().slice(0, 10)}`;

  const exportPdf = useCallback(
    async (element: HTMLElement): Promise<PdfExportResult> => {
      setIsExporting(true);
      setError(null);

      try {
        // Dynamically import heavy libraries to avoid impacting initial bundle
        const [html2canvasModule, { jsPDF }] = await Promise.all([
          import("html2canvas"),
          import("jspdf"),
        ]);

        const html2canvas = html2canvasModule.default;

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const pdf = new jsPDF("p", "mm", "a4");
        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add additional pages if content overflows
        while (heightLeft > 0) {
          position = heightLeft - imgHeight; // Move position up by one page
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`${filename ?? defaultFilename}.pdf`);
        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to generate PDF";
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsExporting(false);
      }
    },
    [filename, defaultFilename],
  );

  const clearError = useCallback(() => setError(null), []);

  return { isExporting, error, exportPdf, clearError };
}
