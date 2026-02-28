import { pool } from "./db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export async function seedProductionIfEmpty(): Promise<void> {
  try {
    const result = await pool.query("SELECT COUNT(*) as count FROM users");
    const userCount = parseInt(result.rows[0].count);
    
    if (userCount > 1) {
      console.log(`📊 Banco já populado (${userCount} usuários). Seed não necessário.`);
      return;
    }
    
    console.log(`⚠️ Banco quase vazio (${userCount} usuários). Iniciando seed de produção...`);
    
    const possiblePaths = [
      path.join(process.cwd(), "server", "seed-data", "production-seed.sql"),
      path.join(process.cwd(), "seed-data", "production-seed.sql"),
    ];
    
    let sqlContent: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        sqlContent = fs.readFileSync(p, "utf-8");
        console.log(`📄 Arquivo de seed encontrado: ${p}`);
        break;
      }
    }
    
    if (!sqlContent) {
      console.log("❌ Arquivo de seed não encontrado em nenhum caminho. Pulando.");
      console.log("   Caminhos tentados:", possiblePaths.join(", "));
      return;
    }
    
    const lines = sqlContent.split("\n");
    const sqlStatements: string[] = [];
    let currentStatement = "";
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed === "" ||
        trimmed.startsWith("--") ||
        trimmed.startsWith("SET ") ||
        trimmed.startsWith("SELECT pg_catalog") ||
        trimmed.startsWith("\\") ||
        trimmed.startsWith("ALTER TABLE") ||
        trimmed.startsWith("SESSION AUTHORIZATION")
      ) {
        continue;
      }
      
      currentStatement += line + "\n";
      
      if (trimmed.endsWith(";")) {
        sqlStatements.push(currentStatement.trim());
        currentStatement = "";
      }
    }
    
    console.log(`📦 ${sqlStatements.length} comandos SQL para executar...`);
    
    let success = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const stmt of sqlStatements) {
      try {
        await pool.query(stmt);
        success++;
      } catch (e: any) {
        if (e.message?.includes("duplicate key") || e.message?.includes("already exists")) {
          skipped++;
        } else if (e.message?.includes("violates foreign key")) {
          skipped++;
        } else {
          errors++;
          if (errors <= 5) {
            console.log(`⚠️ Erro: ${e.message?.substring(0, 100)}`);
          }
        }
      }
    }
    
    const finalCount = await pool.query("SELECT COUNT(*) as count FROM users");
    console.log(`✅ Seed concluído: ${success} executados, ${skipped} pulados, ${errors} erros`);
    console.log(`📊 Total de usuários após seed: ${finalCount.rows[0].count}`);
    
    const seqResult = await pool.query(`
      DO $$
      DECLARE
        r RECORD;
        max_val INTEGER;
      BEGIN
        FOR r IN (
          SELECT 
            t.table_name, 
            c.column_name,
            pg_get_serial_sequence('public.' || t.table_name, c.column_name) as seq_name
          FROM information_schema.tables t
          JOIN information_schema.columns c 
            ON t.table_name = c.table_name AND t.table_schema = c.table_schema
          WHERE t.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
          AND c.column_default LIKE 'nextval%'
        ) LOOP
          EXECUTE 'SELECT COALESCE(MAX(' || quote_ident(r.column_name) || '), 0) FROM public.' || quote_ident(r.table_name) INTO max_val;
          IF max_val > 0 THEN
            EXECUTE 'SELECT setval(' || quote_literal(r.seq_name) || ', ' || max_val || ')';
          END IF;
        END LOOP;
      END $$;
    `);
    console.log("✅ Sequências corrigidas.");
    
  } catch (e: any) {
    console.error("❌ Erro no seed de produção:", e.message);
  }
}
