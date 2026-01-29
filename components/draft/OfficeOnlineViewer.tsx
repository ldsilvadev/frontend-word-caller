"use client";

import { useEffect, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export interface PreviewData {
  previewUrl: string;
  fileName: string;
  title: string;
  lastModified: string;
  downloadUrl: string;
  webUrl?: string;
}

export interface OfficeOnlineViewerRef {
  reloadPreview: () => Promise<void>;
}

interface OfficeOnlineViewerProps {
  draftId: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

async function getOneDrivePreview(id: string): Promise<PreviewData> {
  const response = await fetch(`${API_URL}/onedrive/preview/${id}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to fetch preview" }));
    throw new Error(error.message || "Failed to fetch OneDrive preview");
  }
  return await response.json();
}

export const OfficeOnlineViewer = forwardRef<OfficeOnlineViewerRef, OfficeOnlineViewerProps>(
  function OfficeOnlineViewer({ draftId, onLoad, onError }, ref) {
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [iframeKey, setIframeKey] = useState(0);

    const loadPreview = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getOneDrivePreview(draftId);
        setPreviewData(data);

        onLoad?.();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erro ao carregar preview";
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setLoading(false);
      }
    }, [draftId, onLoad, onError]);

    useEffect(() => {
      loadPreview();
    }, [loadPreview]);

    const reload = useCallback(async () => {
      toast.info("Recarregando preview...");
      setIframeKey(prev => prev + 1);
      await loadPreview();
    }, [loadPreview]);

    useImperativeHandle(ref, () => ({
      reloadPreview: reload,
    }), [reload]);

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-8">
          <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Não foi possível carregar o preview
          </h3>
          <p className="text-gray-600 text-center mb-4 max-w-md">{error}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 max-w-md">
            <p className="text-sm text-amber-800">
              <strong>Possíveis causas:</strong>
            </p>
            <ul className="text-sm text-amber-700 list-disc list-inside mt-2">
              <li>OneDrive não configurado no backend</li>
              <li>Documento ainda não foi sincronizado</li>
              <li>Credenciais Azure AD inválidas</li>
            </ul>
          </div>
          <div className="flex gap-2">
            <Button onClick={reload} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      );
    }

    if (loading || !previewData) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Carregando preview...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="relative flex flex-col h-full w-full">
        {/* Preview Info Bar */}
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <span className="font-medium">Preview Somente Leitura</span>
            <span className="text-xs text-blue-600">
              Edições via IA apenas
            </span>
          </div>
          {previewData.webUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(previewData.webUrl, "_blank")}
              className="text-blue-700 hover:text-blue-900"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Abrir no OneDrive
            </Button>
          )}
        </div>

        {/* Office Online Iframe */}
        <iframe
          key={iframeKey}
          src={previewData.previewUrl}
          className="flex-1 w-full border-0"
          title={`Preview de ${previewData.fileName}`}
          allowFullScreen
        />
      </div>
    );
  }
);
