import React, { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { cn } from '@/lib/utils';

// Importando o TinyMCE diretamente para ter acesso a seus tipos
import tinymce, { Editor as TinyMCEEditor } from 'tinymce';

interface TinyEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const TinyEditor: React.FC<TinyEditorProps> = ({ value, onChange, className }) => {
  // Referência para o editor
  const editorRef = useRef<TinyMCEEditor | null>(null);

  return (
    <div className={cn("border rounded-md", className)}>
      <Editor
        tinymceScriptSrc="https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js" // Usando CDN para evitar problemas de carregamento local
        onInit={(evt, editor) => editorRef.current = editor}
        initialValue={value || '<p></p>'}
        onEditorChange={(newValue, editor) => onChange(newValue)}
        init={{
          height: 500,
          menubar: true,
          // Sem definir idioma para evitar problemas com locais não disponíveis
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount',
            'emoticons', 'paste', 'autoresize', 'codesample'
          ],
          toolbar: 'undo redo | ' +
            'formatselect | bold italic forecolor backcolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | image media link table codesample emoticons | fullscreen',
          content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif; font-size: 14px; }',
          images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
            // Cria um arquivo a partir do blob
            const file = new File([blobInfo.blob()], blobInfo.filename(), { 
              type: blobInfo.blob().type 
            });
            
            // Cria um FormData para enviar o arquivo
            const formData = new FormData();
            formData.append('file', file);
            
            // URL para o endpoint de upload de imagens
            const uploadUrl = '/api/upload/image';
            
            // Cria uma requisição XHR para enviar o arquivo
            const xhr = new XMLHttpRequest();
            xhr.open('POST', uploadUrl);
            
            // Configura o callback de progresso
            xhr.upload.onprogress = (e) => {
              progress(e.loaded / e.total * 100);
            };
            
            // Configura o callback de sucesso
            xhr.onload = () => {
              if (xhr.status === 200) {
                try {
                  const json = JSON.parse(xhr.responseText);
                  resolve(json.location);
                } catch (e) {
                  reject(`Resposta inválida: ${xhr.responseText}`);
                }
              } else {
                reject(`Erro no upload: ${xhr.status}`);
              }
            };
            
            // Configura o callback de erro
            xhr.onerror = () => {
              reject(`Erro de rede`);
            };
            
            // Envia o arquivo
            xhr.send(formData);
          }),
          setup: (editor) => {
            // Configura eventos adicionais se necessário
            editor.on('change', () => {
              editor.save();
            });
          },
          branding: false, // Remove a marca do TinyMCE
          promotion: false, // Remove promoções
        }}
      />
    </div>
  );
};

export default TinyEditor;