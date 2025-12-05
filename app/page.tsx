"use client";

import { useState, useCallback, useRef } from "react";
import { ChatInterface } from "@/components/chat/chat-interface";
import { AppShell } from "@/components/layout/app-shell";
import { SplitView } from "@/components/layout/split-view";
import { DocumentEditor, DocumentEditorRef } from "@/components/draft/DocumentEditor";

export default function Home() {
  const [activeDraftId, setActiveDraftId] = useState<number | null>(null);
  const editorRef = useRef<DocumentEditorRef>(null);

  const handleOpenDraft = useCallback((id: number) => {
    console.log("Home: Opening draft ID:", id);
    setActiveDraftId(id);
  }, []);

  // Chamado quando a IA cria ou atualiza o draft
  const handleDraftUpdated = useCallback((draftId: number) => {
    console.log("Home: Draft updated/created, ID:", draftId, "Active:", activeDraftId);
    
    if (activeDraftId === draftId) {
      // Draft ativo foi atualizado - recarregar o OnlyOffice
      console.log("Home: Reloading document in OnlyOffice");
      editorRef.current?.reloadDocument();
    } else {
      // Novo draft - abrir no editor
      console.log("Home: Opening new draft");
      setActiveDraftId(draftId);
    }
  }, [activeDraftId]);

  return (
    <AppShell>
      <SplitView
        left={
          <ChatInterface 
            onOpenDraft={handleOpenDraft} 
            onDraftUpdated={handleDraftUpdated}
            activeDraftId={activeDraftId}
          />
        }
        right={
          activeDraftId ? (
            <DocumentEditor
              ref={editorRef}
              draftId={activeDraftId}
              onPublishSuccess={() => {
                console.log("Document published successfully");
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Selecione um rascunho para visualizar
            </div>
          )
        }
      />
    </AppShell>
  );
}
