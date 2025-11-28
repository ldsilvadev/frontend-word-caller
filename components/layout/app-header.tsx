"use client";

import { HelpCircle, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  return (
    <header className="h-14 flex items-center justify-between px-4 bg-sidebar text-white shadow-sm">
      <div className="flex items-center gap-2">
        <div className="font-bold text-xl tracking-tight">
          Sistema <span className="font-extrabold">FIERGS</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-white hover:bg-sidebar-accent hover:text-white rounded-full">
          <HelpCircle className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white hover:bg-sidebar-accent hover:text-white rounded-full">
          <User className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white hover:bg-sidebar-accent hover:text-white rounded-full">
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
