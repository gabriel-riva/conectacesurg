import React, { useState, useCallback, useMemo } from 'react';
import { createEditor, Descendant, Transforms, Editor, Text as SlateText, Element as SlateElement } from 'slate';
import { Slate, Editable, withReact, ReactEditor, RenderElementProps, RenderLeafProps } from 'slate-react';
import { withHistory } from 'slate-history';
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

// Defina tipos para o editor
type CustomElement = {
  type: 'paragraph' | 'heading-one' | 'heading-two' | 'blockquote' | 'bulleted-list' | 'numbered-list' | 'list-item' | 'image' | 'link';
  children: CustomText[];
  url?: string;
  align?: 'left' | 'center' | 'right';
};

type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
};

// Declaração para o Typescript entender os tipos personalizados
declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

// Barra de ferramentas para o editor
const Toolbar = ({ editor }: { editor: BaseEditor & ReactEditor }) => {
  const isMarkActive = (format: keyof Omit<CustomText, 'text'>) => {
    const marks = Editor.marks(editor);
    return marks ? marks[format] === true : false;
  };

  const toggleMark = (format: keyof Omit<CustomText, 'text'>) => {
    const isActive = isMarkActive(format);
    
    if (isActive) {
      Editor.removeMark(editor, format);
    } else {
      Editor.addMark(editor, format, true);
    }
  };

  const isBlockActive = (format: string, blockType = 'type') => {
    const { selection } = editor;
    if (!selection) return false;

    const [match] = Array.from(
      Editor.nodes(editor, {
        at: Editor.unhangRange(editor, selection),
        match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n[blockType as keyof typeof n] === format,
      })
    );

    return !!match;
  };

  const toggleBlock = (format: string) => {
    const isActive = isBlockActive(format);
    const isList = format === 'bulleted-list' || format === 'numbered-list';

    Transforms.unwrapNodes(editor, {
      match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && ['bulleted-list', 'numbered-list'].includes(n.type),
      split: true,
    });

    const newProperties: Partial<CustomElement> = {
      type: isActive ? 'paragraph' : isList ? 'list-item' : format as any,
    };
    
    Transforms.setNodes(editor, newProperties);

    if (!isActive && isList) {
      const block = { type: format, children: [] };
      Transforms.wrapNodes(editor, block as any);
    }
  };

  const insertImage = () => {
    const url = prompt('Digite o URL da imagem:');
    if (url) {
      const image: CustomElement = {
        type: 'image',
        url,
        children: [{ text: '' }],
      };
      Transforms.insertNodes(editor, image);
    }
  };

  const insertLink = () => {
    const url = prompt('Digite o URL do link:');
    if (!url) return;
    
    const { selection } = editor;
    const isCollapsed = selection && Range.isCollapsed(selection);
    
    const link: CustomElement = {
      type: 'link',
      url,
      children: isCollapsed ? [{ text: url }] : [],
    };
    
    if (isCollapsed) {
      Transforms.insertNodes(editor, link);
    } else {
      Transforms.wrapNodes(editor, link, { split: true });
      Transforms.collapse(editor, { edge: 'end' });
    }
  };

  const toggleAlign = (align: 'left' | 'center' | 'right') => {
    Transforms.setNodes(editor, { align }, {
      match: n => !Editor.isEditor(n) && SlateElement.isElement(n),
    });
  };

  return (
    <div className="bg-muted p-2 rounded-t-md flex flex-wrap gap-1 border">
      <Button
        variant={isMarkActive('bold') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => toggleMark('bold')}
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant={isMarkActive('italic') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => toggleMark('italic')}
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant={isMarkActive('underline') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => toggleMark('underline')}
        className="h-8 w-8 p-0"
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant={isMarkActive('strikethrough') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => toggleMark('strikethrough')}
        className="h-8 w-8 p-0"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        variant={isMarkActive('code') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => toggleMark('code')}
        className="h-8 w-8 p-0"
      >
        <Code className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-8 bg-border mx-1" />
      
      <Button
        variant={isBlockActive('heading-one') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => toggleBlock('heading-one')}
        className="h-8 w-8 p-0"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant={isBlockActive('heading-two') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => toggleBlock('heading-two')}
        className="h-8 w-8 p-0"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant={isBlockActive('blockquote') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => toggleBlock('blockquote')}
        className="h-8 w-8 p-0"
      >
        <Quote className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-8 bg-border mx-1" />
      
      <Button
        variant={isBlockActive('bulleted-list') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => toggleBlock('bulleted-list')}
        className="h-8 w-8 p-0"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={isBlockActive('numbered-list') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => toggleBlock('numbered-list')}
        className="h-8 w-8 p-0"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-8 bg-border mx-1" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleAlign('left')}
        className="h-8 w-8 p-0"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleAlign('center')}
        className="h-8 w-8 p-0"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleAlign('right')}
        className="h-8 w-8 p-0"
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-8 bg-border mx-1" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={insertLink}
        className="h-8 w-8 p-0"
      >
        <Link className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={insertImage}
        className="h-8 w-8 p-0"
      >
        <Image className="h-4 w-4" />
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

