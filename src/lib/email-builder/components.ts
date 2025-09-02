// React Email Component Definitions for Visual Builder
export interface ComponentDefinition {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  defaultProps: Record<string, any>;
  editableProps: ComponentProperty[];
  template: string;
  previewImage?: string;
}

export interface ComponentProperty {
  name: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'boolean' | 'textarea' | 'url' | 'spacing';
  default: any;
  options?: { value: string; label: string }[];
  description?: string;
}

// Pre-built component blocks based on React Email examples
export const EMAIL_COMPONENTS: ComponentDefinition[] = [
  // Text Components
  {
    id: 'heading',
    name: 'Heading',
    category: 'Text',
    icon: '📝',
    description: 'Large heading text',
    defaultProps: {
      children: 'Your Heading Here',
      as: 'h1',
      className: 'text-[32px] font-bold text-gray-900 leading-[40px] mb-[16px]'
    },
    editableProps: [
      { name: 'children', label: 'Text', type: 'text', default: 'Your Heading Here' },
      { name: 'as', label: 'Heading Level', type: 'select', default: 'h1', options: [
        { value: 'h1', label: 'H1' },
        { value: 'h2', label: 'H2' },
        { value: 'h3', label: 'H3' },
        { value: 'h4', label: 'H4' }
      ]},
      { name: 'color', label: 'Text Color', type: 'color', default: '#111827' },
      { name: 'fontSize', label: 'Font Size', type: 'number', default: 32 },
      { name: 'textAlign', label: 'Alignment', type: 'select', default: 'left', options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' }
      ]}
    ],
    template: '<Heading as="{as}" className="{className}" style={{color: "{color}", fontSize: "{fontSize}px", textAlign: "{textAlign}"}}>{children}</Heading>'
  },
  {
    id: 'text',
    name: 'Text',
    category: 'Text',
    icon: '📄',
    description: 'Regular paragraph text',
    defaultProps: {
      children: 'Your paragraph text goes here. This can be multiple sentences describing your content.',
      className: 'text-[16px] text-gray-700 leading-[24px]'
    },
    editableProps: [
      { name: 'children', label: 'Text', type: 'textarea', default: 'Your paragraph text goes here.' },
      { name: 'color', label: 'Text Color', type: 'color', default: '#374151' },
      { name: 'fontSize', label: 'Font Size', type: 'number', default: 16 },
      { name: 'lineHeight', label: 'Line Height', type: 'number', default: 24 },
      { name: 'textAlign', label: 'Alignment', type: 'select', default: 'left', options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' }
      ]}
    ],
    template: '<Text className="{className}" style={{color: "{color}", fontSize: "{fontSize}px", lineHeight: "{lineHeight}px", textAlign: "{textAlign}"}}>{children}</Text>'
  },
  
  // Button Components
  {
    id: 'button',
    name: 'Button',
    category: 'Buttons',
    icon: '🔘',
    description: 'Call-to-action button',
    defaultProps: {
      href: 'https://example.com',
      children: 'Click Here',
      className: 'bg-indigo-600 rounded-[8px] text-white text-[16px] font-bold p-[12px_24px] text-center inline-block'
    },
    editableProps: [
      { name: 'children', label: 'Button Text', type: 'text', default: 'Click Here' },
      { name: 'href', label: 'URL', type: 'url', default: 'https://example.com' },
      { name: 'backgroundColor', label: 'Background Color', type: 'color', default: '#4f46e5' },
      { name: 'textColor', label: 'Text Color', type: 'color', default: '#ffffff' },
      { name: 'borderRadius', label: 'Border Radius', type: 'number', default: 8 },
      { name: 'fontSize', label: 'Font Size', type: 'number', default: 16 },
      { name: 'padding', label: 'Padding', type: 'spacing', default: '12px 24px' }
    ],
    template: '<Button href="{href}" className="{className}" style={{backgroundColor: "{backgroundColor}", color: "{textColor}", borderRadius: "{borderRadius}px", fontSize: "{fontSize}px", padding: "{padding}"}}>{children}</Button>'
  },

  // Image Components
  {
    id: 'image',
    name: 'Image',
    category: 'Images',
    icon: '🖼️',
    description: 'Responsive image',
    defaultProps: {
      src: 'https://via.placeholder.com/600x300',
      alt: 'Placeholder image',
      width: 600,
      height: 300,
      className: 'w-full rounded-[12px] object-cover'
    },
    editableProps: [
      { name: 'src', label: 'Image URL', type: 'url', default: 'https://via.placeholder.com/600x300' },
      { name: 'alt', label: 'Alt Text', type: 'text', default: 'Placeholder image' },
      { name: 'width', label: 'Width', type: 'number', default: 600 },
      { name: 'height', label: 'Height', type: 'number', default: 300 },
      { name: 'borderRadius', label: 'Border Radius', type: 'number', default: 12 }
    ],
    template: '<Img src="{src}" alt="{alt}" width={width} height={height} className="{className}" style={{borderRadius: "{borderRadius}px"}} />'
  },

  // Layout Components
  {
    id: 'section',
    name: 'Section',
    category: 'Layout',
    icon: '📦',
    description: 'Container section',
    defaultProps: {
      className: 'my-[16px]',
      children: []
    },
    editableProps: [
      { name: 'backgroundColor', label: 'Background Color', type: 'color', default: 'transparent' },
      { name: 'padding', label: 'Padding', type: 'spacing', default: '16px' },
      { name: 'marginTop', label: 'Top Margin', type: 'number', default: 16 },
      { name: 'marginBottom', label: 'Bottom Margin', type: 'number', default: 16 }
    ],
    template: '<Section className="{className}" style={{backgroundColor: "{backgroundColor}", padding: "{padding}", marginTop: "{marginTop}px", marginBottom: "{marginBottom}px"}}>{children}</Section>'
  },

  {
    id: 'container',
    name: 'Container',
    category: 'Layout',
    icon: '📋',
    description: 'Main email container',
    defaultProps: {
      className: 'bg-white mx-auto max-w-[600px] p-[24px]',
      children: []
    },
    editableProps: [
      { name: 'maxWidth', label: 'Max Width', type: 'number', default: 600 },
      { name: 'backgroundColor', label: 'Background Color', type: 'color', default: '#ffffff' },
      { name: 'padding', label: 'Padding', type: 'spacing', default: '24px' },
      { name: 'borderRadius', label: 'Border Radius', type: 'number', default: 0 }
    ],
    template: '<Container className="{className}" style={{maxWidth: "{maxWidth}px", backgroundColor: "{backgroundColor}", padding: "{padding}", borderRadius: "{borderRadius}px"}}>{children}</Container>'
  },

  {
    id: 'row',
    name: 'Row',
    category: 'Layout',
    icon: '↔️',
    description: 'Horizontal row layout',
    defaultProps: {
      className: '',
      children: []
    },
    editableProps: [
      { name: 'gap', label: 'Gap', type: 'number', default: 0 },
      { name: 'align', label: 'Vertical Align', type: 'select', default: 'top', options: [
        { value: 'top', label: 'Top' },
        { value: 'middle', label: 'Middle' },
        { value: 'bottom', label: 'Bottom' }
      ]}
    ],
    template: '<Row className="{className}" style={{gap: "{gap}px", verticalAlign: "{align}"}}>{children}</Row>'
  },

  {
    id: 'column',
    name: 'Column',
    category: 'Layout',
    icon: '↕️',
    description: 'Column within a row',
    defaultProps: {
      className: 'w-[50%]',
      children: []
    },
    editableProps: [
      { name: 'width', label: 'Width (%)', type: 'number', default: 50 },
      { name: 'padding', label: 'Padding', type: 'spacing', default: '8px' }
    ],
    template: '<Column className="{className}" style={{width: "{width}%", padding: "{padding}"}}>{children}</Column>'
  },

  // Divider
  {
    id: 'hr',
    name: 'Divider',
    category: 'Layout',
    icon: '➖',
    description: 'Horizontal line divider',
    defaultProps: {
      className: 'my-[16px] border-gray-300'
    },
    editableProps: [
      { name: 'color', label: 'Color', type: 'color', default: '#d1d5db' },
      { name: 'thickness', label: 'Thickness', type: 'number', default: 1 },
      { name: 'marginTop', label: 'Top Margin', type: 'number', default: 16 },
      { name: 'marginBottom', label: 'Bottom Margin', type: 'number', default: 16 }
    ],
    template: '<Hr className="{className}" style={{borderColor: "{color}", borderWidth: "{thickness}px", marginTop: "{marginTop}px", marginBottom: "{marginBottom}px"}} />'
  }
];

