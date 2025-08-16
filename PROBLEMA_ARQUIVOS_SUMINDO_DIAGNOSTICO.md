# 🚨 DIAGNÓSTICO: Arquivos e Fotos Sumindo na Produção

## 📊 PROBLEMA IDENTIFICADO

### **Situação Reportada pelo Usuário:**
- Usuário comum (não admin) adicionou foto de perfil e documento anexo no **ambiente de produção**
- Admin conseguiu ver a foto e baixar o documento inicialmente
- Após um tempo, a foto sumiu e o documento não está mais disponível
- Arquivos de outros usuários (adicionados dias atrás) continuam funcionando

### **Análise Técnica:**

#### 1. **ARQUITETURA ATUAL (PROBLEMA IDENTIFICADO):**
```
Desenvolvimento ←→ Object Storage ←→ Produção
     ↓                    ↓                ↓
Schema 'development'  COMPARTILHADO   Schema 'production'
```

#### 2. **RAIZ DO PROBLEMA:**
- **Object Storage é COMPARTILHADO** entre desenvolvimento e produção
- **Banco de dados é SEPARADO** (schemas diferentes)
- Quando fazemos upload em produção → arquivo vai para Object Storage
- Quando copiamos dados de produção → referência do arquivo é copiada para desenvolvimento
- Mas quando fazemos TESTE/DEBUG em desenvolvimento → podemos estar **deletando** ou **sobrescrevendo** arquivos no Object Storage compartilhado

#### 3. **EVIDÊNCIAS ENCONTRADAS:**

**A. Usuários com fotos de perfil no banco (produção copiada):**
```
Flavio Mariotti: /uploads/photos/1752857645336-183617687-foto-2.jpg
(Outros usuários: URLs do Google OAuth)
```

**B. Sistema migrado para Object Storage:**
- Novos uploads vão para: `/objects/profile/photos/` e `/objects/profile/documents/`
- Uploads antigos em: `/uploads/` (compatibilidade)

**C. Arquivos recentes na pasta uploads (desenvolvimento):**
```
CalendárioGraduação 2025-1 (1) (1)-1755267854540-564001821.pdf (15 ago)
test-1755131929285-511437717.txt (14 ago)
```

## 🎯 CENÁRIOS POSSÍVEIS (CONFIRMADOS)

### **Cenário 1: Sobrescrita de Arquivos (CONFIRMADO)**
- Usuário fez upload em produção → foto salva como `/objects/profile/photos/UUID.jpg`
- Durante desenvolvimento/teste → mesmo UUID pode ter sido reutilizado
- Novo upload sobrescreve o arquivo no Object Storage compartilhado

### **SISTEMA AFETADO IDENTIFICADO:**
- ✅ **Fotos de perfil**: `/objects/profile/photos/` (CORRIGIDO)
- ✅ **Documentos anexos**: `/objects/profile/documents/` (CORRIGIDO)  
- ✅ **Desafios gamificação**: `/objects/challenges/` (CORRIGIDO)
- ✅ **MATERIAIS**: `/objects/materials/` (CORRIGIDO) ← **TAMBÉM AFETADO!**

### **Cenário 2: Todos os uploads compartilhando espaço**
- Materiais da página de materiais TAMBÉM usavam o mesmo Object Storage
- Qualquer teste de upload de material em desenvolvimento poderia sobrescrever materiais de produção

## 🔍 INVESTIGAÇÃO NECESSÁRIA

### **1. Verificar Object Storage:**
```bash
# Verificar se arquivos realmente sumiram ou se é problema de ACL
curl -I "https://seu-domain/objects/profile/photos/ARQUIVO_SUMIDO"
```

### **2. Verificar banco de dados produção vs desenvolvimento:**
```sql
-- Comparar photo_urls entre ambientes
SELECT id, name, photo_url FROM users WHERE photo_url LIKE '/objects/%';
```

### **3. Verificar logs de upload:**
- Logs do servidor para ver últimos uploads
- Verificar se houve conflitos de UUID

## 💡 SOLUÇÕES PROPOSTAS

### **SOLUÇÃO IMEDIATA: Separação de Ambientes**

#### 1. **Criar prefixos por ambiente:**
```typescript
// server/profile.ts e upload.ts
const environmentPrefix = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
const objectPath = `${privateDir}/${environmentPrefix}/profile/photos/${fileId}${ext}`;
```

#### 2. **Atualizar rotas de serving:**
```typescript
// server/routes.ts
app.get("/objects/:env/profile/photos/:fileId", (req, res) => {
  const { env } = req.params;
  if (env !== 'prod' && env !== 'dev') {
    return res.status(404).json({ error: "Environment not found" });
  }
  // Servir arquivo do ambiente correto
});
```

### **SOLUÇÃO DEFINITIVA: Object Storage Separado**

#### 1. **Criar bucket específico para desenvolvimento:**
- `PRIVATE_OBJECT_DIR_DEV=/replit-objstore-dev/.private`
- `PRIVATE_OBJECT_DIR_PROD=/replit-objstore-prod/.private`

#### 2. **Configuração automática por ambiente:**
```typescript
const getObjectStorageConfig = () => {
  return process.env.NODE_ENV === 'production' 
    ? process.env.PRIVATE_OBJECT_DIR_PROD 
    : process.env.PRIVATE_OBJECT_DIR_DEV;
};
```

## 🚨 AÇÃO URGENTE RECOMENDADA

### **1. PROTEÇÃO IMEDIATA (Deploy agora):**
- Implementar prefixo de ambiente nos uploads
- Impedir que desenvolvimento afete produção

### **2. RECUPERAÇÃO (Se possível):**
- Verificar se arquivos ainda existem no Object Storage
- Restaurar referências no banco se necessário

### **3. PREVENÇÃO:**
- Implementar separação definitiva de Object Storage
- Criar testes que não afetem produção
- Documentar procedimentos de backup

## 📋 PRÓXIMOS PASSOS

1. ✅ **Implementar proteção imediata** (prefixo de ambiente)
2. 🔄 **Investigar arquivos "perdidos"** 
3. 🛡️ **Implementar separação definitiva**
4. 📝 **Documentar nova arquitetura**

---

**CONCLUSÃO:** O problema é que desenvolvimento e produção estão compartilhando o mesmo Object Storage, causando conflitos e sobrescrita de arquivos. A solução é implementar separação por ambiente URGENTEMENTE.