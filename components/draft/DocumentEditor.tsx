"use client";

import { useState, useRef, forwardRef, useImperativeHandle, useEffect, useCallback } from "react";
import { OnlyOfficeEditor, OnlyOfficeEditorRef } from "./OnlyOfficeEditor";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { publishDraft, getDraft } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface DocumentMetadata {
  assunto: string;
  codigo: string;
  departamento: string;
  revisao: string;
  data_publicacao: string;
  data_vigencia: string;
}

export interface DocumentEditorRef {
  reloadDraft: () => Promise<void>;
  getCurrentContent: () => { markdown: string; metadata: DocumentMetadata } | null;
}

interface DocumentEditorProps {
  draftId: number;
  onGenerateSuccess?: () => void;
}

export const DocumentEditor = forwardRef<DocumentEditorRef, DocumentEditorProps>(
  function DocumentEditor({ draftId, onGenerateSuccess }, ref) {
    const [publishing, setPublishing] = useState(false);
    const [sharePointLink, setSharePointLink] = useState<string | null>(null);
    const [draftTitle, setDraftTitle] = useState<string>("");
    const [onlyOfficeAvailable, setOnlyOfficeAvailable] = useState<boolean | null>(null);
    
    const onlyOfficeRef = useRef<OnlyOfficeEditorRef>(null);

    // Carregar informações do draft
    useEffect(() => {
      const loadDraftInfo = async () => {
        try {
          const draft = await getDraft(draftId);
          setDraftTitle(draft.title);
        } catch {
          console.error("Failed to load draft info");
        }
      };
      loadDraftInfo();
    }, [draftId]);

    // Verificar disponibilidade do OnlyOffice
    useEffect(() => {
      const checkOnlyOffice = async () => {
        try {
          const response = await fetch(`${API_URL}/onlyoffice/status`);
          const data = await response.json();
          setOnlyOfficeAvailable(data.available);
        } catch {
          setOnlyOfficeAvailable(false);
        }
      };
      checkOnlyOffice();
    }, []);

    // Publicar documento (gerar Word final e enviar para SharePoint)
    const handlePublish = useCallback(async () => {
      try {
        setPublishing(true);
        toast.info("Gerando documento Word e enviando para SharePoint...");
        
        const result = await publishDraft(draftId);
        
        if (result.sharePointLink) {
          setSharePointLink(result.sharePointLink);
          toast.success("Documento publicado com sucesso!", {
            description: "O documento foi enviado para o SharePoint",
            action: {
              label: "Abrir",
              onClick: () => window.open(result.sharePointLink!, "_blank"),
            },
          });
        } else {
          toast.success("Documento gerado!", {
            description: `Arquivo: ${result.filename}`,
          });
        }
        
        onGenerateSuccess?.();
      } catch (error) {
        console.error("Publish error:", error);
        toast.error("Erro ao publicar documento");
      } finally {
        setPublishing(false);
      }
    }, [draftId, onGenerateSuccess]);

    // Expor métodos via ref
    useImperativeHandle(ref, () => ({
      reloadDraft: async () => {
        if (onlyOfficeRef.current) {
          await onlyOfficeRef.current.reloadDocument();
        }
      },
      getCurrentContent: () => {
        // OnlyOffice salva automaticamente no servidor
        // O backend pega o conteúdo do arquivo salvo
        return null;
      },
    }), []);

    return (
      <div className="flex flex-col h-full">
        {/* Header com título e botão de publicar */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800 truncate max-w-md">
              {draftTitle || "Carregando..."}
            </h2>
            {onlyOfficeAvailable === false && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                OnlyOffice offline
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {sharePointLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(sharePointLink, "_blank")}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir no SharePoint
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onlyOfficeRef.current?.reloadDocument()}
              disabled={publishing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publishing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {publishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  Gerar Word Final
                </>
              )}
            </Button>
          </div>
        </div>

        {/* OnlyOffice Editor */}
        <div className="flex-1 overflow-hidden">
          <OnlyOfficeEditor
            ref={onlyOfficeRef}
            draftId={draftId}
            onSave={() => {
              // Salvo automaticamente pelo OnlyOffice
            }}
            onError={(error) => {
              toast.error("Erro no editor", { description: error });
            }}
          />
        </div>
      </div>
    );
  }
);
