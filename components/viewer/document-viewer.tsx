"use client";
import { useEffect, useState } from "react";
import { getLatestPdf } from "@/lib/api";

export function DocumentViewer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const fetchDocument = async () => {
    setLoading(true);
    setError(null);
    try {
      const pdfBlob = await getLatestPdf();
      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
      } else {
        setPdfUrl(null);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, []);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <div className="h-full flex flex-col bg-gray-50 border-l border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
        <h2 className="font-semibold text-gray-800">Document Preview (PDF)</h2>
        <button
          onClick={fetchDocument}
          className="text-sm px-3 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {error ? (
          <div className="text-red-500 text-center mt-10">{error}</div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border border-gray-200 shadow-sm bg-white"
            title="PDF Preview"
          />
        ) : (
          <div className="text-gray-500 text-center mt-10">
            {loading ? "Loading..." : "No document found."}
          </div>
        )}
      </div>
    </div>
  );
}
