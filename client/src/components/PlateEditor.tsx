import React, { useCallback, useMemo } from 'react';
import { createEditor, Descendant, Transforms, Editor, Element as SlateElement } from 'slate';
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps } from 'slate-react';
import { withHistory } from 'slate-history';

// UI Components
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
  Link,
  Image,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define custom types for our editor
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

// Type definitions for TypeScript
declare module 'slate' {
  interface CustomTypes {
    Editor: Editor;
    Element: CustomElement;
    Text: CustomText;
  }
}

// Toolbar component
const Toolbar = ({ editor }: { editor: Editor }) => {
  // Check if a mark is currently active
  const isMarkActive = (format: keyof Omit<CustomText, 'text'>) => {
    const marks = Editor.marks(editor);
    return marks ? marks[format] === true : false;
  };

  // Toggle a mark on or off
  const toggleMark = (format: keyof Omit<CustomText, 'text'>) => {
    const isActive = isMarkActive(format);
    
    if (isActive) {
      Editor.removeMark(editor, format);
    } else {
      Editor.addMark(editor, format, true);
    }
  };

  // Check if a block format is active
  const isBlockActive = (format: string) => {
    const { selection } = editor;
    if (!selection) return false;

    const [match] = Array.from(
      Editor.nodes(editor, {
        at: Editor.unhangRange(editor, selection),
        match: n => 
          !Editor.isEditor(n) && 
          SlateElement.isElement(n) && 
          n.type === format,
      })
    );

    return !!match;
  };

  // Toggle a block format
  const toggleBlock = (format: string) => {
    const isActive = isBlockActive(format);
    const isList = format === 'bulleted-list' || format === 'numbered-list';

    Transforms.unwrapNodes(editor, {
      match: n => 
        !Editor.isEditor(n) && 
        SlateElement.isElement(n) && 
        ['bulleted-list', 'numbered-list'].includes(n.type),
      split: true,
    });

    Transforms.setNodes(editor, {
      type: isActive ? 'paragraph' : isList ? 'list-item' : format,
    });

    if (!isActive && isList) {
      const block = { type: format, children: [] };
      Transforms.wrapNodes(editor, block);
    }
  };

  // Set text alignment
  const setAlignment = (alignment: 'left' | 'center' | 'right') => {
    Transforms.setNodes(editor, { align: alignment }, {
      match: n => !Editor.isEditor(n) && SlateElement.isElement(n),
    });
  };

  // Insert a link
  const insertLink = () => {
    const url = prompt('Digite o URL do link:');
    if (!url) return;

    const { selection } = editor;
    const isCollapsed = selection && selection.anchor.offset === selection.focus.offset;
    
    if (isCollapsed) {
      Transforms.insertNodes(editor, {
        type: 'link',
        url,
        children: [{ text: url }],
      });
    } else {
      Transforms.wrapNodes(editor, {
        type: 'link',
        url,
        children: [],
      }, { split: true });
      Transforms.collapse(editor, { edge: 'end' });
    }
  };

  // Insert an image
  const insertImage = () => {
    const url = prompt('Digite o URL da imagem:');
    if (url) {
      Transforms.insertNodes(editor, {
        type: 'image',
        url,
        children: [{ text: '' }],
      });
    }
  };

  return (
    <div className="bg-muted p-2 rounded-t-md flex flex-wrap gap-1 border">
      {/* Text formatting buttons */}
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
      
      {/* Block formatting buttons */}
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
      
      {/* List buttons */}
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
      
      {/* Alignment buttons */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setAlignment('left')}
        className="h-8 w-8 p-0"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setAlignment('center')}
        className="h-8 w-8 p-0"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setAlignment('right')}
        className="h-8 w-8 p-0"
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-8 bg-border mx-1" />
      
      {/* Insert buttons */}
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

// Custom element renderer
const Element = ({ attributes, children, element }: RenderElementProps) => {
  const style = element.align ? { textAlign: element.align } : {};
  
  switch (element.type) {
    case 'heading-one':
      return <h1 style={style} {...attributes} className="text-2xl font-bold my-4">{children}</h1>;
    case 'heading-two':
      return <h2 style={style} {...attributes} className="text-xl font-bold my-3">{children}</h2>;
    case 'blockquote':
      return <blockquote style={style} {...attributes} className="border-l-4 border-gray-300 pl-4 italic my-4">{children}</blockquote>;
    case 'bulleted-list':
      return <ul style={style} {...attributes} className="list-disc ml-5 my-2">{children}</ul>;
    case 'numbered-list':
      return <ol style={style} {...attributes} className="list-decimal ml-5 my-2">{children}</ol>;
    case 'list-item':
      return <li style={style} {...attributes} className="my-1">{children}</li>;
    case 'image':
      return (
        <div {...attributes} contentEditable={false} className="my-4">
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
      return <p style={style} {...attributes} className="my-2">{children}</p>;
  }
};

// Custom leaf renderer for text formatting
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

// Props definition for the editor component
interface PlateEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Main editor component
const PlateEditor: React.FC<PlateEditorProps> = ({ value, onChange, className }) => {
  // Initialize the Slate editor
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  
  // Define the initial value for the editor
  const initialValue: Descendant[] = useMemo(() => {
    if (value) {
      try {
        return JSON.parse(value);
      } catch (error) {
        console.error("Error parsing editor content:", error);
      }
    }
    
    // Default initial value if no value is provided or if parsing fails
    return [
      {
        type: 'paragraph',
        children: [{ text: '' }],
      },
    ];
  }, [value]);

  // Handle changes to the editor content
  const handleChange = useCallback((newValue: Descendant[]) => {
    onChange(JSON.stringify(newValue));
  }, [onChange]);

  return (
    <div className={cn("border rounded-md", className)}>
      <Slate editor={editor} initialValue={initialValue} onChange={handleChange}>
        <Toolbar editor={editor} />
        <div className="p-4 min-h-[300px] focus:outline-none prose prose-sm max-w-none bg-white rounded-b-md">
          <Editable
            renderElement={(props) => <Element {...props} />}
            renderLeaf={(props) => <Leaf {...props} />}
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