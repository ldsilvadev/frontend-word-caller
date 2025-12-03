import React from "react";

interface SplitViewProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export function SplitView({ left, right }: SplitViewProps) {
  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden bg-background">
      {/* Chat - responsivo: full width em mobile, 40% em desktop */}
      <div className="w-full md:w-[40%] h-[50%] md:h-full border-b md:border-b-0 md:border-r border-border flex flex-col min-h-0 overflow-hidden">
        {left}
      </div>
      {/* Editor - responsivo: full width em mobile, 60% em desktop */}
      <div className="w-full md:w-[60%] h-[50%] md:h-full flex flex-col bg-muted/30 min-h-0 overflow-hidden">
        {right}
      </div>
    </div>
  );
}
