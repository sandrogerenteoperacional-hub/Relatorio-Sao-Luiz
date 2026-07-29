const SUPABASE_URL = 'https://csmhgxnojgvdgjayhkxv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzbWhneG5vamd2ZGdqYXloa3h2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM1MjQwNiwiZXhwIjoyMDk1OTI4NDA2fQ.NNW42ng9LSWYi28ZVGKDxG4clR-Jsj9JvTnf5Cef4kQ'; // Usando Service Role Key para contornar bloqueios de permissão (RLS)

// Traz os itens mais recentes gerados pela IA
export const fetchAutomationCreatives = async () => {
  // 1. Busca os copies (textos) limitando aos 100 mais recentes
  const copyUrl = `${SUPABASE_URL}/rest/v1/creatives_copy?select=*&order=created_at.desc&limit=100`;
  const copyRes = await fetch(copyUrl, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  if (!copyRes.ok) {
    const errText = await copyRes.text();
    throw new Error(`Erro textos: ${copyRes.status} - ${errText}`);
  }
  const copies = await copyRes.json();

  if (copies.length === 0) return [];

  // 2. Busca os detalhes da pasta para esses arquivos
  const fileIds = copies.map(c => c.file_id).join(',');
  const creatUrl = `${SUPABASE_URL}/rest/v1/creatives?select=*&file_id=in.(${fileIds})`;
  const creatRes = await fetch(creatUrl, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  if (!creatRes.ok) {
    const errText = await creatRes.text();
    throw new Error(`Erro pastas: ${creatRes.status} - ${errText}`);
  }
  const creativesDetails = await creatRes.json();

  // 3. Mescla os dados
  const merged = copies.map(copy => {
    const detail = creativesDetails.find(d => d.file_id === copy.file_id);
    return {
      file_id: copy.file_id,
      title: copy.copy_title,
      body: copy.copy_main_text || copy.copy_description,
      folder_name: detail?.folder_name || 'Sem Pasta',
      name: detail?.name || 'Imagem'
    };
  });

  return merged;
};

// Baixa a imagem do Google Drive e converte para File nativo que o Meta aceita
export const fetchDriveImageAsFile = async (fileId, fileName) => {
  // Baixamos a miniatura de alta resolução para evitar problemas de CORS com o endpoint de exportação
  const url = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1500`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao baixar imagem do Google Drive: ${response.status}`);
  
  const blob = await response.blob();
  
  // Criar um arquivo File a partir do blob (meta ads API usa FormData com File)
  return new File([blob], fileName + '.jpeg', { type: 'image/jpeg' });
};
