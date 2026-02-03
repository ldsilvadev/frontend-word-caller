"use client";

import { useState, useCallback, useRef } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ConversationList } from "@/components/conversations/conversation-list";
import { AppShell } from "@/components/layout/app-shell";
import {
  DocumentEditor,
  DocumentEditorRef,
} from "@/components/draft/DocumentEditor";
import { Button } from "@/components/ui/button";
import { ConversationSummary, Message } from "@/types";
import { getConversation } from "@/lib/api";
import { toast } from "sonner";

export default function Home() {
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] =
    useState<ConversationSummary | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>(
    []
  );
  const [conversationListKey, setConversationListKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const editorRef = useRef<DocumentEditorRef>(null);

  // Carregar mensagens quando selecionar uma conversa
  const loadConversation = async (conv: ConversationSummary) => {
    try {
      const detail = await getConversation(conv.id);
      const messages: Message[] = detail.messages.map((m, i) => ({
        id: `${conv.id}-${i}`,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
      }));
      setConversationMessages(messages);

      if (detail.document?.draftId) {
        setActiveDraftId(detail.document.draftId);
      } else {
        setActiveDraftId(null);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error("Erro ao carregar conversa");
    }
  };

  const handleSelectConversation = useCallback(
    async (conv: ConversationSummary) => {
      setActiveConversation(conv);
      await loadConversation(conv);
    },
    []
  );

  const handleNewConversation = useCallback(() => {
    // Limpa tudo para começar uma conversa do zero
    // (usado quando deleta a conversa ativa)
    setActiveConversation(null);
    setConversationMessages([]);
    setActiveDraftId(null);
  }, []);

  const handleStartFreshConversation = useCallback(() => {
    // Chamado pelo botão "Nova Conversa" - não limpa activeConversation
    // pois o ConversationList já vai selecionar a nova conversa criada
    setConversationMessages([]);
    setActiveDraftId(null);
  }, []);

  const handleConversationCreated = useCallback(
    (conv: { id: string; title: string }) => {
      // Criar um objeto ConversationSummary mínimo
      const newConv: ConversationSummary = {
        id: conv.id,
        title: conv.title,
        messagesCount: 0,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setActiveConversation(newConv);
      setConversationListKey((k) => k + 1);
    },
    []
  );

  const handleOpenDraft = useCallback((id: string) => {
    setActiveDraftId(id);
  }, []);

  const handleDraftUpdated = useCallback(
    (draftId: string) => {
      if (activeDraftId === draftId) {
        editorRef.current?.reloadDocument();
      } else {
        setActiveDraftId(draftId);
      }
      setConversationListKey((k) => k + 1);
    },
    [activeDraftId]
  );

  return (
    <AppShell>
      <div className="flex h-full">
        {/* Sidebar de conversas - retrátil */}
        <div
          className={`
            border-r shrink-0 transition-all duration-300 ease-in-out
            ${sidebarOpen ? "w-64" : "w-0"}
            overflow-hidden
          `}
        >
          <div className="w-64 h-full">
            <ConversationList
              key={conversationListKey}
              activeConversationId={activeConversation?.id}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleStartFreshConversation}
              onClearConversation={handleNewConversation}
            />
          </div>
        </div>

        {/* Área principal */}
        <div className="flex-1 flex min-w-0 relative">
          {/* Botão toggle sidebar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-2 left-2 z-10 h-8 w-8 bg-white/80 hover:bg-white shadow-sm"
            title={sidebarOpen ? "Fechar sidebar" : "Abrir sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>

          {/* Chat */}
          <div className="flex-1 min-w-0 border-r">
            <ChatInterface
              onOpenDraft={handleOpenDraft}
              onDraftUpdated={handleDraftUpdated}
              activeDraftId={activeDraftId}
              conversationId={activeConversation?.id}
              initialMessages={conversationMessages}
              onConversationCreated={handleConversationCreated}
              activeConversation={activeConversation}
            />
          </div>

          {/* Editor */}
          <div className="w-1/2 min-w-[400px]">
            {activeDraftId ? (
              <DocumentEditor
                ref={editorRef}
                draftId={activeDraftId}
                onPublishSuccess={() => {
                  console.log("Document published successfully");
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground bg-gray-50">
                <div className="text-center">
                  <p className="text-lg mb-2">Nenhum documento aberto</p>
                  <p className="text-sm text-gray-400">
                    Peça para a IA criar um documento ou importe um existente
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
