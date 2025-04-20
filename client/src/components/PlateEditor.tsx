import React, { useMemo } from 'react';
import { Plate } from '@udecode/plate';
import { createParagraphPlugin } from '@udecode/plate-paragraph';
import { createBlockquotePlugin } from '@udecode/plate-block-quote';
import { createHeadingPlugin } from '@udecode/plate-heading';
import { createListPlugin } from '@udecode/plate-list';
import { createTablePlugin } from '@udecode/plate-table';
import { createLinkPlugin } from '@udecode/plate-link';
import { createMediaPlugin } from '@udecode/plate-media';
import { createBasicMarksPlugin } from '@udecode/plate-basic-marks';
import { createAlignPlugin } from '@udecode/plate-alignment';
import { createReactPlugin, createHistoryPlugin } from '@udecode/plate-core';

import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Quote,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Image,
  Table,
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

interface PlateEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const PlateEditor: React.FC<PlateEditorProps> = ({ value, onChange, className }) => {
  // Configurar os plugins
  const plugins = useMemo(() => [
    createReactPlugin(),
    createHistoryPlugin(),
    createParagraphPlugin(),
    createBlockquotePlugin(),
    createHeadingPlugin(),
    createListPlugin(),
    createTablePlugin(),
    createLinkPlugin(),
    createMediaPlugin(),
    createBasicMarksPlugin(),
    createAlignPlugin(),
  ], []);

  // Valor inicial do editor
  let initialValue = [];
  try {
    initialValue = value ? JSON.parse(value) : [{ type: 'p', children: [{ text: '' }] }];
  } catch (error) {
    console.error('Erro ao analisar o conteúdo do editor:', error);
    initialValue = [{ type: 'p', children: [{ text: '' }] }];
  }

  // Barra de ferramentas simplificada
  const Toolbar = () => {
    return (
      <div className="bg-muted p-2 rounded-t-md flex flex-wrap gap-1 border">
        {/* Formatação básica */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Negrito"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Itálico"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Sublinhado"
        >
          <Underline className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-8 bg-border mx-1" />
        
        {/* Headings e Blockquote */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Título 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Título 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Citação"
        >
          <Quote className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-8 bg-border mx-1" />
        
        {/* Listas */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Lista com marcadores"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-8 bg-border mx-1" />
        
        {/* Alinhamento */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Alinhar à esquerda"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Centralizar"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Alinhar à direita"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-8 bg-border mx-1" />
        
        {/* Link, Imagem e Tabela */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Inserir link"
        >
          <Link className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Inserir imagem"
        >
          <Image className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Inserir tabela"
        >
          <Table className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className={cn("border rounded-md", className)}>
      <Toolbar />
      <Plate
        plugins={plugins}
        initialValue={initialValue}
        onChange={value => onChange(JSON.stringify(value))}
      >
        <div 
          className="p-4 min-h-[300px] focus:outline-none prose prose-sm max-w-none bg-white rounded-b-md"
          contentEditable
          suppressContentEditableWarning
        />
      </Plate>
    </div>
  );
};

export default PlateEditor;