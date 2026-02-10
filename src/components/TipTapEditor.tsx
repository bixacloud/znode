import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback, useState } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Highlighter,
  Undo,
  Redo,
  ImageIcon,
  CodeXml,
  Youtube as YoutubeIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSite } from '@/contexts/SiteContext';

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
  simple?: boolean;
  showHtmlToggle?: boolean;
}

// Predefined colors
const COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#FFFFFF',
  '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF',
  '#9900FF', '#FF00FF', '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3',
  '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC',
];

const HIGHLIGHT_COLORS = [
  '#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FF0000', '#0000FF',
  '#FFF2CC', '#D9EAD3', '#D0E0E3', '#CFE2F3', '#D9D2E9', '#FCE5CD',
];

// Toolbar Button
const ToolbarButton = ({ 
  active, 
  onClick, 
  children, 
  title,
  disabled 
}: { 
  active?: boolean; 
  onClick: () => void; 
  children: React.ReactNode; 
  title?: string;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={cn(
      "p-2 rounded hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
      active && "bg-primary/10 text-primary"
    )}
  >
    {children}
  </button>
);

// Color Picker Popover
const ColorPicker = ({ 
  colors, 
  currentColor, 
  onColorSelect, 
  icon: Icon,
  title 
}: { 
  colors: string[]; 
  currentColor?: string;
  onColorSelect: (color: string) => void;
  icon: React.ElementType;
  title: string;
}) => {
  const [open, setOpen] = useState(false);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={title}
          className={cn(
            "p-2 rounded hover:bg-muted transition-colors relative",
            currentColor && "text-primary"
          )}
        >
          <Icon className="w-4 h-4" />
          {currentColor && (
            <div 
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded"
              style={{ backgroundColor: currentColor }}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-8 gap-1">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              className={cn(
                "w-6 h-6 rounded border border-border hover:scale-110 transition-transform",
                currentColor === color && "ring-2 ring-primary ring-offset-1"
              )}
              style={{ backgroundColor: color }}
              onClick={() => {
                onColorSelect(color);
                setOpen(false);
              }}
            />
          ))}
        </div>
        <button
          type="button"
          className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            onColorSelect('');
            setOpen(false);
          }}
        >
          Remove color
        </button>
      </PopoverContent>
    </Popover>
  );
};

