"use client";

import React, { useState, useEffect } from 'react';
// import mammoth from 'mammoth'; // Keep for future implementation
import { RefreshCw, FileText, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getLatestDocument } from '@/lib/api';

export function DocumentViewer() {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDocument = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const htmlContent = await getLatestDocument();
      setContent(htmlContent);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error("Failed to load document:", err);
      setError("Failed to load document. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border flex justify-between items-center bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Document Viewer</h2>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDocument} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-hidden bg-muted/30 p-4 sm:p-8">
        <Card className="h-full w-full max-w-4xl mx-auto bg-white shadow-sm overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 p-8 sm:p-12">
            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2 pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            ) : (
              <div 
                className="prose prose-sm sm:prose-base max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
