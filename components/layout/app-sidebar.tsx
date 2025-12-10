"use client";

import { Home, MessageSquare, CreditCard, BarChart2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center py-4 bg-sidebar text-sidebar-foreground h-[35vh] w-16 gap-4 rounded-2xl shadow-lg border border-sidebar-border/20">
      
      <nav className="flex-1 flex flex-col gap-2 w-full px-2 justify-center">
        <Button variant="ghost" size="icon" className="w-full text-white hover:bg-sidebar-accent hover:text-white rounded-xl">
          <Home className="w-6 h-6" />
        </Button>
        <Button variant="ghost" size="icon" className="w-full text-white bg-sidebar-accent hover:bg-sidebar-accent hover:text-white rounded-xl">
          <MessageSquare className="w-6 h-6" />
        </Button>
        <Button variant="ghost" size="icon" className="w-full text-white hover:bg-sidebar-accent hover:text-white rounded-xl">
          <CreditCard className="w-6 h-6" />
        </Button>
        <Button variant="ghost" size="icon" className="w-full text-white hover:bg-sidebar-accent hover:text-white rounded-xl">
          <BarChart2 className="w-6 h-6" />
        </Button>
      </nav>
    </div>
  );
}
