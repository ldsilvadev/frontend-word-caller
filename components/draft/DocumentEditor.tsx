"use client";

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { OfficeOnlineViewer, OfficeOnlineViewerRef } from "./OfficeOnlineViewer";
import { getDraftStatus, publishDraft, DraftStatus, getOneDriveDownloadUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, RefreshCw, FileText, Clock, Download, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export interface DocumentEditorRef {
  reloadDocument: () => Promise<void>;
}

interface DocumentEditorProps {
  draftId: string; // MongoDB ObjectId
  onPublishSuccess?: () => void;
}

export const DocumentEditor = forwardRef<DocumentEditorRef, DocumentEditorProps>(
  function DocumentEditor({ draftId, onPublishSuccess }, ref) {
    const [status, setStatus] = useState<DraftStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const [publishedInfo, setPublishedInfo] = useState<{ filename: string; downloadUrl?: string } | null>(null);

    const viewerRef = useRef<OfficeOnlineViewerRef>(null);

    // Carregar status do draft
    const loadStatus = async () => {
      try {
        const data = await getDraftStatus(draftId);
        setStatus(data);
        
        // Se já está publicado, carregar info de publicação
        if (data.status === "published") {
          setPublishedInfo({
            filename: data.filePath?.split("/").pop() || "documento.docx",
            downloadUrl: undefined,
          });
        }
      } catch (error) {
        console.error("Error loading draft status:", error);
        toast.error("Erro ao carregar status do documento");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      setPublishedInfo(null); // Reset ao mudar de draft
      loadStatus();
    }, [draftId]);

    // Expor método de reload (só funciona se não estiver publicado)
    useImperativeHandle(ref, () => ({
      reloadDocument: async () => {
        if (status?.status === "published" || publishedInfo) {
          console.log("[DocumentEditor] Documento já publicado, ignorando reload");
          return;
        }

        setIsReloading(true);
        toast.info("Recarregando preview...");

        await viewerRef.current?.reloadPreview();
        await loadStatus();

        setIsReloading(false);
        toast.success("Preview recarregado!");
      },
    }), [status?.status, publishedInfo]);

    // Publicar documento
    const handlePublish = async () => {
      try {
        setPublishing(true);
        const result = await publishDraft(draftId);
        setPublishedInfo({
          filename: result.filename,
          downloadUrl: result?.downloadUrl || undefined,
        });
        toast.success("Documento exportado com sucesso!", {
          description: `Arquivo: ${result.filename}`,
        });
        onPublishSuccess?.();
        await loadStatus();
      } catch (error) {
        console.error("Error publishing:", error);
        toast.error("Erro ao exportar documento");
      } finally {
        setPublishing(false);
      }
    };

    // Download do documento publicado
    const handleDownload = () => {
      // Usar endpoint do OneDrive
      const downloadUrl = getOneDriveDownloadUrl(draftId);
      window.open(downloadUrl, "_blank");
    };

    // Recarregar documento
    const handleReload = async () => {
      setIsReloading(true);
      await viewerRef.current?.reloadPreview();
      await loadStatus();
      setIsReloading(false);
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    if (!status) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          Documento não encontrado
        </div>
      );
    }

    // Se o documento foi publicado, mostrar tela de sucesso com botão de download
    const isPublished = status.status === "published" || publishedInfo;
    
    if (isPublished) {
      return (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-800 truncate">
                {status.title}
              </h2>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded font-medium">
                Exportado
              </span>
            </div>
          </div>

          {/* Metadata */}
          {status.metadata && (
            <div className="bg-gray-50 border-b px-4 py-2 flex gap-4 text-xs text-gray-600">
              <span><strong>Código:</strong> {status.metadata.codigo}</span>
              <span><strong>Departamento:</strong> {status.metadata.departamento}</span>
              <span><strong>Revisão:</strong> {status.metadata.revisao}</span>
              <span><strong>Vigência:</strong> {status.metadata.data_vigencia}</span>
            </div>
          )}

          {/* Conteúdo - Tela de documento exportado */}
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white p-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Documento Exportado!
              </h3>
              
              <p className="text-gray-600 mb-6">
                O documento foi exportado com sucesso e está disponível para download.
              </p>


              <Button 
                size="lg"
                onClick={handleDownload}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="mr-2 h-5 w-5" />
                Baixar Documento
              </Button>

              <p className="text-xs text-gray-400 mt-4">
                O documento está armazenado na nuvem e pode ser baixado a qualquer momento.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Documento ainda não publicado - mostrar preview Office Online
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className={`bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm ${isReloading ? "bg-blue-50 border-blue-200" : ""}`}>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800 truncate">
              {status.title}
            </h2>
            
            {status.lastModified && (
              <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                <Clock className="h-3 w-3" />
                {new Date(status.lastModified).toLocaleString("pt-BR")}
              </span>
            )}
            
            {isReloading && (
              <span className="flex items-center gap-1.5 text-sm text-blue-600 bg-blue-100 px-2 py-0.5 rounded animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Atualizando...
              </span>
            )}
          </div>
          
          <div className="flex gap-2 items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReload}
              disabled={isReloading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isReloading ? "animate-spin" : ""}`} />
              Recarregar
            </Button>
            
            <Button 
              size="sm" 
              onClick={handlePublish}
              disabled={publishing || isReloading}
            >
              {publishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Exportar
            </Button>
          </div>
        </div>

        {/* Metadata */}
        {status.metadata && (
          <div className="bg-gray-50 border-b px-4 py-2 flex gap-4 text-xs text-gray-600">
            <span><strong>Código:</strong> {status.metadata.codigo}</span>
            <span><strong>Departamento:</strong> {status.metadata.departamento}</span>
            <span><strong>Revisão:</strong> {status.metadata.revisao}</span>
            <span><strong>Vigência:</strong> {status.metadata.data_vigencia}</span>
          </div>
        )}

        {/* Office Online Viewer */}
        <div className="flex-1 overflow-hidden">
          <OfficeOnlineViewer
            ref={viewerRef}
            draftId={draftId}
            onLoad={() => {
              console.log("[DocumentEditor] Preview carregado");
            }}
            onError={(error) => {
              toast.error(`Erro no preview: ${error}`);
            }}
          />
        </div>
      </div>
    );
  }
);

export default DocumentEditor;
