import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Settings, Save, RefreshCw } from "lucide-react";

interface FeatureSetting {
  id: number;
  featureName: string;
  isEnabled: boolean;
  showInHeader: boolean;
  disabledMessage: string;
  lastUpdatedBy?: {
    id: number;
    name: string;
    email: string;
  };
  updatedAt: string;
}

const featureLabels: Record<string, string> = {
  comunidades: "Comunidade",
  ideias: "Ideias",
  gamificacao: "Gamificação",
  trilhas: "Trilhas",
  materiais: "Materiais",
};

const featureDescriptions: Record<string, string> = {
  comunidades: "Sistema de grupos, posts e mensagens da comunidade",
  ideias: "Sistema de submissão e gerenciamento de ideias",
  gamificacao: "Sistema de pontuação, desafios e ranking",
  trilhas: "Sistema de trilhas de aprendizado e desenvolvimento",
  materiais: "Sistema de materiais educativos e recursos",
};

export function AdminFeatureSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [tempSettings, setTempSettings] = useState<{
    isEnabled: boolean;
    showInHeader: boolean;
    disabledMessage: string;
  }>({ isEnabled: false, showInHeader: true, disabledMessage: "" });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/feature-settings'],
    queryFn: () => apiRequest<FeatureSetting[]>('/api/feature-settings'),
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ featureName, isEnabled, showInHeader, disabledMessage }: {
      featureName: string;
      isEnabled: boolean;
      showInHeader: boolean;
      disabledMessage: string;
    }) => {
      const response = await fetch(`/api/feature-settings/${featureName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled, showInHeader, disabledMessage }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feature-settings'] });
      setEditingFeature(null);
      toast({
        title: "Configuração atualizada",
        description: "A configuração da funcionalidade foi atualizada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a configuração.",
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = (feature: FeatureSetting) => {
    setEditingFeature(feature.featureName);
    setTempSettings({
      isEnabled: feature.isEnabled,
      showInHeader: feature.showInHeader ?? true,
      disabledMessage: feature.disabledMessage || "Em breve, novidades!",
    });
  };

  const handleSave = (featureName: string) => {
    updateSettingMutation.mutate({
      featureName,
      isEnabled: tempSettings.isEnabled,
      showInHeader: tempSettings.showInHeader,
      disabledMessage: tempSettings.disabledMessage,
    });
  };

  const handleCancel = () => {
    setEditingFeature(null);
    setTempSettings({ isEnabled: false, showInHeader: true, disabledMessage: "" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Configurações de Funcionalidades</h2>
      </div>

      <div className="grid gap-4">
        {Object.keys(featureLabels).map((featureName) => {
          const setting = settings?.find(s => s.featureName === featureName);
          const isEditing = editingFeature === featureName;
          const isEnabled = setting?.isEnabled ?? true;
          const disabledMessage = setting?.disabledMessage || "Em breve, novidades!";

          return (
            <Card key={featureName} className="border-l-4 border-l-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">
                      {featureLabels[featureName]}
                    </CardTitle>
                    <Badge variant={isEnabled ? "default" : "secondary"}>
                      {isEnabled ? "Ativada" : "Desativada"}
                    </Badge>
                    <Badge variant={setting?.showInHeader ? "outline" : "destructive"}>
                      {setting?.showInHeader ? "Visível no Header" : "Oculta no Header"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEdit(setting || {
                          id: 0,
                          featureName,
                          isEnabled: true,
                          showInHeader: true,
                          disabledMessage: "Em breve, novidades!",
                          updatedAt: new Date().toISOString(),
                        })}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Configurar
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancel}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSave(featureName)}
                          disabled={updateSettingMutation.isPending}
                        >
                          {updateSettingMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-1" />
                          )}
                          Salvar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {featureDescriptions[featureName]}
                </p>

                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`switch-${featureName}`}
                        checked={tempSettings.isEnabled}
                        onCheckedChange={(checked) =>
                          setTempSettings(prev => ({ ...prev, isEnabled: checked }))
                        }
                      />
                      <Label htmlFor={`switch-${featureName}`}>
                        Funcionalidade ativada
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`header-switch-${featureName}`}
                        checked={tempSettings.showInHeader}
                        onCheckedChange={(checked) =>
                          setTempSettings(prev => ({ ...prev, showInHeader: checked }))
                        }
                      />
                      <Label htmlFor={`header-switch-${featureName}`}>
                        Mostrar no menu/header
                      </Label>
                    </div>

                    {!tempSettings.isEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor={`message-${featureName}`}>
                          Mensagem quando desativada
                        </Label>
                        <Textarea
                          id={`message-${featureName}`}
                          placeholder="Em breve, novidades!"
                          value={tempSettings.disabledMessage}
                          onChange={(e) =>
                            setTempSettings(prev => ({ ...prev, disabledMessage: e.target.value }))
                          }
                          className="min-h-[80px]"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={isEnabled}
                        disabled
                      />
                      <Label className="text-sm">
                        {isEnabled ? "Ativada" : "Desativada"}
                      </Label>
                    </div>

                    {!isEnabled && (
                      <div className="bg-muted/30 p-3 rounded-md">
                        <p className="text-sm text-muted-foreground">
                          <strong>Mensagem:</strong> {disabledMessage}
                        </p>
                      </div>
                    )}

                    {setting?.lastUpdatedBy && (
                      <div className="text-xs text-muted-foreground">
                        Última atualização por {setting.lastUpdatedBy.name} em{' '}
                        {format(new Date(setting.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}