# 📋 GUIA: Sincronização Desenvolvimento ↔ Produção

## 🎯 OBJETIVO
Copiar dados/arquivos da produção para desenvolvimento periodicamente, mantendo testes seguros e atualizados.

## 🏗️ ARQUITETURA ATUAL (PÓS-CORREÇÃO)

### **SEPARAÇÃO POR AMBIENTE IMPLEMENTADA:**

```
PRODUÇÃO (NODE_ENV=production):
/replit-objstore/.private/prod/
├── profile/
│   ├── photos/          ← Fotos de perfil reais
│   └── documents/       ← Documentos reais dos usuários
├── challenges/          ← Uploads de gamificação reais
└── materials/           ← Materiais reais da página

DESENVOLVIMENTO (NODE_ENV=development):
/replit-objstore/.private/dev/
├── profile/
│   ├── photos/          ← Cópias para teste
│   └── documents/       ← Cópias para teste
├── challenges/          ← Cópias para teste
└── materials/           ← Cópias para teste
```

### **BANCO DE DADOS:**
- **Produção**: Schema `public` ou conexão específica
- **Desenvolvimento**: Schema `development` ou conexão específica

## 🔄 PROCESSO DE SINCRONIZAÇÃO

### **1. ARQUIVOS DO OBJECT STORAGE**

#### **Comando para copiar arquivos (futuro script):**
```bash
#!/bin/bash
# sync-prod-to-dev.sh

echo "🔄 SINCRONIZANDO PRODUÇÃO → DESENVOLVIMENTO"

# Backup atual do desenvolvimento (segurança)
echo "📦 Criando backup do desenvolvimento atual..."
mv /replit-objstore/.private/dev /replit-objstore/.private/dev-backup-$(date +%Y%m%d-%H%M%S)

# Copiar estrutura da produção
echo "📂 Copiando arquivos da produção..."
cp -r /replit-objstore/.private/prod /replit-objstore/.private/dev

echo "✅ Sincronização de arquivos concluída!"
```

#### **Comandos manuais via Object Storage API:**
```javascript
// Script para executar no futuro
const syncProductionToDevelopment = async () => {
  const objectStorage = new ObjectStorageService();
  
  // Copiar fotos de perfil
  await copyObjectPath('/prod/profile/photos/', '/dev/profile/photos/');
  
  // Copiar documentos
  await copyObjectPath('/prod/profile/documents/', '/dev/profile/documents/');
  
  // Copiar desafios
  await copyObjectPath('/prod/challenges/', '/dev/challenges/');
  
  // Copiar materiais
  await copyObjectPath('/prod/materials/', '/dev/materials/');
};
```

### **2. BANCO DE DADOS**

#### **Comando SQL para sincronizar (cuidado!):**
```sql
-- BACKUP desenvolvimento atual
CREATE SCHEMA development_backup_20250116 AS 
SELECT * FROM development;

-- COPIAR dados da produção
TRUNCATE development.users CASCADE;
TRUNCATE development.user_profiles CASCADE;
TRUNCATE development.material_folders CASCADE;
TRUNCATE development.material_files CASCADE;
-- ... outras tabelas

INSERT INTO development.users SELECT * FROM public.users;
INSERT INTO development.user_profiles SELECT * FROM public.user_profiles;
INSERT INTO development.material_folders SELECT * FROM public.material_folders;
INSERT INTO development.material_files SELECT * FROM public.material_files;
-- ... outras tabelas
```

## ⚠️ PONTOS CRÍTICOS PARA LEMBRAR

### **1. CAMINHOS DOS ARQUIVOS NO BANCO**

**ATENÇÃO:** Após copiar dados, será necessário **atualizar os caminhos** no banco de desenvolvimento:

```sql
-- Atualizar caminhos de fotos de perfil
UPDATE development.user_profiles 
SET image_url = REPLACE(image_url, '/objects/prod/', '/objects/dev/')
WHERE image_url LIKE '/objects/prod/profile/photos/%';

-- Atualizar documentos do perfil
UPDATE development.user_profiles 
SET document_url = REPLACE(document_url, '/objects/prod/', '/objects/dev/')
WHERE document_url LIKE '/objects/prod/profile/documents/%';

-- Atualizar materiais
UPDATE development.material_files 
SET file_url = REPLACE(file_url, '/objects/prod/', '/objects/dev/')
WHERE file_url LIKE '/objects/prod/materials/%';

-- Atualizar desafios (se houver tabela específica)
UPDATE development.challenges 
SET file_url = REPLACE(file_url, '/objects/prod/', '/objects/dev/')
WHERE file_url LIKE '/objects/prod/challenges/%';
```

