# Portal Conecta CESURG

Este é o projeto do Portal Conecta CESURG, uma plataforma web para membros da instituição CESURG com autenticação via Google.

## Características
- Autenticação via Google OAuth (somente para emails @cesurg.com)
- Painel administrativo para o superadmin (conecta@cesurg.com)
- Interface moderna e responsiva
- Armazenamento de dados em PostgreSQL

## Requisitos para Implantação

### Variáveis de Ambiente Necessárias
Para implantar corretamente este aplicativo, você precisa configurar as seguintes variáveis de ambiente como **secrets** na sua configuração de implantação:

1. **DATABASE_URL**: URL de conexão completa com o banco de dados PostgreSQL
   - Este é um requisito obrigatório para o aplicativo funcionar
   - Exemplo de formato: `postgresql://usuario:senha@host:porta/nome_do_banco`

2. **GOOGLE_CLIENT_ID**: ID do cliente OAuth do Google
   - Já configurado no ambiente

3. **GOOGLE_CLIENT_SECRET**: Chave secreta do cliente OAuth do Google
   - Já configurado no ambiente

### Como Adicionar Segredos na Implantação da Replit

1. Na página de implantação, clique na guia **Secrets**
2. Clique em **Add a new secret**
3. Digite `DATABASE_URL` como nome
4. Cole a string de conexão do seu banco de dados PostgreSQL
5. Clique em **Add Secret**
6. **Reimplante** o aplicativo após adicionar todos os segredos

### URLs Importantes para Configuração OAuth do Google

- **URL de JavaScript Autorizada**: `https://conectacesurg.replit.app`
- **URL de Redirecionamento**: `https://conectacesurg.replit.app/api/auth/google/callback`

## Desenvolvimento Local

Para executar o projeto localmente:

```bash
npm run dev
```

## Migrações de Banco de Dados

Para aplicar alterações no esquema do banco de dados:

```bash
npm run db:push
```