/**
 * Utilitário para lidar com URLs de imagens
 * Resolve problemas de caminhos inconsistentes de imagens
 */

/**
 * Formata o caminho de uma imagem para garantir que seja renderizada corretamente
 * 
 * Corrige URLs de imagens que podem estar em formatos diferentes no banco de dados
 * 
 * @param url URL da imagem conforme armazenada no banco de dados
 * @returns URL formatada corretamente para renderização no cliente
 */
export function formatImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Verifica se a URL começa com http:// ou https:// (URL externa)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Se a URL começa com /public/uploads/news/, remove o /public
  if (url.startsWith('/public/uploads/news/')) {
    return url.replace('/public/uploads/news/', '/uploads/news/');
  }
  
  // Se já estiver no formato correto, retorna a URL original
  return url;
}