import React from 'react';
import { createPlateEditor, Plate, PlateContent, createPlugins } from '@udecode/plate/react';
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  SubscriptPlugin,
  SuperscriptPlugin,
  CodePlugin,
} from '@udecode/plate-basic-marks/react';
import { HeadingPlugin } from '@udecode/plate-heading/react';
import { ParagraphPlugin } from '@udecode/plate-paragraph/react';
import { BlockquotePlugin } from '@udecode/plate-block-quote/react';
import { LinkPlugin } from '@udecode/plate-link/react';
import { ListPlugin } from '@udecode/plate-list/react';
import { TablePlugin } from '@udecode/plate-table/react';
import { AlignPlugin } from '@udecode/plate-alignment/react';
import { IndentPlugin } from '@udecode/plate-indent/react';
import { MediaEmbedPlugin, ImagePlugin, VideoPlugin } from '@udecode/plate-media/react';
import { cn } from '@udecode/cn';

// Componentes UI
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Quote,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Indent,
  Outdent,
  Link,
  Image,
  Video,
  Table,
} from 'lucide-react';

// Barra de ferramentas para o editor
const Toolbar = ({ editor }: { editor: any }) => {
  const formatMark = (format: string) => {
    editor.api.transformers.toggleMark(format);
  };

  return (
    <div className="bg-muted p-2 rounded-t-md flex flex-wrap gap-1 border">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatMark('bold')}
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatMark('italic')}
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatMark('underline')}
        className="h-8 w-8 p-0"
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatMark('strikethrough')}
        className="h-8 w-8 p-0"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatMark('code')}
        className="h-8 w-8 p-0"
      >
        <Code className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-8 bg-border mx-1" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.api.transformers.toggleNode('h1', 'p')}
        className="h-8 w-8 p-0"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.api.transformers.toggleNode('h2', 'p')}
        className="h-8 w-8 p-0"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.api.transformers.toggleBlock('blockquote')}
        className="h-8 w-8 p-0"
      >
        <Quote className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-8 bg-border mx-1" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.api.transformers.toggleList('ul')}
        className="h-8 w-8 p-0"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.api.transformers.toggleList('ol')}
        className="h-8 w-8 p-0"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-8 bg-border mx-1" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.api.transformers.align('left')}
        className="h-8 w-8 p-0"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.api.transformers.align('center')}
        className="h-8 w-8 p-0"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.api.transformers.align('right')}
        className="h-8 w-8 p-0"
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-8 bg-border mx-1" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.api.transformers.indent()}
        className="h-8 w-8 p-0"
      >
        <Indent className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.api.transformers.outdent()}
        className="h-8 w-8 p-0"
      >
        <Outdent className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-8 bg-border mx-1" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const url = prompt('Digite o URL do link:');
          if (url) editor.api.transformers.insertLink({ url });
        }}
        className="h-8 w-8 p-0"
      >
        <Link className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const url = prompt('Digite o URL da imagem:');
          if (url) editor.api.transformers.insertImage({ url });
        }}
        className="h-8 w-8 p-0"
      >
        <Image className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const url = prompt('Digite o URL do vídeo:');
          if (url) editor.api.transformers.insertMedia({ url, type: 'video' });
        }}
        className="h-8 w-8 p-0"
      >
        <Video className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.api.transformers.insertTable()}
        className="h-8 w-8 p-0"
      >
        <Table className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Tipos para as props do editor
interface PlateEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Componente principal do editor
const PlateEditor: React.FC<PlateEditorProps> = ({ value, onChange, className }) => {
  // Configurar os plugins do Plate
  const plugins = createPlugins([
    ParagraphPlugin(),
    BoldPlugin(),
    ItalicPlugin(),
    UnderlinePlugin(),
    StrikethroughPlugin(),
    SubscriptPlugin(),
    SuperscriptPlugin(),
    CodePlugin(),
    HeadingPlugin(),
    BlockquotePlugin(),
    LinkPlugin(),
    ListPlugin(),
    TablePlugin(),
    AlignPlugin(),
    IndentPlugin(),
    ImagePlugin(),
    VideoPlugin(),
    MediaEmbedPlugin(),
  ]);

  // Inicializar o editor
  const editor = createPlateEditor({
    plugins,
  });

  // Valor inicial do editor
  let initialValue = [];
  try {
    initialValue = value ? JSON.parse(value) : [{ type: 'p', children: [{ text: '' }] }];
  } catch (error) {
    console.error('Erro ao analisar o conteúdo do editor:', error);
    initialValue = [{ type: 'p', children: [{ text: '' }] }];
  }

  return (
    <div className={cn("border rounded-md", className)}>
      <Toolbar editor={editor} />
      <Plate
        editor={editor}
        initialValue={initialValue}
        onChange={(newValue) => {
          onChange(JSON.stringify(newValue));
        }}
      >
        <PlateContent 
          className="p-4 min-h-[300px] focus:outline-none prose prose-sm max-w-none" 
          placeholder="Digite o conteúdo da notícia aqui..."
        />
      </Plate>
    </div>
  );
};

export default PlateEditor;