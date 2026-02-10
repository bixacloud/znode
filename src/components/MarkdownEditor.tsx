import { useState, useCallback } from 'react';
import MDEditor, { commands, ICommand } from '@uiw/react-md-editor';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  disabled?: boolean;
  preview?: 'live' | 'edit' | 'preview';
}

// Custom commands for the toolbar
const customCommands: ICommand[] = [
  commands.bold,
  commands.italic,
  commands.strikethrough,
  commands.hr,
  commands.divider,
  commands.title1,
  commands.title2,
  commands.title3,
  commands.divider,
  commands.link,
  commands.quote,
  commands.code,
  commands.codeBlock,
  commands.divider,
  commands.unorderedListCommand,
  commands.orderedListCommand,
  commands.checkedListCommand,
  commands.divider,
  commands.image,
  commands.table,
];

const MarkdownEditor = ({
  value,
  onChange,
  placeholder = 'Write your content in Markdown...',
  minHeight = 300,
  maxHeight = 600,
  disabled = false,
  preview = 'live',
}: MarkdownEditorProps) => {
  const [previewMode, setPreviewMode] = useState<'live' | 'edit' | 'preview'>(preview);

  const handleChange = useCallback((val?: string) => {
    onChange(val || '');
  }, [onChange]);

  return (
    <div 
      className={cn(
        "markdown-editor-wrapper",
        disabled && "opacity-50 pointer-events-none"
      )}
      data-color-mode="auto"
    >
      <MDEditor
        value={value}
        onChange={handleChange}
        preview={previewMode}
        commands={customCommands}
        extraCommands={[
          commands.codeEdit,
          commands.codeLive,
          commands.codePreview,
          commands.divider,
          commands.fullscreen,
        ]}
        height={minHeight}
        minHeight={minHeight}
        maxHeight={maxHeight}
        textareaProps={{
          placeholder,
          disabled,
        }}
        previewOptions={{
          className: 'prose prose-sm dark:prose-invert max-w-none',
        }}
      />
      
      {/* Quick tips */}
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="bg-muted px-1.5 py-0.5 rounded">**bold**</span>
        <span className="bg-muted px-1.5 py-0.5 rounded">*italic*</span>
        <span className="bg-muted px-1.5 py-0.5 rounded">[link](url)</span>
        <span className="bg-muted px-1.5 py-0.5 rounded">![image](url)</span>
        <span className="bg-muted px-1.5 py-0.5 rounded">`code`</span>
        <span className="bg-muted px-1.5 py-0.5 rounded">```code block```</span>
      </div>
    </div>
  );
};

export default MarkdownEditor;
