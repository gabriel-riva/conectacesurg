import React, { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { cn } from '@/lib/utils';

// Importando o tipo do TinyMCE para a referência
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
        tinymceScriptSrc="/tinymce/tinymce.min.js" // Usando a versão local do TinyMCE
        onInit={(evt, editor) => editorRef.current = editor}
        initialValue={value || '<p></p>'}
        onEditorChange={(newValue, editor) => onChange(newValue)}
        init={{
          height: 500,
          menubar: true,
          // Adicionando a chave de licença GPL para remover a mensagem de avaliação
          license_key: 'gpl',
          // Resolvendo problemas de cursor com inicialização do editor
          init_instance_callback: (editor) => {
            editor.on('keydown', function(e) {
              editor.selection.getNode();
            });
          },
          // Plugins expandidos para mais opções
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 
            'searchreplace', 'code', 'fullscreen', 'preview',
            'media', 'table', 'wordcount', 'charmap', 'emoticons',
            'insertdatetime', 'visualblocks', 'anchor', 'help', 'hr',
            'textcolor', 'textpattern', 'nonbreaking', 'pagebreak'
          ],
          // Barra de ferramentas com mais opções
          toolbar: 'undo redo | ' +
            'styleselect formatselect fontselect fontsizeselect | ' +
            'bold italic underline strikethrough | forecolor backcolor | ' +
            'alignleft aligncenter alignright alignjustify | ' + 
            'bullist numlist outdent indent | ' +
            'removeformat | image media link table charmap emoticons | fullscreen help',
          // Opções estendidas para formatação de fonte
          fontsize_formats: '8pt 10pt 12pt 14pt 16pt 18pt 20pt 24pt 36pt 48pt',
          font_formats: 'Andale Mono=andale mono,times;' +
            'Arial=arial,helvetica,sans-serif;' +
            'Arial Black=arial black,avant garde;' +
            'Book Antiqua=book antiqua,palatino;' +
            'Comic Sans MS=comic sans ms,sans-serif;' +
            'Courier New=courier new,courier;' +
            'Georgia=georgia,palatino;' +
            'Helvetica=helvetica;' +
            'Impact=impact,chicago;' +
            'Tahoma=tahoma,arial,helvetica,sans-serif;' +
            'Terminal=terminal,monaco;' +
            'Times New Roman=times new roman,times;' +
            'Trebuchet MS=trebuchet ms,geneva;' +
            'Verdana=verdana,geneva;',
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