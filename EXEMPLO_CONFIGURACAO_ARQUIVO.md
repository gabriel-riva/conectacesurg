# Como Configurar Upload de Arquivos em Desafios

## Problema Atual
O desafio foi criado sem requisitos de arquivo configurados. Por isso não aparecem campos de upload.

## Como Resolver

### 1. Acesse o Painel Administrativo
- Vá para `/admin/gamification`
- Procure o desafio "teste" na lista de desafios
- Clique no botão "Editar" (ícone de lápis)

### 2. Configure o Tipo de Avaliação
- Na seção "Configuração de Avaliação"
- Altere o "Tipo de Avaliação" de "Nenhuma" para "Upload de Arquivo"

### 3. Configure os Requisitos de Arquivo
Após selecionar "Upload de Arquivo", você verá:

- **Máximo Total de Arquivos**: Defina quantos arquivos no total podem ser enviados
- Clique em "Adicionar Requisito" para criar requisitos específicos

### 4. Para cada Requisito de Arquivo Configure:
- **Nome do Requisito**: Ex: "Relatório Final", "Apresentação", "Código Fonte"
- **Pontos**: Quantos pontos vale este arquivo específico
- **Descrição**: Explicação do que deve ser enviado
- **Tipos Permitidos**: pdf, doc, docx, jpg, png (separados por vírgula)
- **Tamanho Máximo**: Em MB, por arquivo

### 5. Exemplo de Configuração
```
Requisito 1:
- Nome: Relatório Técnico
- Pontos: 50
- Descrição: Documento com análise completa do projeto
- Tipos: pdf, doc, docx
- Tamanho: 10MB

Requisito 2:
- Nome: Imagens de Evidência
- Pontos: 30
- Descrição: Fotos ou prints que comprovem os resultados
- Tipos: jpg, png, jpeg
- Tamanho: 5MB

Requisito 3:
- Nome: Planilha de Dados
- Pontos: 20
- Descrição: Dados utilizados no projeto em formato Excel
- Tipos: xlsx, xls, csv
- Tamanho: 5MB
```

### 6. Salve as Alterações
Depois de configurar todos os requisitos, clique em "Salvar Desafio"

### 7. Teste o Upload
- Volte para a página do desafio
- Agora você verá uma seção para cada requisito configurado
- Cada requisito terá seu próprio campo de upload
- Os usuários poderão enviar múltiplos arquivos seguindo as regras

## Resultado Esperado
Após a configuração, a página do desafio mostrará:
- Uma seção para cada requisito de arquivo
- Campos de upload específicos para cada tipo
- Validação automática de tipos e tamanhos
- Lista dos arquivos selecionados antes do envio
- Contador total de arquivos

## Dica Important
Sempre configure pelo menos um requisito de arquivo, senão o sistema não mostrará a interface de upload.