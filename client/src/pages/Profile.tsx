import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { updateProfileSchema } from "@shared/schema";
import { z } from "zod";
import { Loader2, Upload, X, Camera, Phone, MapPin, Mail, User, Users } from "lucide-react";
import { Header } from "@/components/Header";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Estendendo o esquema para a UI
const profileFormSchema = updateProfileSchema.extend({
  phoneNumbers: z.array(z.string()).optional().default([""]),
});

// Tipo baseado no esquema estendido
type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<{name: string, description: string, file: File}[]>([]);
  const [documentDescriptions, setDocumentDescriptions] = useState<{[key: string]: string}>({});
  const [uploadingDocuments, setUploadingDocuments] = useState(false);

  // Buscar dados do perfil
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/profile'],
    enabled: !!user
  });

  // Formulário de perfil
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: profile?.name || user?.name || "",
      address: profile?.address || "",
      city: profile?.city || "",
      state: profile?.state || "",
      zipCode: profile?.zipCode || "",
      phoneNumbers: profile?.phoneNumbers?.length ? profile.phoneNumbers : [""],
      secondaryEmail: profile?.secondaryEmail || "",
      emergencyContact: profile?.emergencyContact || {
        name: "",
        phone: "",
        relationship: ""
      },
    },
  });

  // Mutação para atualizar perfil
  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return await apiRequest("PUT", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Adicionar campo de telefone
  const addPhoneField = () => {
    const phoneNumbers = form.getValues("phoneNumbers") || [];
    form.setValue("phoneNumbers", [...phoneNumbers, ""]);
  };

  // Remover campo de telefone
  const removePhoneField = (index: number) => {
    const phoneNumbers = form.getValues("phoneNumbers") || [];
    if (phoneNumbers.length <= 1) return;
    phoneNumbers.splice(index, 1);
    form.setValue("phoneNumbers", [...phoneNumbers]);
  };

  // Upload de foto
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
      uploadPhoto(file);
    }
  };

  // Função para fazer upload da foto
  const uploadPhoto = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const response = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Falha ao fazer upload da foto");
      }

      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      
      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao fazer upload da foto:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a foto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Adicionar documento
  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newDocuments = Array.from(files).map(file => ({
        name: file.name,
        description: "",
        file
      }));
      setDocuments([...documents, ...newDocuments]);
    }
  };

  // Atualizar descrição do documento
  const handleDocumentDescription = (fileName: string, description: string) => {
    setDocumentDescriptions({
      ...documentDescriptions,
      [fileName]: description
    });
  };

  // Remover documento da lista de upload
  const removeDocument = (index: number) => {
    const newDocuments = [...documents];
    newDocuments.splice(index, 1);
    setDocuments(newDocuments);
  };

  // Upload de documentos
  const uploadDocuments = async () => {
    if (documents.length === 0) return;
    
    setUploadingDocuments(true);
    const formData = new FormData();
    
    documents.forEach((doc, index) => {
      formData.append("documents", doc.file);
      formData.append("descriptions", documentDescriptions[doc.name] || doc.description || "");
    });

    try {
      const response = await fetch("/api/profile/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Falha ao fazer upload dos documentos");
      }

      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      
      setDocuments([]);
      setDocumentDescriptions({});
      
      toast({
        title: "Documentos adicionados",
        description: `${result.documents.length} documento(s) adicionado(s) com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao fazer upload dos documentos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar os documentos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploadingDocuments(false);
    }
  };

  // Excluir documento
  const deleteDocument = async (index: number) => {
    try {
      const response = await fetch(`/api/profile/documents/${index}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Falha ao excluir o documento");
      }

      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      
      toast({
        title: "Documento excluído",
        description: "O documento foi excluído com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o documento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Submit do formulário
  const onSubmit = (data: ProfileFormValues) => {
    // Remover telefones vazios
    const phoneNumbers = data.phoneNumbers?.filter(phone => phone.trim() !== "") || [];
    
    // Verificar se o contato de emergência está completo ou vazio
    const emergencyContact = data.emergencyContact?.name && data.emergencyContact.phone
      ? data.emergencyContact
      : undefined;
    
    updateProfile.mutate({
      ...data,
      phoneNumbers,
      emergencyContact
    });
  };

  // Renderizar loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container max-w-6xl py-8 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-conecta-green" />
        </div>
      </div>
    );
  }

  // Iniciais para avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Função para formatar o tipo de documento
  const formatDocumentType = (type: string) => {
    if (type.includes("pdf")) return "PDF";
    if (type.includes("image")) return "Imagem";
    if (type.includes("word")) return "Word";
    return type.split("/")[1]?.toUpperCase() || "Documento";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container max-w-6xl py-8">
        <h1 className="text-3xl font-bold mb-6">Meu Perfil</h1>

        <Tabs defaultValue="informacoes">
          <TabsList className="mb-6">
            <TabsTrigger value="informacoes">Informações Pessoais</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="informacoes">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Foto de perfil */}
              <Card>
                <CardHeader>
                  <CardTitle>Foto de Perfil</CardTitle>
                  <CardDescription>
                    Sua foto será exibida em seu perfil e comentários
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                  <div className="relative mb-4">
                    <Avatar className="w-32 h-32 border-2 border-conecta-green">
                      <AvatarImage 
                        src={photoPreview || profile?.photoUrl || undefined} 
                        alt={profile?.name || user?.name || "Avatar"} 
                      />
                      <AvatarFallback className="text-xl">
                        {getInitials(profile?.name || user?.name || "")}
                      </AvatarFallback>
                    </Avatar>
                    <label 
                      htmlFor="photo-upload" 
                      className="absolute bottom-0 right-0 bg-conecta-green text-white p-2 rounded-full cursor-pointer shadow-md hover:bg-conecta-green/80 transition-colors"
                    >
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                    </label>
                    <input 
                      id="photo-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoChange}
                      disabled={uploading}
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">{profile?.name || user?.name}</h3>
                    <p className="text-gray-500 text-sm">{profile?.email || user?.email}</p>
                    <Badge variant="outline" className="mt-2">{profile?.role || user?.role}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Formulário de informações */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>
                    Atualize suas informações pessoais e de contato
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome completo</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Digite seu nome completo" 
                                {...field} 
                                startContent={<User className="w-4 h-4 text-gray-500" />}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Endereço</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Digite seu endereço" 
                                  {...field} 
                                  startContent={<MapPin className="w-4 h-4 text-gray-500" />}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cidade</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite sua cidade" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite seu estado" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CEP</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite seu CEP" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <FormLabel>Telefones</FormLabel>
                        {form.watch("phoneNumbers")?.map((phone, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <FormField
                              control={form.control}
                              name={`phoneNumbers.${index}`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input 
                                      placeholder="Digite seu telefone" 
                                      {...field} 
                                      startContent={<Phone className="w-4 h-4 text-gray-500" />}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={() => removePhoneField(index)}
                              disabled={form.watch("phoneNumbers")?.length <= 1}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-1"
                          onClick={addPhoneField}
                        >
                          Adicionar telefone
                        </Button>
                      </div>

                      <FormField
                        control={form.control}
                        name="secondaryEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email secundário</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Digite um email secundário" 
                                {...field} 
                                startContent={<Mail className="w-4 h-4 text-gray-500" />}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator className="my-4" />

                      <div>
                        <h3 className="text-md font-semibold mb-2">Contato de Emergência</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="emergencyContact.name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Nome do contato" 
                                    {...field} 
                                    startContent={<User className="w-4 h-4 text-gray-500" />}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="emergencyContact.phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Telefone do contato" 
                                    {...field} 
                                    startContent={<Phone className="w-4 h-4 text-gray-500" />}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="emergencyContact.relationship"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Relacionamento</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ex: Cônjuge, Pai, Mãe, Irmão(ã)" 
                                  {...field} 
                                  startContent={<Users className="w-4 h-4 text-gray-500" />}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="mt-4 w-full"
                        disabled={updateProfile.isPending}
                      >
                        {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documentos">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Documentos e Titulações</CardTitle>
                  <CardDescription>
                    Adicione documentos e comprovantes de titulação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-2">Adicionar Documentos</h3>
                    <div className="space-y-4">
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <label htmlFor="document-upload" className="cursor-pointer block">
                          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">Clique para selecionar arquivos ou arraste-os para esta área</p>
                          <p className="text-gray-400 text-sm">PDF, Word ou imagens (max. 5MB)</p>
                        </label>
                        <input 
                          id="document-upload" 
                          type="file" 
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" 
                          multiple 
                          className="hidden" 
                          onChange={handleDocumentChange}
                          disabled={uploadingDocuments}
                        />
                      </div>

                      {documents.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <p className="font-medium">Documentos Selecionados:</p>
                          {documents.map((doc, index) => (
                            <div key={index} className="flex flex-col gap-2 p-3 border rounded-md">
                              <div className="flex justify-between items-center">
                                <p className="text-sm font-medium">{doc.name}</p>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => removeDocument(index)}
                                  disabled={uploadingDocuments}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Descrição do documento"
                                  value={documentDescriptions[doc.name] || doc.description}
                                  onChange={(e) => handleDocumentDescription(doc.name, e.target.value)}
                                  className="flex-1"
                                  disabled={uploadingDocuments}
                                />
                              </div>
                            </div>
                          ))}
                          <Button 
                            onClick={uploadDocuments} 
                            className="mt-2"
                            disabled={uploadingDocuments}
                          >
                            {uploadingDocuments && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Documentos
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Documentos Enviados</h3>
                    {profile?.documents && profile.documents.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.documents.map((doc, index) => (
                          <div key={index} className="border rounded-md p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <Badge variant="outline" className="mb-2">
                                  {formatDocumentType(doc.type)}
                                </Badge>
                                <h4 className="font-medium">{doc.name}</h4>
                                <p className="text-sm text-gray-500 mt-1">
                                  {doc.description || "Sem descrição"}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  asChild
                                >
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                    Ver
                                  </a>
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => deleteDocument(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-6">
                        Nenhum documento enviado ainda.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}