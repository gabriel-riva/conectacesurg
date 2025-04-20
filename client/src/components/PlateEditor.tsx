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

// Constantes para os tipos de elementos
const MARK_BOLD = 'bold';
const MARK_ITALIC = 'italic';
const MARK_UNDERLINE = 'underline';
const MARK_STRIKETHROUGH = 'strikethrough';
const ELEMENT_H1 = 'heading1';
const ELEMENT_H2 = 'heading2';
const ELEMENT_BLOCKQUOTE = 'blockquote';
const ELEMENT_UL = 'ul';
const ELEMENT_OL = 'ol';
const ELEMENT_ALIGN_LEFT = 'left';
const ELEMENT_ALIGN_CENTER = 'center';
const ELEMENT_ALIGN_RIGHT = 'right';

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
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
    createImagePlugin(),
    createBoldPlugin(),
    createItalicPlugin(),
    createUnderlinePlugin(),
    createStrikethroughPlugin(),
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

  // Funções auxiliares para as ações da barra de ferramentas
  const toggleMark = (editor: any, format: string) => {
    const type = getPlatePluginType(editor, format);
    const isActive = editor.isMarkActive(type);
    
    if (isActive) {
      editor.removeMark(type);
    } else {
      editor.addMark(type, true);
    }
  };
  
  const toggleBlock = (editor: any, format: string) => {
    const type = getPlatePluginType(editor, format);
    editor.toggleBlock(type);
  };
  
  const toggleList = (editor: any, format: string) => {
    const type = getPlatePluginType(editor, format);
    editor.toggleList(type);
  };
  
  const toggleAlign = (editor: any, format: string) => {
    const type = getPlatePluginType(editor, format);
    editor.toggleAlign(type);
  };
  
  const insertLink = (editor: any) => {
    const url = prompt('Digite o URL do link:');
    if (url) {
      editor.insertLink({ url });
    }
  };
  
  const insertImage = (editor: any) => {
    const url = prompt('Digite o URL da imagem:');
    if (url) {
      editor.insertImage({ url });
    }
  };
  
  const insertTable = (editor: any) => {
    editor.insertTable();
  };

  // Barra de ferramentas personalizada
  const Toolbar = () => {
    const editor = usePlateEditorRef()!;
    
    const isMarkActive = (format: string) => {
      const type = getPlatePluginType(editor, format);
      return editor.isMarkActive(type);
    };
    
    const isBlockActive = (format: string) => {
      const type = getPlatePluginType(editor, format);
      return editor.isBlockActive(type);
    };
    
    const isListActive = (format: string) => {
      const type = getPlatePluginType(editor, format);
      return editor.isListActive(type);
    };
    
    const isAlignActive = (format: string) => {
      const type = getPlatePluginType(editor, format);
      return editor.isAlignActive(type);
    };

    return (
      <div className="bg-muted p-2 rounded-t-md flex flex-wrap gap-1 border">
        {/* Formatação de texto */}
        <Button
          variant={isMarkActive(MARK_BOLD) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleMark(editor, MARK_BOLD)}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={isMarkActive(MARK_ITALIC) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleMark(editor, MARK_ITALIC)}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={isMarkActive(MARK_UNDERLINE) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleMark(editor, MARK_UNDERLINE)}
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          variant={isMarkActive(MARK_STRIKETHROUGH) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleMark(editor, MARK_STRIKETHROUGH)}
          className="h-8 w-8 p-0"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-8 bg-border mx-1" />
        
        {/* Headings e Blockquote */}
        <Button
          variant={isBlockActive(ELEMENT_H1) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleBlock(editor, ELEMENT_H1)}
          className="h-8 w-8 p-0"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant={isBlockActive(ELEMENT_H2) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleBlock(editor, ELEMENT_H2)}
          className="h-8 w-8 p-0"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant={isBlockActive(ELEMENT_BLOCKQUOTE) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleBlock(editor, ELEMENT_BLOCKQUOTE)}
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-8 bg-border mx-1" />
        
        {/* Listas */}
        <Button
          variant={isListActive(ELEMENT_UL) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleList(editor, ELEMENT_UL)}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={isListActive(ELEMENT_OL) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleList(editor, ELEMENT_OL)}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-8 bg-border mx-1" />
        
        {/* Alinhamento */}
        <Button
          variant={isAlignActive(ELEMENT_ALIGN_LEFT) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleAlign(editor, ELEMENT_ALIGN_LEFT)}
          className="h-8 w-8 p-0"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={isAlignActive(ELEMENT_ALIGN_CENTER) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleAlign(editor, ELEMENT_ALIGN_CENTER)}
          className="h-8 w-8 p-0"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={isAlignActive(ELEMENT_ALIGN_RIGHT) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => toggleAlign(editor, ELEMENT_ALIGN_RIGHT)}
          className="h-8 w-8 p-0"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-8 bg-border mx-1" />
        
        {/* Link, Imagem e Tabela */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertLink(editor)}
          className="h-8 w-8 p-0"
        >
          <Link className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertImage(editor)}
          className="h-8 w-8 p-0"
        >
          <Image className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertTable(editor)}
          className="h-8 w-8 p-0"
        >
          <Table className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className={cn("border rounded-md", className)}>
      <Plate
        plugins={plugins}
        initialValue={initialValue}
        onChange={value => onChange(JSON.stringify(value))}
      >
        <Toolbar />
        <div 
          className="p-4 min-h-[300px] focus:outline-none prose prose-sm max-w-none bg-white rounded-b-md"
        />
      </Plate>
    </div>
  );
};

export default PlateEditor;