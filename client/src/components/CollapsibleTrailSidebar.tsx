import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Clock, Eye, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrailContent {
  id: number;
  title: string;
  estimatedMinutes: number;
  viewCount: number;
}

interface CollapsibleTrailSidebarProps {
  contents: TrailContent[];
  selectedContent: TrailContent | null;
  onContentSelect: (content: TrailContent) => void;
  completedContents: number[];
  totalContents: number;
}

export function CollapsibleTrailSidebar({
  contents,
  selectedContent,
  onContentSelect,
  completedContents,
  totalContents
}: CollapsibleTrailSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const completionPercentage = totalContents > 0 
    ? Math.round((completedContents.length / totalContents) * 100)
    : 0;

  return (
    <div className={cn(
      "relative transition-all duration-300 ease-in-out",
      isCollapsed ? "w-12" : "w-80"
    )}>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full p-0 shadow-md"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {/* Sidebar Content */}
      <Card className={cn(
        "h-fit transition-all duration-300",
        isCollapsed && "overflow-hidden"
      )}>
        <CardHeader className={cn(
          "transition-all duration-300",
          isCollapsed ? "p-2" : "p-6"
        )}>
          {!isCollapsed && (
            <>
              <CardTitle className="text-lg">Conteúdos da Trilha</CardTitle>
              <CardDescription>
                {contents.length} conteúdos disponíveis
              </CardDescription>
              
              {/* Progress Badge */}
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {completionPercentage}% concluído
                </Badge>
              </div>
            </>
          )}
          
          {isCollapsed && (
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {contents.length}
                </span>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500" title={`${completionPercentage}% concluído`} />
            </div>
          )}
        </CardHeader>
        
        <CardContent className={cn(
          "space-y-2 transition-all duration-300",
          isCollapsed ? "p-1" : "p-6 pt-0"
        )}>
          {contents.length === 0 ? (
            !isCollapsed && (
              <p className="text-muted-foreground text-center py-4">
                Nenhum conteúdo disponível ainda.
              </p>
            )
          ) : (
            contents.map((content, index) => (
              <div key={content.id}>
                <Button
                  variant={selectedContent?.id === content.id ? "default" : "ghost"}
                  className={cn(
                    "justify-start text-left h-auto transition-all duration-200",
                    isCollapsed ? "w-8 h-8 p-0" : "w-full p-4"
                  )}
                  onClick={() => onContentSelect(content)}
                  title={isCollapsed ? content.title : undefined}
                >
                  {isCollapsed ? (
                    <div className="w-full h-full flex items-center justify-center relative">
                      <span className="text-xs font-medium">
                        {index + 1}
                      </span>
                      {completedContents.includes(content.id) && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 relative">
                        <span className="text-xs font-medium text-primary">
                          {index + 1}
                        </span>
                        {completedContents.includes(content.id) && (
                          <CheckCircle className="absolute -top-1 -right-1 w-3 h-3 text-green-500 fill-current" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-2">{content.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {content.estimatedMinutes > 0 && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {content.estimatedMinutes} min
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {content.viewCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Button>
                {!isCollapsed && index < contents.length - 1 && (
                  <Separator className="my-2" />
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}