"use client";

import React, { useState, useCallback } from "react";
import { ChatInterface } from "@/components/chat/chat-interface";
import { AppShell } from "@/components/layout/app-shell";
import { SplitView } from "@/components/layout/split-view";
import { DraftEditor } from "@/components/draft/DraftEditor";

export default function Home() {
  const [activeDraftId, setActiveDraftId] = useState<number | null>(null);

  const handleOpenDraft = useCallback((id: number) => {
    console.log("Home: handleOpenDraft called with ID:", id);
    setActiveDraftId(id);
  }, []);

  return (
    <AppShell>
      <SplitView
        left={<ChatInterface onOpenDraft={handleOpenDraft} />}
        right={
          activeDraftId ? (
            <DraftEditor
              draftId={activeDraftId}
              onGenerateSuccess={() => {
                // Optional: maybe close editor or show success message
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a draft to review
            </div>
          )
        }
      />
    </AppShell>
  );
}
