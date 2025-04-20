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
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        onInit={(evt, editor) => editorRef.current = editor}
        initialValue={value || '<p></p>'}
        onEditorChange={(newValue, editor) => onChange(newValue)}
        init={{
          height: 500,
          menubar: true,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 
            'searchreplace', 'code', 'fullscreen', 
            'media', 'table', 'wordcount'
          ],
          toolbar: 'undo redo | formatselect | ' +
            'bold italic underline | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | image media link table | help',
          content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; }',
          images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
            const file = new File([blobInfo.blob()], blobInfo.filename(), { 
              type: blobInfo.blob().type 
            });
            
            const formData = new FormData();
            formData.append('file', file);
            
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/upload/image');
            
            xhr.upload.onprogress = (e) => {
              progress(e.loaded / e.total * 100);
            };
            
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
            
            xhr.onerror = () => reject(`Erro de rede`);
            xhr.send(formData);
          }),
          branding: false,
          promotion: false,
        }}
      />
    </div>
  );
};

export default TinyEditor;