// Pre-built template blocks
export const TEMPLATE_BLOCKS: ComponentDefinition[] = [
  {
    id: 'hero_section',
    name: 'Hero Section',
    category: 'Templates',
    icon: '🎯',
    description: 'Hero section with heading, text and button',
    defaultProps: {
      title: 'Welcome to Our Service',
      subtitle: 'Get started with our amazing features',
      buttonText: 'Get Started',
      buttonUrl: 'https://example.com',
      backgroundColor: '#f8fafc'
    },
    editableProps: [
      { name: 'title', label: 'Title', type: 'text', default: 'Welcome to Our Service' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea', default: 'Get started with our amazing features' },
      { name: 'buttonText', label: 'Button Text', type: 'text', default: 'Get Started' },
      { name: 'buttonUrl', label: 'Button URL', type: 'url', default: 'https://example.com' },
      { name: 'backgroundColor', label: 'Background Color', type: 'color', default: '#f8fafc' }
    ],
    template: `
<Section style={{backgroundColor: "{backgroundColor}", padding: "48px 24px", textAlign: "center"}}>
  <Heading as="h1" style={{fontSize: "36px", fontWeight: "bold", color: "#111827", marginBottom: "16px"}}>
    {title}
  </Heading>
  <Text style={{fontSize: "18px", color: "#6b7280", marginBottom: "32px", maxWidth: "500px", margin: "0 auto 32px"}}>
    {subtitle}
  </Text>
  <Button href="{buttonUrl}" style={{backgroundColor: "#4f46e5", color: "white", padding: "16px 32px", borderRadius: "8px", fontSize: "16px", fontWeight: "600"}}>
    {buttonText}
  </Button>
</Section>`
  },

  {
    id: 'pricing_card',
    name: 'Pricing Card',
    category: 'Templates',
    icon: '💰',
    description: 'Pricing card with features and CTA',
    defaultProps: {
      title: 'Premium Plan',
      price: '$29',
      period: '/month',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
      buttonText: 'Choose Plan',
      buttonUrl: 'https://example.com'
    },
    editableProps: [
      { name: 'title', label: 'Plan Title', type: 'text', default: 'Premium Plan' },
      { name: 'price', label: 'Price', type: 'text', default: '$29' },
      { name: 'period', label: 'Period', type: 'text', default: '/month' },
      { name: 'buttonText', label: 'Button Text', type: 'text', default: 'Choose Plan' },
      { name: 'buttonUrl', label: 'Button URL', type: 'url', default: 'https://example.com' }
    ],
    template: `
<Section style={{backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "28px", margin: "16px 0"}}>
  <Text style={{color: "#4f46e5", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", marginBottom: "16px"}}>
    {title}
  </Text>
  <Text style={{fontSize: "30px", fontWeight: "bold", color: "#111827", marginBottom: "12px"}}>
    {price} <span style={{fontSize: "16px", fontWeight: "normal"}}>{period}</span>
  </Text>
  <Button href="{buttonUrl}" style={{backgroundColor: "#4f46e5", color: "white", padding: "14px 24px", borderRadius: "8px", fontSize: "16px", fontWeight: "600", width: "100%", textAlign: "center"}}>
    {buttonText}
  </Button>
</Section>`
  },

  {
    id: 'product_showcase',
    name: 'Product Showcase',
    category: 'Templates',
    icon: '🛍️',
    description: 'Product grid with images',
    defaultProps: {
      title: 'Our Products',
      subtitle: 'Elegant Style',
      description: 'We spent two years in development to bring you the next generation of our award-winning products.',
      image1: 'https://via.placeholder.com/300x200',
      image2: 'https://via.placeholder.com/300x200',
      image3: 'https://via.placeholder.com/300x200',
      image4: 'https://via.placeholder.com/300x200'
    },
    editableProps: [
      { name: 'title', label: 'Title', type: 'text', default: 'Our Products' },
      { name: 'subtitle', label: 'Subtitle', type: 'text', default: 'Elegant Style' },
      { name: 'description', label: 'Description', type: 'textarea', default: 'We spent two years in development...' },
      { name: 'image1', label: 'Image 1 URL', type: 'url', default: 'https://via.placeholder.com/300x200' },
      { name: 'image2', label: 'Image 2 URL', type: 'url', default: 'https://via.placeholder.com/300x200' },
      { name: 'image3', label: 'Image 3 URL', type: 'url', default: 'https://via.placeholder.com/300x200' },
      { name: 'image4', label: 'Image 4 URL', type: 'url', default: 'https://via.placeholder.com/300x200' }
    ],
    template: `
<Section style={{margin: "32px 0"}}>
  <Text style={{color: "#4f46e5", fontSize: "16px", fontWeight: "600", marginBottom: "8px"}}>
    {title}
  </Text>
  <Heading as="h2" style={{fontSize: "24px", fontWeight: "600", color: "#111827", marginBottom: "8px"}}>
    {subtitle}
  </Heading>
  <Text style={{fontSize: "16px", color: "#6b7280", marginBottom: "24px"}}>
    {description}
  </Text>
  <Row>
    <Column style={{width: "50%", paddingRight: "8px"}}>
      <Img src="{image1}" alt="Product 1" style={{width: "100%", borderRadius: "12px"}} />
    </Column>
    <Column style={{width: "50%", paddingLeft: "8px"}}>
      <Img src="{image2}" alt="Product 2" style={{width: "100%", borderRadius: "12px"}} />
    </Column>
  </Row>
  <Row style={{marginTop: "16px"}}>
    <Column style={{width: "50%", paddingRight: "8px"}}>
      <Img src="{image3}" alt="Product 3" style={{width: "100%", borderRadius: "12px"}} />
    </Column>
    <Column style={{width: "50%", paddingLeft: "8px"}}>
      <Img src="{image4}" alt="Product 4" style={{width: "100%", borderRadius: "12px"}} />
    </Column>
  </Row>
</Section>`
  }
];

export const ALL_COMPONENTS = [...EMAIL_COMPONENTS, ...TEMPLATE_BLOCKS];

// Component categories for organization
export const COMPONENT_CATEGORIES = [
  { id: 'templates', name: 'Templates', icon: '📋' },
  { id: 'text', name: 'Text', icon: '📝' },
  { id: 'buttons', name: 'Buttons', icon: '🔘' },
  { id: 'images', name: 'Images', icon: '🖼️' },
  { id: 'layout', name: 'Layout', icon: '📦' }
];
