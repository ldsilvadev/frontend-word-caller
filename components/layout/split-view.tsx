import React from "react";

interface SplitViewProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export function SplitView({ left, right }: SplitViewProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="w-[40%] h-full border-r border-border flex flex-col">
        {left}
      </div>
      <div className="w-[60%] h-full flex flex-col bg-muted/30">{right}</div>
    </div>
  );
}