// Image Insert Popover
const ImageInsert = ({
  onInsert,
}: {
  onInsert: (url: string, alt?: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');

  const handleInsert = () => {
    if (url) {
      onInsert(url, alt);
      setUrl('');
      setAlt('');
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Insert Image"
          className="p-2 rounded hover:bg-muted transition-colors"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="img-url" className="text-sm">Image URL</Label>
            <Input
              id="img-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/image.png"

            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="img-alt" className="text-sm">Alt Text (optional)</Label>
            <Input
              id="img-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Image description"
            />
          </div>
          <Button onClick={handleInsert} className="w-full" size="sm" disabled={!url}>
            Insert Image
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// YouTube Insert Popover
const YoutubeInsert = ({
  onInsert,
}: {
  onInsert: (url: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const handleInsert = () => {
    if (url) {
      onInsert(url);
      setUrl('');
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Insert YouTube Video"
          className="p-2 rounded hover:bg-muted transition-colors"
        >
          <YoutubeIcon className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="yt-url" className="text-sm">YouTube URL</Label>
            <Input
              id="yt-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              onKeyDown={(e) => e.key === 'Enter' && handleInsert()}
            />
          </div>
          <Button onClick={handleInsert} className="w-full" size="sm" disabled={!url}>
            Insert Video
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const TipTapEditor = ({
  value,
  onChange,
  placeholder = 'Enter your message...',
  minHeight = 150,
  disabled = false,
  simple = false,
  showHtmlToggle = false,
}: TipTapEditorProps) => {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState(value);
  const [isUploading, setIsUploading] = useState(false);
  const { settings } = useSite();
  const imgbbApiKey = settings.imgbbApiKey || '';

  // Upload image to ImgBB
  const uploadToImgBB = useCallback(async (file: File): Promise<string | null> => {
    if (!imgbbApiKey) return null;
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const formData = new FormData();
      formData.append('image', base64);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) return data.data.url;
      return null;
    } catch {
      return null;
    }
  }, [imgbbApiKey]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80 cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
      Youtube.configure({
        HTMLAttributes: {
          class: 'rounded overflow-hidden my-2',
        },
        width: 480,
        height: 270,
        nocookie: true,
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable: !disabled && !isHtmlMode,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setHtmlContent(html);
      onChange(html);
    },
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items || !imgbbApiKey) return false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return false;
            setIsUploading(true);
            uploadToImgBB(file).then((url) => {
              setIsUploading(false);
              if (url && editor) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            });
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length || !imgbbApiKey) return false;
        const file = files[0];
        if (!file.type.startsWith('image/')) return false;
        event.preventDefault();
        setIsUploading(true);
        uploadToImgBB(file).then((url) => {
          setIsUploading(false);
          if (url && editor) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        });
        return true;
      },
    },
  });

  // Update content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
      setHtmlContent(value);
    }
  }, [value, editor]);

  // Toggle HTML mode
  const toggleHtmlMode = useCallback(() => {
    if (isHtmlMode && editor) {
      // Switching from HTML to visual - apply HTML changes
      editor.commands.setContent(htmlContent);
      onChange(htmlContent);
    }
    setIsHtmlMode(!isHtmlMode);
  }, [isHtmlMode, editor, htmlContent, onChange]);

  // Insert image
  const insertImage = useCallback((url: string, alt?: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: url, alt: alt || '' }).run();
    }
  }, [editor]);

  // Insert YouTube video
  const insertYoutube = useCallback((url: string) => {
    if (editor) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn(
      "tiptap-editor-wrapper border border-border rounded-lg overflow-hidden bg-background",
      disabled && "opacity-50"
    )}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-2 border-b border-border bg-muted/30 flex-wrap">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text Formatting */}
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        {!simple && (
          <ToolbarButton
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        {/* Colors */}
        <ColorPicker
          colors={COLORS}
          currentColor={editor.getAttributes('textStyle').color}
          onColorSelect={(color) => {
            if (color) {
              editor.chain().focus().setColor(color).run();
            } else {
              editor.chain().focus().unsetColor().run();
            }
          }}
          icon={Palette}
          title="Text Color"
        />
        <ColorPicker
          colors={HIGHLIGHT_COLORS}
          currentColor={editor.getAttributes('highlight').color}
          onColorSelect={(color) => {
            if (color) {
              editor.chain().focus().toggleHighlight({ color }).run();
            } else {
              editor.chain().focus().unsetHighlight().run();
            }
          }}
          icon={Highlighter}
          title="Highlight Color"
        />

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        {!simple && (
          <>
            <div className="w-px h-6 bg-border mx-1" />

            {/* Alignment */}
            <ToolbarButton
              active={editor.isActive({ textAlign: 'left' })}
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive({ textAlign: 'center' })}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive({ textAlign: 'right' })}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </ToolbarButton>
          </>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        {/* Link */}
        <ToolbarButton
          active={editor.isActive('link')}
          onClick={setLink}
          title="Insert Link"
          disabled={isHtmlMode}
        >
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>

        {/* Image */}
        <ImageInsert onInsert={insertImage} />

        {/* YouTube */}
        <YoutubeInsert onInsert={insertYoutube} />

        {!simple && (
          <>
            <ToolbarButton
              active={editor.isActive('code')}
              onClick={() => editor.chain().focus().toggleCode().run()}
              title="Code"
              disabled={isHtmlMode}
            >
              <Code className="w-4 h-4" />
            </ToolbarButton>
          </>
        )}

        {/* HTML Toggle */}
        {showHtmlToggle && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <ToolbarButton
              active={isHtmlMode}
              onClick={toggleHtmlMode}
              title={isHtmlMode ? "Switch to Visual Editor" : "Edit HTML"}
            >
              <CodeXml className="w-4 h-4" />
            </ToolbarButton>
          </>
        )}
      </div>

      {/* Editor Content */}
      {isHtmlMode ? (
        <Textarea
          value={htmlContent}
          onChange={(e) => {
            setHtmlContent(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full font-mono text-sm border-0 rounded-none focus-visible:ring-0 resize-none"
          style={{ minHeight: `${minHeight}px`, maxHeight: `${minHeight + 100}px` }}
          placeholder="Enter HTML..."
        />
      ) : (
        <div className="relative" style={{ maxHeight: `${minHeight + 100}px`, overflowY: 'auto' }}>
          <EditorContent 
            editor={editor} 
            className="prose prose-sm dark:prose-invert max-w-none px-4 py-3"
            style={{ minHeight: `${minHeight}px` }}
          />
          {isUploading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card px-3 py-2 rounded-lg border shadow-sm">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Uploading image...
              </div>
            </div>
          )}
        </div>
      )}

      {/* Styles */}
      <style>{`
        .tiptap-editor-wrapper .ProseMirror {
          outline: none;
          min-height: ${minHeight}px;
        }
        .tiptap-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor-wrapper .ProseMirror p {
          margin: 0.5em 0;
        }
        .tiptap-editor-wrapper .ProseMirror ul,
        .tiptap-editor-wrapper .ProseMirror ol {
          padding-left: 1.5em;
        }
        .tiptap-editor-wrapper .ProseMirror mark {
          border-radius: 0.25em;
          padding: 0.1em 0.2em;
        }
        .tiptap-editor-wrapper .ProseMirror img {
          max-width: 150px;
          max-height: 100px;
          object-fit: cover;
          height: auto;
          border-radius: 0.375rem;
          margin: 0.5em 0;
          cursor: pointer;
          border: 1px solid hsl(var(--border));
        }
        .tiptap-editor-wrapper .ProseMirror img:hover {
          opacity: 0.8;
        }
        .tiptap-editor-wrapper .ProseMirror img.ProseMirror-selectednode {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
        }
        .tiptap-editor-wrapper .ProseMirror div[data-youtube-video] {
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
          overflow: hidden;
          max-width: 100%;
          margin: 0.5em 0;
          border-radius: 0.375rem;
        }
        .tiptap-editor-wrapper .ProseMirror div[data-youtube-video] iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 0;
          border-radius: 0.375rem;
        }
      `}</style>
    </div>
  );
};

export default TipTapEditor;
