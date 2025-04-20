import React, { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { cn } from '@/lib/utils';

// Importando a interface de referência do editor
import { Editor as TinyMCEEditor } from 'tinymce';

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
        tinymceScriptSrc="/tinymce/tinymce.min.js" // Caminho para o script do TinyMCE
        onInit={(evt, editor) => editorRef.current = editor}
        initialValue={value || '<p></p>'}
        onEditorChange={(newValue, editor) => onChange(newValue)}
        init={{
          height: 500,
          menubar: true,
          language: 'pt_BR',
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
            'emoticons', 'template', 'paste', 'autoresize'
          ],
          toolbar: 'undo redo | ' +
            'blocks | bold italic forecolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | image media link table emoticons | help',
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