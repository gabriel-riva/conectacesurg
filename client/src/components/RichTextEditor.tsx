import React, { useRef, useState, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Link, Image, Youtube, Table } from "lucide-react";

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
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isYoutubeDialogOpen, setIsYoutubeDialogOpen] = useState(false);

  // Configuração básica do Quill (sem módulos problemáticos)
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  };

  // Formatos suportados
  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'align', 'list', 'indent',
    'blockquote', 'code-block', 'link', 'image'
  ];

  // Função para inserir link personalizado
  const handleCustomLink = () => {
    setIsLinkDialogOpen(true);
  };

  // Função para inserir link
  const insertLink = () => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection();
      
      if (range) {
        if (linkText) {
          quill.insertText(range.index, linkText, 'link', linkUrl);
        } else {
          quill.format('link', linkUrl);
        }
      }
    }
    
    setLinkUrl('');
    setLinkText('');
    setIsLinkDialogOpen(false);
  };

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

  // Função para inserir vídeo do YouTube
  const handleYoutubeVideo = () => {
    setIsYoutubeDialogOpen(true);
  };

  // Função para converter URL do YouTube para embed
  const getYoutubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  // Função para inserir vídeo do YouTube
  const insertYoutubeVideo = () => {
    const embedUrl = getYoutubeEmbedUrl(youtubeUrl);
    
    if (embedUrl && quillRef.current) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection();
      
      if (range) {
        const videoHtml = `<iframe src="${embedUrl}" frameborder="0" allowfullscreen style="width: 100%; height: 315px;"></iframe>`;
        quill.clipboard.dangerouslyPasteHTML(range.index, videoHtml);
      }
    }
    
    setYoutubeUrl('');
    setIsYoutubeDialogOpen(false);
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
          }
        `
      }} />

      {/* Botões de ação extras */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" type="button">
              <Link className="w-4 h-4 mr-2" />
              Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inserir Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="linkUrl">URL</Label>
                <Input
                  id="linkUrl"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="linkText">Texto do Link (opcional)</Label>
                <Input
                  id="linkText"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Texto a ser exibido"
                />
              </div>
              <Button onClick={insertLink} className="w-full">
                Inserir Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isYoutubeDialogOpen} onOpenChange={setIsYoutubeDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" type="button">
              <Youtube className="w-4 h-4 mr-2" />
              YouTube
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inserir Vídeo do YouTube</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="youtubeUrl">URL do YouTube</Label>
                <Input
                  id="youtubeUrl"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <Button onClick={insertYoutubeVideo} className="w-full">
                Inserir Vídeo
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" onClick={insertTable} type="button">
          <Table className="w-4 h-4 mr-2" />
          Tabela
        </Button>
      </div>

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