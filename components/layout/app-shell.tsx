"use client";

import { AppHeader } from "./app-header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative">
      <div className="flex-1 flex flex-col min-w-0 pl-0 md:pl-0">
        <AppHeader />
        <main className="flex-1 overflow-hidden relative">{children}</main>
      </div>
    </div>
  );
}
