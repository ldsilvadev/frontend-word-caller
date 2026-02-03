"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  FileText,
  Plus,
  Search,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationSummary } from "@/types";
import {
  getConversations,
  createConversation,
  archiveConversation,
} from "@/lib/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PolicyMetadataForm } from "./policy-metadata-form";

interface ConversationListProps {
  activeConversationId?: string | null;
  onSelectConversation: (conversation: ConversationSummary) => void;
  onNewConversation: () => void;
  onClearConversation?: () => void;
}

export function ConversationList({
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onClearConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showMetadataForm, setShowMetadataForm] = useState(false);

  const loadConversations = async (search?: string) => {
    try {
      const data = await getConversations(search);
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      loadConversations(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleNewConversation = () => {
    // Abrir formulário de metadata
    setShowMetadataForm(true);
  };

  const handleMetadataSubmit = async (metadata: {
    entidade: string;
    area: string;
    tipologia: string;
  }) => {
    try {
      const conv = await createConversation({
        title: `Política ${metadata.area}`,
        metadata,
      });
      setConversations((prev) => [conv, ...prev]);
      onNewConversation(); // Limpa mensagens e draft
      onSelectConversation(conv); // Seleciona a nova conversa
      setShowMetadataForm(false);

      // Exibir código gerado
      if (conv.codigo) {
        toast.success(`Política criada: ${conv.codigo}`, {
          description: `Entidade: ${conv.entidade} | Área: ${conv.area} | Tipologia: ${conv.tipologia}`,
        });
      }
    } catch (error) {
      toast.error("Erro ao criar conversa");
    }
  };

  const handleMetadataCancel = () => {
    setShowMetadataForm(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await archiveConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        onClearConversation?.();
      }
      toast.success("Conversa excluída");
    } catch (error) {
      toast.error("Erro ao excluir conversa");
    }
  };



  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "";
    }
  };

  return (
    <>
      {/* Formulário de Metadata */}
      {showMetadataForm && (
        <PolicyMetadataForm
          onSubmit={handleMetadataSubmit}
          onCancel={handleMetadataCancel}
        />
      )}

      <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="p-3 border-b bg-white">
        <Button
          onClick={handleNewConversation}
          className="w-full mb-3 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Conversa
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Carregando...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`
                  group p-3 rounded-lg cursor-pointer transition-colors
                  ${
                    activeConversationId === conv.id
                      ? "bg-blue-100 border-blue-200"
                      : "hover:bg-gray-100"
                  }
                `}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`
                    p-2 rounded-lg shrink-0
                    ${conv.document?.hasDocument ? "bg-green-100" : "bg-gray-100"}
                  `}
                  >
                    {conv.document?.hasDocument ? (
                      <FileText className="w-4 h-4 text-green-600" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1">
                      <h3 className="font-medium text-sm text-gray-900 truncate flex-1 max-w-[140px]">
                        {conv.title}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                        onClick={(e) => handleDelete(conv.id, e)}
                        title="Excluir conversa"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>

                    {conv.codigo && (
                      <p className="text-xs text-blue-600 font-mono truncate mt-0.5 max-w-[160px]">
                        📋 {conv.codigo}
                      </p>
                    )}

                    {conv.document?.title && (
                      <p className="text-xs text-green-600 truncate mt-0.5 max-w-[160px]">
                        📄 {conv.document.title}
                      </p>
                    )}

                    {conv.lastMessage && (
                      <p className="text-xs text-gray-500 truncate mt-1 max-w-[160px]">
                        {conv.lastMessage}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400">
                        {formatDate(conv.updatedAt)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        • {conv.messagesCount} msgs
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
    </>
  );
}
