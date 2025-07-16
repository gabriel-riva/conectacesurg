import React, { useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';


// Import dos módulos do Quill para funcionalidades avançadas
import ImageResize from 'quill-image-resize-module-react';
import { ImageDrop } from 'quill-image-drop-module';

// Registrar os módulos no Quill
Quill.register('modules/imageResize', ImageResize);
Quill.register('modules/imageDrop', ImageDrop);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Digite seu conteúdo...", 
  className = "" 
}: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null);



  // Configuração avançada do Quill com módulos de redimensionamento e drag-drop
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    },
    imageResize: {
      parchment: Quill.import('parchment'),
      modules: ['Resize', 'DisplaySize', 'Toolbar']
    },
    imageDrop: true
  };

  // Formatos suportados
  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'align', 'list', 'indent',
    'blockquote', 'code-block', 'link', 'image', 'video'
  ];



  // Função para upload de imagem
  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            const imageUrl = result.url;
            
            if (quillRef.current) {
              const quill = quillRef.current.getEditor();
              const range = quill.getSelection();
              if (range) {
                quill.insertEmbed(range.index, 'image', imageUrl);
              }
            }
          }
        } catch (error) {
          console.error('Erro ao fazer upload da imagem:', error);
        }
      }
    };
  };



  // Função para inserir tabela
  const insertTable = () => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection();
      
      if (range) {
        const tableHTML = `
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">Célula 1</td>
              <td style="border: 1px solid #ddd; padding: 8px;">Célula 2</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">Célula 3</td>
              <td style="border: 1px solid #ddd; padding: 8px;">Célula 4</td>
            </tr>
          </table>
        `;
        
        quill.clipboard.dangerouslyPasteHTML(range.index, tableHTML);
      }
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Estilos CSS inline para evitar conflitos */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .quill-editor-container .ql-editor {
            min-height: 300px;
            max-height: 500px;
            overflow-y: auto;
            font-size: 14px;
            line-height: 1.42;
            padding: 12px 15px;
          }
          
          .quill-editor-container .ql-toolbar {
            border-top: 1px solid #ccc;
            border-left: 1px solid #ccc;
            border-right: 1px solid #ccc;
            background: #f8f9fa;
            border-radius: 4px 4px 0 0;
          }
          
          .quill-editor-container .ql-container {
            border-bottom: 1px solid #ccc;
            border-left: 1px solid #ccc;
            border-right: 1px solid #ccc;
            background: white;
            border-radius: 0 0 4px 4px;
            position: relative;
          }
          
          .quill-editor-container .ql-editor img {
            max-width: 100%;
            height: auto;
          }
          
          .quill-editor-container .ql-editor table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
          }
          
          .quill-editor-container .ql-editor table td {
            border: 1px solid #ddd;
            padding: 8px;
          }
          
          .quill-editor-container .ql-editor iframe {
            max-width: 100%;
            width: 100%;
            height: 315px;
          }
          
          .quill-editor-container .ql-editor:focus {
            outline: none;
          }
          
          .quill-editor-container .ql-editor p {
            margin: 0 0 8px 0;
          }
          
          .quill-editor-container .ql-editor.ql-blank::before {
            color: #999;
            font-style: italic;
          }
          
          .quill-editor-container .ql-tooltip {
            z-index: 1000;
            position: absolute !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            top: 40px !important;
            background: white !important;
            border: 1px solid #ccc !important;
            border-radius: 4px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
            padding: 8px !important;
            min-width: 200px !important;
          }

          .quill-editor-container .ql-tooltip::before {
            content: "URL:" !important;
            font-size: 12px !important;
            color: #666 !important;
            margin-right: 8px !important;
          }

          .quill-editor-container .ql-tooltip[data-mode="link"]::before {
            content: "URL do link:" !important;
          }

          .quill-editor-container .ql-tooltip[data-mode="video"]::before {
            content: "URL do vídeo:" !important;
          }

          .quill-editor-container .ql-tooltip input {
            border: 1px solid #ddd !important;
            padding: 4px 8px !important;
            border-radius: 3px !important;
            width: 200px !important;
          }

          .quill-editor-container .ql-tooltip a {
            background: #007cdc !important;
            color: white !important;
            padding: 4px 8px !important;
            text-decoration: none !important;
            border-radius: 3px !important;
            margin-left: 8px !important;
          }

          .quill-editor-container .ql-tooltip a:hover {
            background: #0056b3 !important;
          }

          /* Estilos para redimensionamento de imagens */
          .quill-editor-container .ql-editor .ql-image-resize-box {
            position: absolute;
            box-sizing: border-box;
            border: 1px dashed #007cdc;
            background: rgba(0, 124, 220, 0.1);
          }

          .quill-editor-container .ql-editor .ql-image-resize-handle {
            position: absolute;
            width: 8px;
            height: 8px;
            background: #007cdc;
            border: 1px solid #ffffff;
            cursor: nw-resize;
          }

          .quill-editor-container .ql-editor .ql-image-resize-handle:hover {
            background: #0056b3;
          }

          .quill-editor-container .ql-editor .ql-image-resize-handle-nw {
            top: -4px;
            left: -4px;
            cursor: nw-resize;
          }

          .quill-editor-container .ql-editor .ql-image-resize-handle-ne {
            top: -4px;
            right: -4px;
            cursor: ne-resize;
          }

          .quill-editor-container .ql-editor .ql-image-resize-handle-sw {
            bottom: -4px;
            left: -4px;
            cursor: sw-resize;
          }

          .quill-editor-container .ql-editor .ql-image-resize-handle-se {
            bottom: -4px;
            right: -4px;
            cursor: se-resize;
          }

          /* Estilos para toolbar de redimensionamento */
          .quill-editor-container .ql-editor .ql-image-resize-toolbar {
            position: absolute;
            top: -30px;
            left: 0;
            background: #333;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
          }

          /* Melhorar a aparência das imagens */
          .quill-editor-container .ql-editor img {
            max-width: 100%;
            height: auto;
            cursor: pointer;
            border-radius: 4px;
          }

          .quill-editor-container .ql-editor img:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          /* Estilos para vídeos */
          .quill-editor-container .ql-editor iframe {
            max-width: 100%;
            width: 100%;
            height: 315px;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
            margin: 10px 0;
          }

          /* Drag and drop styling */
          .quill-editor-container .ql-editor.ql-dragging {
            border: 2px dashed #007cdc;
            background-color: rgba(0, 124, 220, 0.05);
          }
        `
      }} />



      {/* Editor Quill */}
      <div className="quill-editor-container">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          style={{ backgroundColor: 'white' }}
        />
      </div>
    </div>
  );
}