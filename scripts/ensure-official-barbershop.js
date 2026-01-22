import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Ler .env manualmente
let SUPABASE_URL, SUPABASE_SERVICE_KEY;

try {
  const envContent = readFileSync('.env', 'utf-8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      SUPABASE_URL = line.split('=')[1].replace(/^["']|["']$/g, '');
    }
  }
} catch (e) {
  console.warn('⚠️  Não foi possível ler .env, usando variáveis de ambiente');
}

// Usar variáveis de ambiente ou valores padrão
SUPABASE_URL = SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Erro: VITE_SUPABASE_URL não encontrado!');
  console.error('Configure no arquivo .env');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não configurada!');
  console.error('Configure como variável de ambiente:');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="sua-chave-aqui"');
  console.error('Ou adicione ao arquivo .env (não recomendado para produção)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function ensureOfficialBarbershop() {
  try {
    console.log('🔍 Verificando se a coluna is_official existe...');
    
    // Verificar se a coluna existe
    const { error: checkError } = await supabase
      .from('barbershops')
      .select('is_official')
      .limit(1);
    
    if (checkError && checkError.message.includes('column') && checkError.message.includes('does not exist')) {
      console.log('📝 Adicionando coluna is_official...');
      // Executar SQL para adicionar coluna
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false;'
      });
      
      if (alterError) {
        console.error('❌ Erro ao adicionar coluna:', alterError.message);
        console.log('⚠️  Execute a migração SQL manualmente no Supabase Dashboard');
        return;
      }
    }
    
    console.log('🔍 Verificando se existe barbearia oficial...');
    const { data: official, error: officialError } = await supabase
      .from('barbershops')
      .select('id, name, slug, is_official')
      .eq('is_official', true)
      .maybeSingle();
    
    if (officialError) throw officialError;
    
    if (official) {
      console.log('✅ Barbearia oficial encontrada:');
      console.log(`   Nome: ${official.name}`);
      console.log(`   Slug: ${official.slug}`);
      console.log(`   ID: ${official.id}`);
      return;
    }
    
    console.log('⚠️  Nenhuma barbearia oficial encontrada. Buscando Imperio Barber...');
    
    // Buscar Imperio Barber
    const { data: imperio, error: imperioError } = await supabase
      .from('barbershops')
      .select('id, name, slug')
      .or('name.ilike.%imperio%,name.ilike.%império%,slug.eq.imperio-barber')
      .limit(1)
      .maybeSingle();
    
    if (imperioError) throw imperioError;
    
    if (imperio) {
      console.log(`✅ Encontrada: ${imperio.name}`);
      console.log('📝 Marcando como oficial...');
      
      const { error: updateError } = await supabase
        .from('barbershops')
        .update({ is_official: true })
        .eq('id', imperio.id);
      
      if (updateError) throw updateError;
      
      console.log('✅ Barbearia marcada como oficial!');
      return;
    }
    
    // Se não encontrou, buscar a primeira barbearia
    console.log('⚠️  Imperio Barber não encontrada. Buscando primeira barbearia...');
    const { data: first, error: firstError } = await supabase
      .from('barbershops')
      .select('id, name, slug')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    
    if (firstError) throw firstError;
    
    if (first) {
      console.log(`✅ Encontrada: ${first.name}`);
      console.log('📝 Marcando como oficial...');
      
      const { error: updateError } = await supabase
        .from('barbershops')
        .update({ is_official: true })
        .eq('id', first.id);
      
      if (updateError) throw updateError;
      
      console.log('✅ Barbearia marcada como oficial!');
      return;
    }
    
    console.log('❌ Nenhuma barbearia encontrada no banco de dados.');
    console.log('💡 Crie uma barbearia primeiro ou execute o script create-admin.js');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.code) {
      console.error('Código:', error.code);
    }
  }
}

ensureOfficialBarbershop();

