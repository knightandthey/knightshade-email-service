"use client";
import React, { useState, useCallback, useRef } from 'react';
// DnD Kit imports removed - not currently used but may be needed later
import { ChromePicker } from 'react-color';
import RichTextEditor from './RichTextEditor';

import { 
  EMAIL_COMPONENTS, 
  TEMPLATE_BLOCKS, 
  COMPONENT_CATEGORIES, 
  ComponentDefinition,
  ComponentProperty 
} from '@/lib/email-builder/components';

// Types for email builder
export interface EmailElement {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: EmailElement[];
}

interface VisualEmailBuilderProps {
  onEmailChange: (html: string) => void;
  initialContent?: string;
}

// Component Palette - shows available components to drag
function ComponentPalette({ components }: { components: ComponentDefinition[] }) {
  const [activeCategory, setActiveCategory] = useState('templates');
  
  const filteredComponents = components.filter(
    comp => comp.category.toLowerCase() === activeCategory
  );

  return (
    <div className="w-80 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Components</h3>
      </div>
      
      {/* Category tabs */}
      <div className="border-b border-gray-200">
        <div className="flex flex-wrap gap-1 p-2">
          {COMPONENT_CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-3 py-1 text-sm rounded-md font-medium ${
                activeCategory === category.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Component list */}
      <div className="p-4 space-y-3">
        {filteredComponents.map(component => (
          <DraggableComponent key={component.id} component={component} />
        ))}
      </div>
    </div>
  );
}

// Draggable component from palette
function DraggableComponent({ component }: { component: ComponentDefinition }) {
  return (
    <div
      className="p-3 bg-gray-50 rounded-lg cursor-grab hover:bg-gray-100 border border-gray-200"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify(component));
      }}
    >
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{component.icon}</span>
        <div>
          <div className="font-medium text-gray-900">{component.name}</div>
          <div className="text-sm text-gray-600">{component.description}</div>
        </div>
      </div>
    </div>
  );
}

