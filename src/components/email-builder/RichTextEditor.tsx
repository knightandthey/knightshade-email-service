"use client";
import React, { useRef, useCallback, useEffect, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Enter text...",
  className = "",
  style = {}
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);

  // Convert plain text to HTML with preserved formatting
  const textToHtml = useCallback((text: string) => {
    if (!text) return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      .replace(/<p><\/p>/g, '<p><br></p>');
  }, []);

  // Convert HTML back to plain text but preserve basic formatting
  const htmlToText = useCallback((html: string) => {
    if (!html) return '';
    
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p><p>/gi, '\n\n')
      .replace(/<p>/gi, '')
      .replace(/<\/p>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }, []);

  // Update editor content when value changes externally
  useEffect(() => {
    if (editorRef.current && !isEditing) {
      const html = textToHtml(value);
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
      }
    }
  }, [value, textToHtml, isEditing]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    
    const html = editorRef.current.innerHTML;
    const text = htmlToText(html);
    onChange(text);
  }, [onChange, htmlToText]);

  // Handle paste events to preserve formatting
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    
    const clipboardData = e.clipboardData || (window as any).clipboardData;
    const pastedData = clipboardData.getData('text/plain') || clipboardData.getData('text');
    
    if (!pastedData) return;

    // Process the pasted text to preserve line breaks and basic formatting
    const processedText = pastedData
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')    // Normalize line endings
      .replace(/\t/g, '    ')  // Convert tabs to spaces
      .trim();

    // Insert the processed text
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      // Create text nodes with line breaks preserved
      const lines = processedText.split('\n');
      lines.forEach((line, index) => {
        if (index > 0) {
          range.insertNode(document.createElement('br'));
        }
        if (line.trim()) {
          range.insertNode(document.createTextNode(line));
        }
      });
      
      // Move cursor to end
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Fallback: append to end
      if (editorRef.current) {
        const lines = processedText.split('\n');
        lines.forEach((line, index) => {
          if (index > 0) {
            editorRef.current!.appendChild(document.createElement('br'));
          }
          if (line.trim()) {
            editorRef.current!.appendChild(document.createTextNode(line));
          }
        });
      }
    }

    handleInput();
  }, [handleInput]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle Enter key to create proper line breaks
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter creates a line break
        e.preventDefault();
        document.execCommand('insertHTML', false, '<br>');
        handleInput();
      }
      // Regular Enter will create a new paragraph (default behavior)
    }

    // Handle common formatting shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold', false);
          handleInput();
          break;
        case 'i':
          e.preventDefault();
          document.execCommand('italic', false);
          handleInput();
          break;
        case 'u':
          e.preventDefault();
          document.execCommand('underline', false);
          handleInput();
          break;
      }
    }
  }, [handleInput]);

  // Formatting functions
  const formatText = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  return (
    <div className="relative">
      {showToolbar && (
        <div className="absolute -top-12 left-0 bg-white border border-gray-200 rounded-md shadow-lg p-2 flex space-x-2 z-10">
          <button
            type="button"
            onClick={() => formatText('bold')}
            className="px-2 py-1 text-sm font-bold border rounded hover:bg-gray-100"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => formatText('italic')}
            className="px-2 py-1 text-sm italic border rounded hover:bg-gray-100"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => formatText('underline')}
            className="px-2 py-1 text-sm underline border rounded hover:bg-gray-100"
          >
            U
          </button>
          <button
            type="button"
            onClick={() => formatText('insertUnorderedList')}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-100"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => formatText('insertOrderedList')}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-100"
          >
            1.
          </button>
        </div>
      )}
      
      <div
        ref={editorRef}
        contentEditable
        className={`min-h-[2.5rem] p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none whitespace-pre-wrap ${className}`}
        style={style}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setIsEditing(true);
          setShowToolbar(true);
        }}
        onBlur={() => {
          setIsEditing(false);
          setShowToolbar(false);
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      
      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] {
          word-wrap: break-word;
          white-space: pre-wrap;
        }
        [contenteditable] p {
          margin: 0;
          padding: 0;
        }
        [contenteditable] br {
          display: block;
          content: "";
          margin-top: 0;
        }
      `}</style>
    </div>
  );
}
