"use client";
import { useState } from 'react';
import RichTextEditor from '@/components/email-builder/RichTextEditor';

export default function RichTextDemo() {
  const [content, setContent] = useState(`Welcome to our service!

This is a multi-line text example.
You can paste formatted content here and it will preserve:

• Line breaks
• Spacing
• Basic formatting

Try pasting some text from another document to see how it maintains the original layout.`);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Rich Text Editor Demo</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Editor */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Rich Text Editor</h2>
            <p className="text-gray-600 mb-4">
              Try pasting text here. It will preserve line breaks and basic formatting.
            </p>
            
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Paste your formatted text here..."
              className="min-h-[300px]"
            />
            
            <div className="mt-4 text-sm text-gray-500">
              <p><strong>Features:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Preserves line breaks when pasting</li>
                <li>Maintains original spacing and layout</li>
                <li>Supports basic formatting (Ctrl+B, Ctrl+I, Ctrl+U)</li>
                <li>Built-in formatting toolbar</li>
                <li>Proper whitespace handling</li>
              </ul>
            </div>
          </div>
          
          {/* Preview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Preview</h2>
            <div className="border border-gray-200 rounded p-4 bg-gray-50 min-h-[300px]">
              <div 
                className="whitespace-pre-wrap text-gray-800"
                style={{ lineHeight: '1.6' }}
              >
                {content.split('\n').map((line, index, array) => (
                  <span key={index}>
                    {line}
                    {index < array.length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              <p><strong>Raw content:</strong></p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(content, null, 2)}
              </pre>
            </div>
          </div>
        </div>
        
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Test Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Copy some formatted text from a word processor, email, or website</li>
            <li>Paste it into the rich text editor above</li>
            <li>Notice how line breaks, spacing, and basic structure is preserved</li>
            <li>Try using keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic), Ctrl+U (underline)</li>
            <li>Click in the editor to see the formatting toolbar</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
