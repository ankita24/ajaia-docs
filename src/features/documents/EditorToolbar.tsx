
import type { Editor } from '@tiptap/react';

interface EditorToolbarProps {
  editor: Editor;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  const buttons = [
    {
      label: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive('bold'),
    },
    {
      label: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive('italic'),
    },
    {
      label: 'Underline',
      action: () => editor.chain().focus().toggleUnderline().run(),
      active: editor.isActive('underline'),
    },
    {
      label: 'Heading 1',
      action: () =>
        editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editor.isActive('heading', { level: 1 }),
    },
    {
      label: 'Bullet list',
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList'),
    },
    {
      label: 'Numbered list',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList'),
    },
    {
      label: 'Undo',
      action: () => editor.chain().focus().undo().run(),
      active: false,
    },
    {
      label: 'Redo',
      action: () => editor.chain().focus().redo().run(),
      active: false,
    },
  ];

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
      {buttons.map((button) => (
        <button
          key={button.label}
          type="button"
          title={button.label}
          aria-label={button.label}
          aria-pressed={button.active}
          className={button.active ? 'toolbar-button active' : 'toolbar-button'}
          onMouseDown={(event) => event.preventDefault()}
          onClick={button.action}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}
