import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AIMessageProps {
  content: string;
  isFromUser: boolean;
  timestamp: Date | null;
  userName?: string;
  agentName?: string;
  agentImage?: string | null;
  userImage?: string | null;
  attachments?: Array<{name: string, url: string, type: string}> | null;
}

export function AIMessage({
  content,
  isFromUser,
  timestamp,
  userName,
  agentName,
  agentImage,
  userImage,
  attachments = []
}: AIMessageProps) {
  // Use um valor padrão de array vazio se attachments for null
  const safeAttachments = attachments || [];
  const hasAttachments = safeAttachments.length > 0;
  
  return (
    <div className={cn(
      "flex gap-3 p-4",
      isFromUser ? "flex-row" : "flex-row",
      isFromUser ? "bg-background" : "bg-muted/40"
    )}>
      <Avatar className="h-8 w-8">
        <AvatarImage 
          src={isFromUser ? (userImage || undefined) : (agentImage || undefined)} 
          alt={isFromUser ? (userName || "Você") : (agentName || "IA")} 
        />
        <AvatarFallback>
          {isFromUser ? (userName?.[0] || "U") : (agentName?.[0] || "A")}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isFromUser ? (userName || "Você") : (agentName || "Assistente IA")}
          </span>
          <span className="text-xs text-muted-foreground">
            {timestamp ? new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
          </span>
        </div>
        
        <div className="prose prose-sm max-w-none">
          {content.split('\n').map((paragraph, i) => (
            <p key={i} className={cn(
              "mb-1 last:mb-0",
              isFromUser ? "text-foreground" : "text-foreground"
            )}>
              {paragraph}
            </p>
          ))}
        </div>
        
        {hasAttachments && (
          <div className="flex flex-wrap gap-2 mt-2">
            {safeAttachments.map((attachment, index) => (
              <AttachmentPreview key={index} attachment={attachment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AttachmentPreview({ attachment }: { attachment: {name: string, url: string, type: string} }) {
  const isImage = attachment.type.startsWith('image/');
  
  if (isImage) {
    return (
      <a 
        href={attachment.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block max-w-xs overflow-hidden rounded border border-border"
      >
        <img 
          src={attachment.url} 
          alt={attachment.name} 
          className="max-h-40 w-auto object-contain"
        />
      </a>
    );
  }
  
  return (
    <a 
      href={attachment.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded border border-border px-3 py-2 hover:bg-muted transition-colors"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 text-muted-foreground" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
        />
      </svg>
      <span className="text-sm truncate">{attachment.name}</span>
    </a>
  );
}