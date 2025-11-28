"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Message } from "@/types";
import { sendMessage } from "@/lib/api";
import { toast } from "sonner";

interface ChatInterfaceProps {
  onMessageSuccess?: () => void;
}

export function ChatInterface({ onMessageSuccess }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
      const response = await sendMessage(userMessage.content);
      setMessages((prev) => [...prev, response]);
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
    <div className="flex flex-col h-full relative">
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full py-10">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 opacity-50">
              <h2 className="text-2xl font-medium text-gray-400">
                Fique à vontade, Lucas. Estou aqui para o que precisar.
              </h2>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <Avatar className="w-8 h-8 border shadow-sm">
                  <AvatarFallback
                    className={
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-blue-600"
                    }
                  >
                    {message.role === "user" ? (
                      <User className="w-5 h-5" />
                    ) : (
                      <Bot className="w-5 h-5" />
                    )}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm shadow-sm ${
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-white text-gray-800 rounded-tl-none"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-4">
              <Avatar className="w-8 h-8 border shadow-sm">
                <AvatarFallback className="bg-white text-blue-600">
                  <Bot className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 pb-8">
        <div className="max-w-3xl mx-auto relative">
          <div className="relative flex items-end bg-white rounded-3xl shadow-md border border-gray-200 px-4 py-2 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Textarea
              placeholder="Digite sua pergunta aqui..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent text-gray-700 placeholder:text-gray-400 min-h-[44px] max-h-[400px] resize-none py-3"
              rows={1}
            />
            <div className="flex items-center gap-2 ml-2 mb-1">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-blue-600 rounded-full h-8 w-8">
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                variant="ghost"
                size="icon"
                className="text-blue-600 hover:bg-blue-50 rounded-full h-8 w-8"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="text-center mt-2 text-xs text-gray-400">
            v 1.10.0
          </div>
        </div>
      </div>
    </div>
  );
}
