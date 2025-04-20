import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Definição global para o TinyMCE
declare global {
  interface Window {
    tinymce: any;
  }
}

interface TinyEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const TinyEditor: React.FC<TinyEditorProps> = ({ value, onChange, className }) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const editorId = useRef(`editor-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    // Função para carregar o TinyMCE via CDN
    const loadScript = () => {
      if (window.tinymce) {
        initEditor();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.4.2/tinymce.min.js';
      script.async = true;
      script.onload = initEditor;
      document.head.appendChild(script);
    };

    // Inicializa o editor
    const initEditor = () => {
      if (!editorRef.current) return;
      
      if (window.tinymce.get(editorId.current)) {
        window.tinymce.get(editorId.current).remove();
      }

      window.tinymce.init({
        selector: `#${editorId.current}`,
        height: 500,
        menubar: true,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 
          'charmap', 'preview', 'anchor', 'searchreplace', 
          'visualblocks', 'code', 'fullscreen',
          'media', 'table', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | formatselect | bold italic underline | ' +
          'alignleft aligncenter alignright alignjustify | ' +
          'bullist numlist outdent indent | removeformat | ' +
          'image media link table | help',
        content_css: [
          'https://fonts.googleapis.com/css?family=Lato:300,300i,400,400i',
          'https://www.tiny.cloud/css/codepen.min.css'
        ],
        content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; }',
        setup: (editor) => {
          editor.on('init', () => {
            editor.setContent(value || '');
          });
          
          editor.on('change input blur', () => {
            onChange(editor.getContent());
          });
        },
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
      });
    };

    loadScript();

    // Cleanup
    return () => {
      if (window.tinymce && window.tinymce.get(editorId.current)) {
        window.tinymce.get(editorId.current).remove();
      }
    };
  }, []);

  // Atualiza o conteúdo quando o valor muda externamente
  useEffect(() => {
    if (window.tinymce && window.tinymce.get(editorId.current)) {
      const currentContent = window.tinymce.get(editorId.current).getContent();
      if (value !== currentContent) {
        window.tinymce.get(editorId.current).setContent(value || '');
      }
    }
  }, [value]);

  return (
    <div className={cn("border rounded-md", className)}>
      <textarea
        id={editorId.current}
        ref={editorRef}
        defaultValue={value}
        style={{ visibility: 'hidden' }}
      />
    </div>
  );
};

export default TinyEditor;