"use client";

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { OnlyOfficeEditor, OnlyOfficeEditorRef } from "./OnlyOfficeEditor";
import { getDraftStatus, publishDraft, DraftStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, RefreshCw, FileText, Clock, Download, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface DocumentEditorRef {
  reloadDocument: () => Promise<void>;
}

interface DocumentEditorProps {
  draftId: number;
  onPublishSuccess?: () => void;
}

export const DocumentEditor = forwardRef<DocumentEditorRef, DocumentEditorProps>(
  function DocumentEditor({ draftId, onPublishSuccess }, ref) {
    const [status, setStatus] = useState<DraftStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const [publishedInfo, setPublishedInfo] = useState<{ filename: string; downloadUrl?: string } | null>(null);
    
    const onlyOfficeRef = useRef<OnlyOfficeEditorRef>(null);

    // Carregar status do draft
    const loadStatus = async () => {
      try {
        const data = await getDraftStatus(draftId);
        setStatus(data);
      } catch (error) {
        console.error("Error loading draft status:", error);
        toast.error("Erro ao carregar status do documento");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadStatus();
    }, [draftId]);

    // Expor método de reload
    useImperativeHandle(ref, () => ({
      reloadDocument: async () => {
        setIsReloading(true);
        toast.info("Recarregando documento...");
        
        // Recarregar o OnlyOffice
        await onlyOfficeRef.current?.reloadDocument();
        
        // Atualizar status
        await loadStatus();
        
        setIsReloading(false);
        toast.success("Documento recarregado!");
      },
    }), []);

    // Publicar documento
    const handlePublish = async () => {
      try {
        setPublishing(true);
        const result = await publishDraft(draftId);
        setPublishedInfo({
          filename: result.filename,
          downloadUrl: result.downloadUrl,
        });
        toast.success("Documento publicado!", {
          description: `Arquivo: ${result.filename}`,
        });
        onPublishSuccess?.();
        await loadStatus();
      } catch (error) {
        console.error("Error publishing:", error);
        toast.error("Erro ao publicar documento");
      } finally {
        setPublishing(false);
      }
    };

    // Download do documento publicado
    const handleDownload = () => {
      const downloadUrl = `${API_URL}/drafts/${draftId}/download`;
      window.open(downloadUrl, "_blank");
    };

    // Recarregar documento
    const handleReload = async () => {
      setIsReloading(true);
      await onlyOfficeRef.current?.reloadDocument();
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

            {(status?.status === "published" || publishedInfo) && (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleDownload}
                className="bg-green-100 hover:bg-green-200 text-green-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar
              </Button>
            )}
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

        {/* OnlyOffice Editor */}
        <div className="flex-1 overflow-hidden">
          <OnlyOfficeEditor
            ref={onlyOfficeRef}
            draftId={draftId}
            onSave={() => {
              toast.success("Documento salvo!");
              loadStatus();
            }}
            onError={(error) => {
              toast.error(`Erro: ${error}`);
            }}
          />
        </div>
      </div>
    );
  }
);

export default DocumentEditor;