// Elemento personalizado para o editor
const Element = ({ attributes, children, element }: RenderElementProps) => {
  const style = element.align ? { textAlign: element.align } : {};
  
  switch (element.type) {
    case 'heading-one':
      return <h1 style={style} {...attributes}>{children}</h1>;
    case 'heading-two':
      return <h2 style={style} {...attributes}>{children}</h2>;
    case 'blockquote':
      return <blockquote style={style} {...attributes}>{children}</blockquote>;
    case 'bulleted-list':
      return <ul style={style} {...attributes}>{children}</ul>;
    case 'numbered-list':
      return <ol style={style} {...attributes}>{children}</ol>;
    case 'list-item':
      return <li style={style} {...attributes}>{children}</li>;
    case 'image':
      return (
        <div {...attributes} contentEditable={false} className="relative my-4">
          <div contentEditable={false}>
            <img
              src={element.url}
              alt="Imagem inserida"
              className="max-w-full h-auto rounded-md border"
            />
          </div>
          {children}
        </div>
      );
    case 'link':
      return (
        <a href={element.url} className="text-primary underline" {...attributes}>
          {children}
        </a>
      );
    default:
      return <p style={style} {...attributes}>{children}</p>;
  }
};

// Folha personalizada para o editor (formatação de texto)
const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }
  
  if (leaf.italic) {
    children = <em>{children}</em>;
  }
  
  if (leaf.underline) {
    children = <u>{children}</u>;
  }
  
  if (leaf.strikethrough) {
    children = <s>{children}</s>;
  }
  
  if (leaf.code) {
    children = <code className="bg-muted px-1 py-0.5 rounded text-sm">{children}</code>;
  }
  
  return <span {...attributes}>{children}</span>;
};

// Componente principal do editor
const PlateEditor: React.FC<PlateEditorProps> = ({ value, onChange, className }) => {
  // Criar o editor com os plugins
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  
  // Valor inicial do editor
  const initialValue: Descendant[] = useMemo(() => {
    if (value) {
      try {
        const parsedValue = JSON.parse(value);
        if (Array.isArray(parsedValue) && parsedValue.length > 0) {
          return parsedValue;
        }
      } catch (error) {
        console.error("Erro ao analisar o valor do editor:", error);
      }
    }
    
    return [
      {
        type: 'paragraph',
        children: [{ text: '' }],
      },
    ];
  }, [value]);

  // Manipulador para alterações no editor
  const handleChange = (newValue: Descendant[]) => {
    onChange(JSON.stringify(newValue));
  };

  return (
    <div className={cn("border rounded-md", className)}>
      <Slate editor={editor} initialValue={initialValue} onChange={handleChange}>
        <Toolbar editor={editor} />
        <div className="p-4 min-h-[300px] focus:outline-none prose prose-sm max-w-none bg-white rounded-b-md">
          <Editable
            renderElement={useCallback((props) => <Element {...props} />, [])}
            renderLeaf={useCallback((props) => <Leaf {...props} />, [])}
            placeholder="Digite o conteúdo da notícia aqui..."
            spellCheck
            className="outline-none min-h-[300px]"
          />
        </div>
      </Slate>
    </div>
  );
};

export default PlateEditor;