### **2. CONFIGURAÇÕES DE AMBIENTE**

**Verificar estas variáveis antes da sincronização:**

```bash
# Desenvolvimento deve ter:
NODE_ENV=development
DATABASE_URL=postgresql://...development_database...

# Produção deve ter:
NODE_ENV=production  
DATABASE_URL=postgresql://...production_database...
```

### **3. REDIRECCIONAMENTOS LEGACY**

**IMPORTANTE:** Após sincronização, os redirecionamentos legacy continuam funcionando:

```
Arquivos antigos (legacy): /objects/profile/photos/abc123.jpg
↓ (redirecionamento automático)
Produção: /objects/prod/profile/photos/abc123.jpg
Desenvolvimento: /objects/dev/profile/photos/abc123.jpg
```

## 🚨 CUIDADOS ESPECIAIS

### **1. BACKUP ANTES DE SINCRONIZAR**
```bash
# Sempre fazer backup do desenvolvimento atual
pg_dump development_schema > dev_backup_$(date +%Y%m%d).sql
cp -r /replit-objstore/.private/dev /backup/dev_$(date +%Y%m%d)
```

### **2. VERIFICAÇÃO PÓS-SINCRONIZAÇÃO**
```bash
# Testar se arquivos estão acessíveis
curl "http://localhost:5000/objects/dev/profile/photos/ALGUM_UUID"
curl "http://localhost:5000/objects/dev/materials/ALGUM_UUID"

# Verificar logs
tail -f logs/development.log | grep "UPLOAD\|DOWNLOAD"
```

### **3. LIMPEZA DE DADOS SENSÍVEIS (OPCIONAL)**
```sql
-- Remover dados sensíveis do desenvolvimento
UPDATE development.users SET password_hash = 'dev_password_hash';
UPDATE development.user_profiles SET document_url = NULL WHERE document_url IS NOT NULL;
```

## 🛠️ SCRIPT AUTOMATIZADO (FUTURO)

### **Criar script `sync-environments.js`:**
```javascript
// sync-environments.js
const syncEnvironments = async () => {
  console.log('🔄 Iniciando sincronização PROD → DEV');
  
  // 1. Backup desenvolvimento
  await createDevelopmentBackup();
  
  // 2. Copiar arquivos Object Storage
  await copyObjectStorageFiles();
  
  // 3. Copiar dados do banco
  await copyDatabaseData();
  
  // 4. Atualizar caminhos no banco
  await updateFilePathsInDatabase();
  
  // 5. Verificar integridade
  await verifySync();
  
  console.log('✅ Sincronização concluída!');
};
```

## 📝 CHECKLIST DE SINCRONIZAÇÃO

### **Antes de sincronizar:**
- [ ] Confirmar que estou no ambiente de desenvolvimento
- [ ] Fazer backup dos dados atuais do desenvolvimento
- [ ] Verificar espaço em disco suficiente
- [ ] Confirmar que aplicação está parada

### **Durante a sincronização:**
- [ ] Copiar arquivos `/prod/` → `/dev/` no Object Storage
- [ ] Copiar dados do banco de produção → desenvolvimento
- [ ] Atualizar caminhos de `/objects/prod/` → `/objects/dev/`
- [ ] Verificar que variável NODE_ENV=development

### **Após sincronização:**
- [ ] Testar upload de arquivo (deve ir para `/objects/dev/`)
- [ ] Testar download de arquivo existente
- [ ] Verificar logs de ambiente
- [ ] Confirmar que redirecionamentos legacy funcionam

## 🎯 RESUMO PARA O FUTURO

**O que você precisa lembrar:**

1. **Arquivos têm prefixo de ambiente**: `/objects/prod/` vs `/objects/dev/`
2. **Banco precisa de UPDATE**: Trocar caminhos após copiar dados
3. **Sempre backup antes**: Desenvolvimento pode ter dados de teste importantes
4. **Verificar NODE_ENV**: Determina qual ambiente usar para novos uploads
5. **Redirecionamentos legacy**: Continuam funcionando após sincronização

**Comando essencial pós-sincronização:**
```sql
-- Este UPDATE é OBRIGATÓRIO após copiar dados:
UPDATE development.* SET *_url = REPLACE(*_url, '/objects/prod/', '/objects/dev/') WHERE *_url LIKE '/objects/prod/%';
```

**Resultado:** Desenvolvimento terá cópia fiel da produção, mas totalmente isolado para testes seguros!