"use client";

import { useEffect, useState } from "react";
import { getDocuments } from "@/lib/api";
import { Document } from "@/types";
import { FileText, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface DocumentListProps {
  refreshTrigger?: number;
}

export function DocumentList({ refreshTrigger = 0 }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error(err);
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  const handleDocumentClick = (doc: Document) => {
    if (doc.publicUrl) {
      window.open(doc.publicUrl, "_blank");
    } else {
      // Fallback behavior: maybe alert or just log for now since viewer is gone
      console.log("No public URL for document:", doc.filename);
      // Optional: Trigger download if we had a download URL
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 border-l border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documents
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchDocuments}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : documents.length === 0 ? (
            <div className="text-gray-500 text-center py-10">
              {loading ? "Loading..." : "No documents found."}
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleDocumentClick(doc)}
                className={`
                  group flex items-center justify-between p-3 rounded-lg border bg-white shadow-sm 
                  hover:shadow-md transition-all cursor-pointer
                  ${doc.publicUrl ? "hover:border-blue-300" : "hover:border-gray-300"}
                `}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`
                    p-2 rounded-md 
                    ${doc.publicUrl ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}
                  `}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm truncate text-gray-900">
                      {doc.filename}
                    </span>
                    <span className="text-xs text-gray-500">
                      {doc.createdAt
                        ? format(new Date(doc.createdAt), "MMM d, yyyy HH:mm")
                        : "Unknown date"}
                    </span>
                  </div>
                </div>
                
                {doc.publicUrl && (
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
