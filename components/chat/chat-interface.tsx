"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Message } from "@/types";
import { sendMessage } from "@/lib/api";
import { toast } from "sonner";

interface EditorContent {
  markdown: string;
  metadata: {
    assunto: string;
    codigo: string;
    departamento: string;
    revisao: string;
    data_publicacao: string;
    data_vigencia: string;
  };
}

interface ChatInterfaceProps {
  onMessageSuccess?: () => void;
  onOpenDraft?: (id: number) => void;
  onDraftUpdated?: (draftId: number) => void;
  activeDraftId?: number | null;
  getEditorContent?: () => EditorContent | null;
}

export function ChatInterface({
  onMessageSuccess,
  onOpenDraft,
  onDraftUpdated,
  activeDraftId,
  getEditorContent,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track which draft IDs we've already opened to avoid re-opening
  const [openedDraftIds, setOpenedDraftIds] = useState<Set<string>>(new Set());

  // Helper function to extract draft ID from message content
  const extractDraftId = (content: string): number | null => {
    // Try multiple patterns to find draft ID
    const patterns = [
      /ID\s*:?\s*\**(\d+)\**/i,                    // ID: 123 or ID **123**
      /draft[_\s-]*id\s*:?\s*\**(\d+)\**/i,        // draft_id: 123, draft-id: 123
      /rascunho[_\s-]*id\s*:?\s*\**(\d+)\**/i,     // rascunho_id: 123 (Portuguese)
      /#(\d+)/,                                     // #123
      /draft\s*#?\s*(\d+)/i,                       // draft #123 or draft 123
      /rascunho\s*#?\s*(\d+)/i,                    // rascunho #123 (Portuguese)
      /"id"\s*:\s*(\d+)/i,                         // "id": 123 (JSON format)
      /criado.*?(\d+)/i,                           // criado com sucesso... 123
      /created.*?(\d+)/i,                          // created... 123
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }
    return null;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }

    // Auto-detect draft in the last message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "assistant" && onOpenDraft) {
      const draftId = extractDraftId(lastMessage.content);
      const messageKey = `${lastMessage.id}-${draftId}`;
      
      if (draftId && !openedDraftIds.has(messageKey)) {
        console.log("ChatInterface: Auto-detecting draft ID:", draftId);
        setOpenedDraftIds(prev => new Set(prev).add(messageKey));
        onOpenDraft(draftId);
      }
    }
  }, [messages, onOpenDraft, openedDraftIds]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Obter conteúdo atual do editor (pode ter edições manuais do usuário)
      const currentEditorContent = getEditorContent?.() || null;
      
      // Enviar mensagem com o ID do draft ativo e conteúdo atual do editor
      const response = await sendMessage(userMessage.content, activeDraftId, currentEditorContent);
      setMessages((prev) => [...prev, response]);
      
      // Se a IA atualizou o draft, notificar o componente pai para recarregar o editor
      if (response.draftUpdated && response.updatedDraftId && onDraftUpdated) {
        console.log("ChatInterface: Draft was updated by AI, notifying parent. Draft ID:", response.updatedDraftId);
        onDraftUpdated(response.updatedDraftId);
      }
      
      if (onMessageSuccess) {
        onMessageSuccess();
      }
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden relative">
      {/* Área de mensagens com scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-4 md:gap-6 max-w-3xl mx-auto w-full p-4 py-6 md:py-10">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[40vh] md:h-[50vh] text-center space-y-4 opacity-50 px-4">
                <h2 className="text-lg md:text-2xl font-medium text-gray-400">
                  Fique à vontade, Lucas. Estou aqui para o que precisar.
                </h2>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 md:gap-4 ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <Avatar className="w-7 h-7 md:w-8 md:h-8 border shadow-sm shrink-0">
                    <AvatarFallback
                      className={
                        message.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-white text-blue-600"
                      }
                    >
                      {message.role === "user" ? (
                        <User className="w-4 h-4 md:w-5 md:h-5" />
                      ) : (
                        <Bot className="w-4 h-4 md:w-5 md:h-5" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`rounded-2xl px-3 md:px-4 py-2 md:py-3 max-w-[85%] md:max-w-[80%] text-xs md:text-sm shadow-sm overflow-hidden ${
                      message.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-white text-gray-800 rounded-tl-none"
                    }`}
                  >
                    <div className="whitespace-pre-wrap wrap-anywhere">
                      {message.content}
                    </div>
                    {message.role === "assistant" && (() => {
                      const draftId = extractDraftId(message.content);
                      if (draftId) {
                        return (
                          <div className="mt-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                              onClick={() => {
                                console.log(
                                  "ChatInterface: Button clicked for draft ID:",
                                  draftId
                                );
                                onOpenDraft?.(draftId);
                              }}
                            >
                              Abrir Rascunho #{draftId}
                            </Button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex gap-2 md:gap-4">
                <Avatar className="w-7 h-7 md:w-8 md:h-8 border shadow-sm shrink-0">
                  <AvatarFallback className="bg-white text-blue-600">
                    <Bot className="w-4 h-4 md:w-5 md:h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white rounded-2xl rounded-tl-none px-3 md:px-4 py-2 md:py-3 shadow-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input fixo no bottom */}
      <div className="shrink-0 p-3 md:p-4 pb-4 md:pb-8 bg-linear-to-t from-background via-background to-transparent">
        <div className="max-w-3xl mx-auto relative">
          <div className="relative flex items-end bg-white rounded-2xl md:rounded-3xl shadow-md border border-gray-200 px-3 md:px-4 py-2 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Input
              placeholder="Digite sua pergunta aqui..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent text-gray-700 placeholder:text-gray-400 h-10 md:h-11 py-2 md:py-3 text-sm"
            />
            <div className="flex items-center gap-1 md:gap-2 ml-1 md:ml-2 mb-0.5 md:mb-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-blue-600 rounded-full h-7 w-7 md:h-8 md:w-8"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                variant="ghost"
                size="icon"
                className="text-blue-600 hover:bg-blue-50 rounded-full h-7 w-7 md:h-8 md:w-8"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="text-center mt-1 md:mt-2 text-[10px] md:text-xs text-gray-400">v 1.10.0</div>
        </div>
      </div>
    </div>
  );
}
