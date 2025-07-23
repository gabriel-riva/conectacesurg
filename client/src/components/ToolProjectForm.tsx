import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { z } from "zod";

// Schema completo baseado nos formulários fornecidos
const formSchema = z.object({
  // Campos básicos
  type: z.enum(['aula_convidado', 'visita_tecnica', 'outro_evento']),
  
  // Campos para Aula com Convidado
  dataAula: z.string().optional(),
  localAula: z.string().optional(),
  nomeProfissionaisAula: z.string().optional(),
  quantidadeEncontros: z.number().optional(),
  transporteAula: z.enum(['sim', 'nao']).optional(),
  demandasMarketingAula: z.array(z.string()).optional(),
  turmaSomente: z.enum(['sim', 'nao']).optional(),
  turmasEnvolvidas: z.string().optional(),
  
  // Campos para Visita Técnica
  dataVisita: z.string().optional(),
  horarioSaida: z.string().optional(),
  horarioRetorno: z.string().optional(),
  cidadeVisita: z.string().optional(),
  nomeEmpresas: z.string().optional(),
  logisticaVisita: z.string().optional(),
  tipoVeiculo: z.enum(['van', 'micro', 'onibus']).optional(),
  demandasMarketingVisita: z.array(z.string()).optional(),
  custoAluno: z.string().optional(),
  
  // Campos para Outro Evento
  descricaoEvento: z.string().optional(),
  dataEvento: z.string().optional(),
  localEvento: z.string().optional(),
  nomeProfissionaisEvento: z.string().optional(),
  transporteEvento: z.enum(['sim', 'nao']).optional(),
  demandasMarketingEvento: z.array(z.string()).optional(),
  
  // Campo para observações gerais
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ToolProjectFormProps {
  onSuccess?: () => void;
  initialData?: any;
  isEditing?: boolean;
  projectId?: number;
}

const typeOptions = [
  { value: 'aula_convidado', label: 'Aula com convidado' },
  { value: 'visita_tecnica', label: 'Visita técnica' },
  { value: 'outro_evento', label: 'Outro evento' },
];

const marketingOptionsAula = [
  'Data show',
  'Microfone/sistema de som',
  'Card de divulgação',
  'Arte para tela de apresentação',
  'Televisão'
];

const marketingOptionsVisita = [
  'Cobertura Fotográfica/Acompanhamento',
  'Card de divulgação'
];

const marketingOptionsEvento = [
  'Data show',
  'Microfone/sistema de som',
  'Card de divulgação',
  'Arte para tela de apresentação',
  'Outro material gráfico',
  'Televisão'
];

const veiculoOptions = [
  { value: 'van', label: 'Van' },
  { value: 'micro', label: 'Micro' },
  { value: 'onibus', label: 'Ônibus' },
];

export function ToolProjectForm({ onSuccess, initialData, isEditing = false, projectId }: ToolProjectFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "aula_convidado",
      dataAula: "",
      localAula: "",
      nomeProfissionaisAula: "",
      quantidadeEncontros: 1,
      transporteAula: "nao",
      demandasMarketingAula: [],
      turmaSomente: "nao",
      turmasEnvolvidas: "",
      dataVisita: "",
      horarioSaida: "",
      horarioRetorno: "",
      cidadeVisita: "",
      nomeEmpresas: "",
      logisticaVisita: "",
      tipoVeiculo: "van",
      demandasMarketingVisita: [],
      custoAluno: "",
      descricaoEvento: "",
      dataEvento: "",
      localEvento: "",
      nomeProfissionaisEvento: "",
      transporteEvento: "nao",
      demandasMarketingEvento: [],
      observacoes: "",
    },
  });

  const watchedType = useWatch({
    control: form.control,
    name: "type"
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/tool-projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      form.reset();
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/tool-projects/${projectId}`, {
      method: "PUT", 
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      onSuccess?.();
    },
  });

  const onSubmit = (data: FormData) => {
    // Mapear os campos do formulário para o formato esperado pelo backend
    const backendData = {
      tipoAtividade: data.type,
      dataRealizacao: data.type === 'aula_convidado' ? data.dataAula : 
                     data.type === 'visita_tecnica' ? data.dataVisita : 
                     data.dataEvento,
      local: data.type === 'aula_convidado' ? data.localAula : 
             data.type === 'outro_evento' ? data.localEvento : '',
      nomeProfissionais: data.type === 'aula_convidado' ? data.nomeProfissionaisAula : 
                        data.type === 'visita_tecnica' ? data.nomeEmpresas :
                        data.nomeProfissionaisEvento,
      quantidadeEncontros: data.quantidadeEncontros,
      transporteNecessario: data.type === 'aula_convidado' ? data.transporteAula === 'sim' :
                           data.type === 'visita_tecnica' ? true :
                           data.transporteEvento === 'sim',
      demandasMarketing: data.type === 'aula_convidado' ? data.demandasMarketingAula :
                        data.type === 'visita_tecnica' ? data.demandasMarketingVisita :
                        data.demandasMarketingEvento,
      publicoExclusivo: data.turmaSomente === 'sim',
      turmasEnv: data.turmasEnvolvidas,
      horarioSaida: data.horarioSaida,
      horarioRetorno: data.horarioRetorno,
      cidade: data.cidadeVisita,
      empresasVisitadas: data.nomeEmpresas,
      logisticaVisita: data.logisticaVisita,
      tipoVeiculo: data.tipoVeiculo,
      custoAluno: data.custoAluno ? parseInt(data.custoAluno) : undefined,
      descricaoEvento: data.descricaoEvento,
      observacoes: data.observacoes || '',
      status: 'rascunho'
    };
    
    const mutation = isEditing ? updateMutation : createMutation;
    mutation.mutate(backendData as any);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Função para renderizar campos de marketing como checkboxes
  const renderMarketingOptions = (fieldName: keyof FormData, options: string[]) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={() => (
        <FormItem>
          <FormLabel>Demandas para o marketing:</FormLabel>
          <div className="grid grid-cols-2 gap-2">
            {options.map((option) => (
              <FormField
                key={option}
                control={form.control}
                name={fieldName}
                render={({ field }) => {
                  const value = field.value as string[] || [];
                  return (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={value.includes(option)}
                          onCheckedChange={(checked) => {
                            const newValue = checked
                              ? [...value, option]
                              : value.filter((v) => v !== option);
                            field.onChange(newValue);
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        {option}
                      </FormLabel>
                    </FormItem>
                  );
                }}
              />
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Seleção do tipo de atividade */}
        <Card>
          <CardHeader>
            <CardTitle>Qual é a atividade?</CardTitle>
            <CardDescription>
              Selecione o tipo de atividade que você deseja criar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="space-y-2"
                    >
                      {typeOptions.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={option.value} />
                          <FormLabel htmlFor={option.value} className="cursor-pointer">
                            {option.label}
                          </FormLabel>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Campos específicos para Aula com Convidado */}
        {watchedType === 'aula_convidado' && (
          <Card>
            <CardHeader>
              <CardTitle>Aula com convidado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="dataAula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quando será a aula com convidado? *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="localAula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qual será o local do evento (sala de aula, auditório ou outro espaço externo)? *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Sala 101, Auditório Principal, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nomeProfissionaisAula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do(s) profissional(s): *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome dos profissionais convidados" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantidadeEncontros"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantos encontros?</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder="1" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transporteAula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vai precisar de transporte?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-row space-x-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id="transporte-sim" />
                          <FormLabel htmlFor="transporte-sim">Sim</FormLabel>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id="transporte-nao" />
                          <FormLabel htmlFor="transporte-nao">Não</FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {renderMarketingOptions('demandasMarketingAula', marketingOptionsAula)}

              <FormField
                control={form.control}
                name="turmaSomente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>A aula com convidado será somente para a sua turma?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-row space-x-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id="turma-sim" />
                          <FormLabel htmlFor="turma-sim">Sim</FormLabel>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id="turma-nao" />
                          <FormLabel htmlFor="turma-nao">Não</FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('turmaSomente') === 'sim' && (
                <FormField
                  control={form.control}
                  name="turmasEnvolvidas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quais as turmas envolvidas?</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 1º Semestre Engenharia, 3º Semestre Administração" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Campos específicos para Visita Técnica */}
        {watchedType === 'visita_tecnica' && (
          <Card>
            <CardHeader>
              <CardTitle>Visita técnica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="dataVisita"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quando será a visita técnica? *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="horarioSaida"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qual é o horário de saída? *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="horarioRetorno"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qual é o horário de retorno? *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="cidadeVisita"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qual a cidade da visita? *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da cidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nomeEmpresas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da(s) empresa(s): *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome das empresas a serem visitadas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logisticaVisita"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descreva como será a logística da visita. *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva detalhadamente a logística da visita"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipoVeiculo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qual o veículo para o transporte? *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="space-y-2"
                      >
                        {veiculoOptions.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`veiculo-${option.value}`} />
                            <FormLabel htmlFor={`veiculo-${option.value}`}>{option.label}</FormLabel>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {renderMarketingOptions('demandasMarketingVisita', marketingOptionsVisita)}

              <FormField
                control={form.control}
                name="custoAluno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>A visita técnica terá custo para o aluno? Qual o valor?</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="R$ 0,00 (deixe vazio se gratuito)" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Campos específicos para Outro Evento */}
        {watchedType === 'outro_evento' && (
          <Card>
            <CardHeader>
              <CardTitle>Outro evento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="descricaoEvento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descreva o evento. *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva detalhadamente o evento"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataEvento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quando será o evento? *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="localEvento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qual será o local do evento (sala de aula, auditório ou outro espaço externo)? *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Sala 101, Auditório Principal, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nomeProfissionaisEvento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do(s) profissional(s)</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome dos profissionais envolvidos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transporteEvento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vai precisar de transporte?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-row space-x-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id="transporte-evento-sim" />
                          <FormLabel htmlFor="transporte-evento-sim">Sim</FormLabel>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id="transporte-evento-nao" />
                          <FormLabel htmlFor="transporte-evento-nao">Não</FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {renderMarketingOptions('demandasMarketingEvento', marketingOptionsEvento)}
            </CardContent>
          </Card>
        )}

        {/* Observações gerais */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações adicionais</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Adicione qualquer observação ou informação adicional relevante"
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={isPending} className="bg-conecta-blue hover:bg-conecta-blue/90">
            {isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar'} Atividade
          </Button>
        </div>
      </form>
    </Form>
  );
}