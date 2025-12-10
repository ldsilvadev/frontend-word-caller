"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export interface OnlyOfficeEditorRef {
  reloadDocument: () => Promise<void>;
}

interface OnlyOfficeEditorProps {
  draftId: string; // MongoDB ObjectId
  onSave?: () => void;
  onError?: (error: string) => void;
}

interface OnlyOfficeConfig {
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: Record<string, boolean>;
  };
  documentType: string;
  editorConfig: {
    callbackUrl: string;
    lang: string;
    mode: string;
    user: { id: string; name: string };
    customization: Record<string, boolean>;
  };
  token?: string;
}

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (elementId: string, config: OnlyOfficeConfig) => {
        destroyEditor: () => void;
      };
    };
  }
}

export const OnlyOfficeEditor = forwardRef<OnlyOfficeEditorRef, OnlyOfficeEditorProps>(
  function OnlyOfficeEditor({ draftId, onSave, onError }, ref) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const editorInstanceRef = useRef<{ destroyEditor: () => void } | null>(null);
    const editorIdRef = useRef(`oo-editor-${Date.now()}`);
    const initAttemptRef = useRef(0);

    const destroyEditor = useCallback(() => {
      if (editorInstanceRef.current) {
        try {
          editorInstanceRef.current.destroyEditor();
        } catch {
          // Ignorar
        }
        editorInstanceRef.current = null;
      }
      if (editorContainerRef.current) {
        editorContainerRef.current.innerHTML = "";
      }
    }, []);

    const reload = useCallback(() => {
      destroyEditor();
      editorIdRef.current = `oo-editor-${Date.now()}`;
      initAttemptRef.current++;
      setReady(false);
      setLoading(true);
      setError(null);
      setTimeout(() => setReady(true), 50);
    }, [destroyEditor]);

    useImperativeHandle(ref, () => ({
      reloadDocument: async () => {
        toast.info("Recarregando documento...");
        // Pequeno delay para garantir que o arquivo foi salvo no disco
        await new Promise(resolve => setTimeout(resolve, 500));
        reload();
      },
    }), [reload]);

    useEffect(() => {
      setReady(true);
      return () => destroyEditor();
    }, [destroyEditor]);

    useEffect(() => {
      if (!ready) return;

      let cancelled = false;
      let timeoutId: NodeJS.Timeout;

      const init = async () => {
        try {
          // Verificar disponibilidade
          const statusRes = await fetch(`${API_URL}/onlyoffice/status`);
          const statusData = await statusRes.json();
          
          if (!statusData.available) {
            if (!cancelled) {
              setError("OnlyOffice não disponível. Execute: docker-compose up -d");
              setLoading(false);
            }
            return;
          }

          // Carregar script
          if (!window.DocsAPI) {
            await new Promise<void>((resolve, reject) => {
              const scriptUrl = `${statusData.serverUrl}/web-apps/apps/api/documents/api.js`;
              const existing = document.querySelector(`script[src="${scriptUrl}"]`);
              
              if (existing && window.DocsAPI) {
                resolve();
                return;
              }
              
              if (existing) {
                const checkInterval = setInterval(() => {
                  if (window.DocsAPI) {
                    clearInterval(checkInterval);
                    resolve();
                  }
                }, 100);
                setTimeout(() => {
                  clearInterval(checkInterval);
                  reject(new Error("Timeout loading script"));
                }, 10000);
                return;
              }

              const script = document.createElement("script");
              script.src = scriptUrl;
              script.onload = () => {
                const checkInterval = setInterval(() => {
                  if (window.DocsAPI) {
                    clearInterval(checkInterval);
                    resolve();
                  }
                }, 100);
                setTimeout(() => {
                  clearInterval(checkInterval);
                  resolve();
                }, 3000);
              };
              script.onerror = () => reject(new Error("Failed to load script"));
              document.head.appendChild(script);
            });
          }

          if (cancelled) return;

          // Obter config
          const configRes = await fetch(`${API_URL}/onlyoffice/config/${draftId}`);
          if (!configRes.ok) throw new Error("Falha ao obter configuração");
          const { config } = await configRes.json();

          if (cancelled) return;

          const container = editorContainerRef.current;
          if (!container) return;

          const editorDiv = document.createElement("div");
          editorDiv.id = editorIdRef.current;
          editorDiv.style.width = "100%";
          editorDiv.style.height = "100%";
          container.innerHTML = "";
          container.appendChild(editorDiv);

          if (cancelled) return;

          if (window.DocsAPI) {
            const fullConfig = {
              ...config,
              height: "100%",
              width: "100%",
              events: {
                onReady: () => {
                  console.log("[OnlyOffice] Ready");
                  if (!cancelled) setLoading(false);
                },
                onAppReady: () => {
                  console.log("[OnlyOffice] App Ready");
                  if (!cancelled) setLoading(false);
                },
                onDocumentReady: () => {
                  console.log("[OnlyOffice] Document Ready");
                  if (!cancelled) setLoading(false);
                },
                onRequestSaveAs: () => onSave?.(),
                onError: (e: { data?: { errorDescription?: string } }) => {
                  console.error("[OnlyOffice] Error:", e);
                  onError?.(e?.data?.errorDescription || "Erro");
                },
              },
            };

            editorInstanceRef.current = new window.DocsAPI.DocEditor(
              editorIdRef.current,
              fullConfig
            );
            
            timeoutId = setTimeout(() => {
              if (!cancelled) setLoading(false);
            }, 5000);
          }
        } catch (err) {
          console.error("[OnlyOffice] Init error:", err);
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Erro ao inicializar");
            setLoading(false);
          }
        }
      };

      init();

      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    }, [ready, draftId, onSave, onError]);

    // Recarregar quando draftId mudar
    useEffect(() => {
      if (initAttemptRef.current > 0) {
        reload();
      }
    }, [draftId]); // eslint-disable-line react-hooks/exhaustive-deps

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-8">
          <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">OnlyOffice não disponível</h3>
          <p className="text-gray-600 text-center mb-4 max-w-md">{error}</p>
          <div className="bg-gray-800 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
            <p>$ cd mcp-word-caller</p>
            <p>$ docker-compose up -d</p>
          </div>
          <Button onClick={reload} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      );
    }

    return (
      <div className="relative flex flex-col h-full w-full">
        {loading && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white/95 shadow-lg rounded-lg px-4 py-2 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Carregando editor...</span>
          </div>
        )}
        <div
          ref={editorContainerRef}
          className="flex-1 w-full"
          style={{ height: "100%", minHeight: "600px" }}
        />
      </div>
    );
  }
);