// Email canvas where components are dropped and arranged
function EmailCanvas({ 
  elements, 
  onElementsChange, 
  selectedElement, 
  onSelectElement 
}: {
  elements: EmailElement[];
  onElementsChange: (elements: EmailElement[]) => void;
  selectedElement: EmailElement | null;
  onSelectElement: (element: EmailElement | null) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      const componentData = JSON.parse(e.dataTransfer.getData('application/json'));
      const newElement: EmailElement = {
        id: `${componentData.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        type: componentData.id,
        props: { ...componentData.defaultProps },
        children: componentData.defaultProps.children || undefined
      };
      
      onElementsChange([...elements, newElement]);
    } catch (error) {
      console.error('Failed to parse dropped component:', error);
    }
  }, [elements, onElementsChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleElementClick = useCallback((element: EmailElement) => {
    onSelectElement(element);
  }, [onSelectElement]);

  const handleDeleteElement = useCallback((elementId: string) => {
    const filterElements = (elements: EmailElement[]): EmailElement[] => {
      return elements
        .filter(el => el.id !== elementId)
        .map(el => ({
          ...el,
          children: el.children ? filterElements(el.children) : undefined
        }));
    };
    onElementsChange(filterElements(elements));
    onSelectElement(null);
  }, [elements, onElementsChange, onSelectElement]);

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="p-6">
        <div 
          ref={canvasRef}
          className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm min-h-[600px] p-6"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {elements.length === 0 ? (
            <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <span className="text-4xl">📧</span>
                <p className="mt-2 text-gray-600">Drag components here to start building your email</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {elements.map((element) => (
                <EmailElementRenderer
                  key={element.id}
                  element={element}
                  isSelected={selectedElement?.id === element.id}
                  onSelect={() => handleElementClick(element)}
                  onDelete={() => handleDeleteElement(element.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Renders individual email elements in the canvas
function EmailElementRenderer({
  element,
  isSelected,
  onSelect,
  onDelete
}: {
  element: EmailElement;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  // Helper function to convert text with line breaks to JSX
  const escapeHtml = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const mdInlineToHtml = (raw: string) => {
    if (!raw) return '';
    const escapeHtml = (s: string) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const lines = raw.split('\n');
    const toInline = (s: string) => {
      let t = escapeHtml(s);
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/__([^_]+)__/g, '<strong>$1</strong>');
      t = t.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
      t = t.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
      return t;
    };
    const headingSize = (level: number) => {
      const sizes = [32, 28, 24, 20, 18, 16];
      return sizes[Math.min(Math.max(level, 1), 6) - 1];
    };

    const blocks: string[] = [];
    let listOpen: null | 'ul' | 'ol' = null;

    const closeList = () => {
      if (listOpen) {
        blocks.push(`</${listOpen}>`);
        listOpen = null;
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        closeList();
        continue;
      }
      const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        closeList();
        const lvl = h[1].length;
        blocks.push(`<h${lvl} style="margin:8px 0;font-size:${headingSize(lvl)}px;font-weight:700;">${toInline(h[2])}</h${lvl}>`);
        continue;
      }
      const ol = trimmed.match(/^\d+\.\s+(.*)$/);
      if (ol) {
        if (listOpen && listOpen !== 'ol') closeList();
        if (!listOpen) { listOpen = 'ol'; blocks.push('<ol style="margin:8px 0 8px 20px;">'); }
        blocks.push(`<li>${toInline(ol[1])}</li>`);
        continue;
      }
      const ul = trimmed.match(/^[-*]\s+(.*)$/);
      if (ul) {
        if (listOpen && listOpen !== 'ul') closeList();
        if (!listOpen) { listOpen = 'ul'; blocks.push('<ul style="margin:8px 0 8px 20px;">'); }
        blocks.push(`<li>${toInline(ul[1])}</li>`);
        continue;
      }
      // paragraph
      closeList();
      blocks.push(`<p style="margin:8px 0;">${toInline(trimmed)}</p>`);
    }
    closeList();

    return blocks.join('');
  };

  const renderElement = () => {
    const { type, props } = element;
    
    switch (type) {
      case 'heading':
        return (
          <div 
            style={{ 
              fontSize: (props as any).fontSize || 32, 
              fontWeight: 'bold', 
              color: (props as any).color || '#111827',
              textAlign: (props as any).textAlign || 'left',
              whiteSpace: 'normal'
            }}
            dangerouslySetInnerHTML={{ __html: mdInlineToHtml(String((props as any).children || 'Heading')) }}
          />
        );
        
      case 'text':
        return (
          <div 
            style={{ 
              fontSize: (props as any).fontSize || 16, 
              color: (props as any).color || '#374151',
              lineHeight: `${(props as any).lineHeight || 24}px`,
              textAlign: (props as any).textAlign || 'left',
              whiteSpace: 'normal'
            }}
            dangerouslySetInnerHTML={{ __html: mdInlineToHtml(String((props as any).children || 'Text content')) }}
          />
        );
        
      case 'button':
        return (
          <div 
            style={{ 
              display: 'inline-block',
              backgroundColor: (props as any).backgroundColor || '#4f46e5',
              color: (props as any).textColor || '#ffffff',
              padding: (props as any).padding || '12px 24px',
              borderRadius: `${(props as any).borderRadius || 8}px`,
              fontSize: (props as any).fontSize || 16,
              fontWeight: 'bold',
              cursor: 'pointer',
              textAlign: 'center',
              whiteSpace: 'pre-wrap'
            }}
          >
            {mdInlineToHtml((props as any).children || 'Button')}
          </div>
        );
        
      case 'image':
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={(props as any).src || 'https://via.placeholder.com/600x300'}
            alt={(props as any).alt || 'Image'}
            style={{ 
              width: (props as any).width || '100%',
              height: 'auto',
              borderRadius: `${(props as any).borderRadius || 12}px`,
              objectFit: 'cover'
            }}
          />
        );
        
      case 'hr':
        return (
          <hr 
            style={{ 
              borderColor: (props as any).color || '#d1d5db',
              borderWidth: `${(props as any).thickness || 1}px`,
              marginTop: `${(props as any).marginTop || 16}px`,
              marginBottom: `${(props as any).marginBottom || 16}px`
            }} 
          />
        );
        
      case 'hero_section':
        return (
          <div 
            style={{ 
              backgroundColor: (props as any).backgroundColor || '#f8fafc',
              padding: '48px 24px',
              textAlign: 'center',
              borderRadius: '8px'
            }}
          >
            <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
              {mdInlineToHtml((props as any).title || 'Welcome')}
            </h1>
            <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '32px', whiteSpace: 'pre-wrap' }}>
              {mdInlineToHtml((props as any).subtitle || 'Get started with our service')}
            </p>
            <div 
              style={{ 
                display: 'inline-block',
                backgroundColor: '#4f46e5',
                color: 'white',
                padding: '16px 32px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {mdInlineToHtml((props as any).buttonText || 'Get Started')}
            </div>
          </div>
        );

      case 'pricing_card':
        return (
          <div style={{ 
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '28px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#4f46e5', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
              {mdInlineToHtml((props as any).title || 'Premium Plan')}
            </div>
            <div style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
              {mdInlineToHtml((props as any).price || '$29')} <span style={{ fontSize: '16px', fontWeight: 'normal' }}>{mdInlineToHtml((props as any).period || '/month')}</span>
            </div>
            <div style={{ 
              backgroundColor: '#4f46e5',
              color: 'white',
              padding: '14px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              {mdInlineToHtml((props as any).buttonText || 'Choose Plan')}
            </div>
          </div>
        );
        
      default:
        return <div>Unknown component: {type}</div>;
    }
  };

  return (
    <div 
      className={`relative group ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onSelect}
    >
      {renderElement()}
      
      {/* Selection overlay */}
      {isSelected && (
        <div className="absolute top-0 right-0 -mt-2 -mr-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Hover overlay */}
      <div className={`absolute inset-0 pointer-events-none ${isSelected ? 'bg-blue-500/10' : 'group-hover:bg-gray-500/10'}`} />
    </div>
  );
}

// Property editor panel for selected elements
function PropertyEditor({ 
  element, 
  onUpdateElement 
}: { 
  element: EmailElement | null; 
  onUpdateElement: (elementId: string, newProps: Record<string, unknown>) => void;
}) {
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  
  if (!element) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <div className="text-center text-gray-500">
          <span className="text-2xl">🎨</span>
          <p className="mt-2">Select an element to edit its properties</p>
        </div>
      </div>
    );
  }

  const componentDef = [...EMAIL_COMPONENTS, ...TEMPLATE_BLOCKS].find(c => c.id === element.type);
  if (!componentDef) return null;

  const handlePropertyChange = (propertyName: string, value: unknown) => {
    onUpdateElement(element.id, { ...element.props, [propertyName]: value });
  };

  const renderPropertyInput = (prop: ComponentProperty) => {
    const currentValue = element.props[prop.name] ?? prop.default;

    switch (prop.type) {
      case 'text':
        // Use rich text editor for content properties
        if (prop.name === 'children' || prop.name === 'content') {
          return (
            <RichTextEditor
              value={currentValue}
              onChange={(value) => handlePropertyChange(prop.name, value)}
              placeholder={`Enter ${prop.label.toLowerCase()}...`}
              className="w-full"
            />
          );
        }
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handlePropertyChange(prop.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );
        
      case 'textarea':
        return (
          <RichTextEditor
            value={currentValue}
            onChange={(value) => handlePropertyChange(prop.name, value)}
            placeholder={`Enter ${prop.label.toLowerCase()}...`}
            className="w-full min-h-[100px]"
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) => handlePropertyChange(prop.name, Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );
        
      case 'color':
        return (
          <div className="relative">
            <div
              onClick={() => setColorPickerOpen(colorPickerOpen === prop.name ? null : prop.name)}
              className="w-full h-10 border border-gray-300 rounded-md cursor-pointer flex items-center px-3"
              style={{ backgroundColor: currentValue }}
            >
              <span className="text-sm font-medium text-white drop-shadow-sm">
                {currentValue}
              </span>
            </div>
            {colorPickerOpen === prop.name && (
              <div className="absolute z-50 mt-1">
                <div
                  className="fixed inset-0"
                  onClick={() => setColorPickerOpen(null)}
                />
                <ChromePicker
                  color={currentValue}
                  onChange={(color) => handlePropertyChange(prop.name, color.hex)}
                />
              </div>
            )}
          </div>
        );
        
      case 'select':
        return (
          <select
            value={currentValue}
            onChange={(e) => handlePropertyChange(prop.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {prop.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
        
      case 'url':
        return (
          <input
            type="url"
            value={currentValue}
            onChange={(e) => handlePropertyChange(prop.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://example.com"
          />
        );
        
      case 'spacing':
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handlePropertyChange(prop.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 12px 24px"
          />
        );
        
      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={currentValue}
              onChange={(e) => handlePropertyChange(prop.name, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enabled</span>
          </label>
        );
        
      default:
        return <div>Unknown property type: {prop.type}</div>;
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Properties</h3>
        <p className="text-sm text-gray-600">{componentDef.name}</p>
      </div>
      
      <div className="p-4 space-y-4">
        {componentDef.editableProps.map((prop) => (
          <div key={prop.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {prop.label}
            </label>
            {renderPropertyInput(prop)}
            {prop.description && (
              <p className="text-xs text-gray-500 mt-1">{prop.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Visual Email Builder Component
export default function VisualEmailBuilder({ onEmailChange }: Omit<VisualEmailBuilderProps, 'initialContent'>) {
  const [elements, setElements] = useState<EmailElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<EmailElement | null>(null);

  const generateEmailHTML = useCallback((elements: EmailElement[]) => {
    // Generate actual HTML instead of React code
    const escapeHtml = (s: string) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const mdInlineToHtml = (raw: string) => {
      if (!raw) return '';
      const lines = raw.split('\n');
      const toInline = (s: string) => {
        let t = escapeHtml(s);
        t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        t = t.replace(/__([^_]+)__/g, '<strong>$1</strong>');
        t = t.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        t = t.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
        return t;
      };
      const headingSize = (level: number) => {
        const sizes = [32, 28, 24, 20, 18, 16];
        return sizes[Math.min(Math.max(level, 1), 6) - 1];
      };
      return lines
        .map((line) => {
          const m = line.match(/^(#{1,6})\s+(.*)$/);
          if (m) {
            const lvl = m[1].length;
            const content = toInline(m[2]);
            return `<span style="display:block; font-weight:700; font-size:${headingSize(lvl)}px; margin: 8px 0;">${content}</span>`;
          }
          const bullet = line.match(/^\s*[-*]\s+(.*)$/);
          if (bullet) {
            return `<span style="display:block;">• ${toInline(bullet[1])}</span>`;
          }
          return `<span>${toInline(line)}</span>`;
        })
        .join('<br>');
    };
    const componentsHTML = elements.map(element => {
      const componentDef = [...EMAIL_COMPONENTS, ...TEMPLATE_BLOCKS].find(c => c.id === element.type);
      if (!componentDef) return '';

      // Convert React-style template to HTML
      let htmlTemplate = componentDef.template;
      
      // First, replace template variables with actual values
      Object.entries(element.props).forEach(([key, value]) => {
        let processedValue = String(value);
        
        // Convert Markdown to inline HTML for text-bearing props
        if (key === 'children' || key === 'content' || key === 'title' || key === 'subtitle' || key === 'description') {
          processedValue = mdInlineToHtml(processedValue);
        } else {
          processedValue = escapeHtml(processedValue);
        }
        
        const regex = new RegExp(`{${key}}`, 'g');
        htmlTemplate = htmlTemplate.replace(regex, processedValue);
      });

      // Then convert React Email components to HTML with proper style handling
      htmlTemplate = htmlTemplate
        // Handle Heading with dynamic styles
        .replace(/<Heading[^>]*style=\{([^}]+)\}[^>]*>/g, (match, styleObj) => {
          // Extract styles from React object notation
          const styles = styleObj
            .replace(/[{}]/g, '')
            .split(',')
            .map((s: string) => {
              const [key, value] = s.split(':').map((part: string) => part.trim().replace(/['"]/g, ''));
              const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
              return `${cssKey}: ${value}`;
            })
            .join('; ');
          return `<h2 style="${styles}">`;
        })
        .replace(/<Heading[^>]*>/g, '<h2 style="margin: 16px 0; font-size: 24px; font-weight: bold;">')
        .replace(/<\/Heading>/g, '</h2>')
        
        // Handle Text with dynamic styles
        .replace(/<Text[^>]*style=\{([^}]+)\}[^>]*>/g, (match, styleObj) => {
          const styles = styleObj
            .replace(/[{}]/g, '')
            .split(',')
            .map((s: string) => {
              const [key, value] = s.split(':').map((part: string) => part.trim().replace(/['"]/g, ''));
              const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
              return `${cssKey}: ${value}`;
            })
            .join('; ');
          return `<p style="${styles}">`;
        })
        .replace(/<Text[^>]*>/g, '<p style="margin: 8px 0; line-height: 1.6;">')
        .replace(/<\/Text>/g, '</p>')
        
        // Handle Button with href and styles
        .replace(/<Button[^>]*href="([^"]*)"[^>]*style=\{([^}]+)\}[^>]*>/g, (match, href, styleObj) => {
          const styles = styleObj
            .replace(/[{}]/g, '')
            .split(',')
            .map((s: string) => {
              const [key, value] = s.split(':').map((part: string) => part.trim().replace(/['"]/g, ''));
              const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
              return `${cssKey}: ${value}`;
            })
            .join('; ');
          return `<a href="${href}" style="display: inline-block; text-decoration: none; ${styles}">`;
        })
        .replace(/<Button[^>]*href="([^"]*)"[^>]*>/g, '<a href="$1" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">')
        .replace(/<\/Button>/g, '</a>')
        
        // Handle other components
        .replace(/<Section[^>]*>/g, '<div style="margin: 16px 0;">')
        .replace(/<\/Section>/g, '</div>')
        .replace(/<Img[^>]*src="([^"]*)"[^>]*>/g, '<img src="$1" style="max-width: 100%; height: auto;" />')
        .replace(/<Hr[^>]*>/g, '<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />')
        .replace(/<Row[^>]*>/g, '<div style="display: table; width: 100%;">')
        .replace(/<\/Row>/g, '</div>')
        .replace(/<Column[^>]*>/g, '<div style="display: table-cell; vertical-align: top; padding: 8px;">')
        .replace(/<\/Column>/g, '</div>');

      return htmlTemplate;
    }).join('\n');

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Custom Email</title>
  <style>
    body { 
      margin: 0; 
      padding: 0; 
      background-color: #ffffff; 
      font-family: Arial, sans-serif; 
      line-height: 1.6;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    a { 
      color: #007bff; 
    }
    img { 
      max-width: 100%; 
      height: auto; 
    }
  </style>
</head>
<body>
  <div class="container">
    ${componentsHTML}
  </div>
</body>
</html>`;

    onEmailChange(fullHTML);
  }, [onEmailChange]);

  const handleElementsChange = useCallback((newElements: EmailElement[]) => {
    setElements(newElements);
    generateEmailHTML(newElements);
  }, [generateEmailHTML]);

  const handleUpdateElement = useCallback((elementId: string, newProps: Record<string, unknown>) => {
    const updatedElements = elements.map(el => 
      el.id === elementId ? { ...el, props: newProps } : el
    );
    setElements(updatedElements);
    
    // Update the selected element as well
    if (selectedElement?.id === elementId) {
      setSelectedElement({ ...selectedElement, props: newProps });
    }
    
    // Regenerate HTML with updated content
    generateEmailHTML(updatedElements);
  }, [selectedElement, elements, generateEmailHTML]);

  return (
    <div className="h-screen flex bg-gray-50">
      <ComponentPalette components={[...EMAIL_COMPONENTS, ...TEMPLATE_BLOCKS]} />
      
      <EmailCanvas
        elements={elements}
        onElementsChange={handleElementsChange}
        selectedElement={selectedElement}
        onSelectElement={setSelectedElement}
      />
      
      <PropertyEditor
        element={selectedElement}
        onUpdateElement={handleUpdateElement}
      />
    </div>
  );
}
