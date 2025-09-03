"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import Editor from "@monaco-editor/react";
import VisualEmailBuilder from "@/components/email-builder/VisualEmailBuilder";

// Types and schemas
type TemplateMeta = {
  id: string;
  name: string;
  description?: string;
  variables: Record<string, string>;
};

type CustomTemplate = {
  id: string;
  name: string;
  type: string;
  content: string;
  variables?: Record<string, unknown>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

type CompositionMode = "visual" | "template" | "html" | "react" | "css" | "javascript" | "plaintext";

// Accepts either a plain email or RFC5322 display-name format: "Name <email@domain>"
const isPlainEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isDisplayNameAddress = (value: string) => {
  const v = value.trim();
  // Basic permissive check; not full RFC5322 but covers common cases
  return /^([^<>"\\]+|"[^"]+")\s*<[^<>@\s]+@[^<>@\s]+>$/.test(v);
};

const schema = z.object({
  to: z.string().email(),
  cc: z.string().email().optional().or(z.literal("")),
  bcc: z.string().email().optional().or(z.literal("")),
  from: z
    .string()
    .refine((val) => val === "" || isPlainEmail(val) || isDisplayNameAddress(val), {
      message: "Enter an email or \"Name <email@domain>\"",
    })
    .optional()
    .or(z.literal("")),
  subject: z.string().min(1),
  content: z.string().min(1),
  mode: z.enum(["visual", "template", "html", "react", "css", "javascript", "plaintext"]),
  templateId: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.string(),
        type: z.string().optional(),
      })
    )
    .optional(),
});

type FormValues = z.output<typeof schema>;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Email Template</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Hello World!</h1>
    <p>This is your custom email template.</p>
  </div>
</body>
</html>`;

const DEFAULT_REACT = `import React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Text,
  Heading,
  Section,
} from '@react-email/components';

interface EmailProps {
  recipientName?: string;
}

export default function CustomEmail({ recipientName = 'User' }: EmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Custom React Email</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Section>
            <Heading style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
              Hello, {recipientName}!
            </Heading>
            <Text style={{ fontSize: '16px', lineHeight: '1.6' }}>
              This is a custom React email template. You can use all the power of 
              React components to create dynamic, reusable email templates.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}`;

const DEFAULT_CSS = `/* Email-safe CSS styles */
body {
  font-family: Arial, Helvetica, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f4f4f4;
}

.email-container {
  max-width: 600px;
  margin: 20px auto;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header {
  background-color: #2563eb;
  color: white;
  padding: 20px;
  text-align: center;
  border-radius: 8px 8px 0 0;
}

.content {
  padding: 30px 20px;
}

.button {
  display: inline-block;
  background-color: #2563eb;
  color: white;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 4px;
  margin: 16px 0;
}

.footer {
  background-color: #f8f9fa;
  padding: 20px;
  text-align: center;
  font-size: 14px;
  color: #6b7280;
  border-radius: 0 0 8px 8px;
}`;

const DEFAULT_JAVASCRIPT = `// Email template logic
function generatePersonalizedContent(userData) {
  const { name, preferences, lastActivity } = userData;
  
  // Calculate days since last activity
  const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
  
  // Personalize message based on activity
  let message = \`Hello \${name},\`;
  
  if (daysSinceActivity < 7) {
    message += ' Thanks for being an active user!';
  } else if (daysSinceActivity < 30) {
    message += ' We miss you! Check out what\\'s new.';
  } else {
    message += ' Welcome back! A lot has changed since your last visit.';
  }
  
  return {
    greeting: message,
    recommendations: getRecommendations(preferences),
    ctaText: daysSinceActivity < 7 ? 'Continue' : 'Explore Now'
  };
}

function getRecommendations(preferences) {
  // Mock recommendation logic
  return preferences.map(pref => \`New content in \${pref}\`);
}

// Export for use in template
if (typeof module !== 'undefined') {
  module.exports = { generatePersonalizedContent, getRecommendations };
}`;

export default function ComposePage() {
  // State management
  const [mode, setMode] = useState<CompositionMode>("visual");
  const [content, setContent] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  
  // SWR for templates
  const { data: templates }: { data?: TemplateMeta[] } = useSWR(
    "/api/templates",
    fetcher
  );
  const { data: customTemplates, mutate: mutateCustomTemplates } = useSWR(
    "/api/templates/custom",
    fetcher
  );

  // Form management
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      from: process.env.NEXT_PUBLIC_DEFAULT_FROM,
      mode: "visual",
      content: "",
      variables: {},
    },
  });

  // Initialize default content based on mode
  useEffect(() => {
    let defaultContent = "";
    switch (mode) {
      case "visual":
        defaultContent = ""; // Visual mode starts empty
        break;
      case "html":
        defaultContent = DEFAULT_HTML;
        break;
      case "react":
        defaultContent = DEFAULT_REACT;
        break;
      case "css":
        defaultContent = DEFAULT_CSS;
        break;
      case "javascript":
        defaultContent = DEFAULT_JAVASCRIPT;
        break;
      case "plaintext":
        defaultContent = "Hello!\n\nThis is a plain text email.\n\nBest regards,\nYour Team";
        break;
      default:
        defaultContent = "";
    }
    
    if (content === "" && defaultContent !== "") {
      setContent(defaultContent);
      setValue("content", defaultContent);
    }
  }, [mode, content, setValue]);

  // Update mode in form when changed
  useEffect(() => {
    setValue("mode", mode);
  }, [mode, setValue]);

  // Template selection logic
  const selectedTemplateData = useMemo(
    () => templates?.find((t) => t.id === selectedTemplate),
    [templates, selectedTemplate]
  );

  const variables = watch("variables");

  // Preview update logic
  useEffect(() => {
    async function updatePreview() {
      if (mode === "visual") {
        // For visual mode, preview is handled by the VisualEmailBuilder component
        return;
      } else if (mode === "template" && selectedTemplateData) {
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: selectedTemplateData.id,
            variables,
          }),
        });
        const html = await res.text();
        setPreviewHtml(html);
      } else if (mode === "html") {
        setPreviewHtml(content);
      } else if (mode === "react") {
        // For React mode, we'll need to compile and render
        try {
          const res = await fetch("/api/compile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: content,
              type: "react",
            }),
          });
          const html = await res.text();
          setPreviewHtml(html);
        } catch (error) {
          setPreviewHtml(`<div style="color: red; padding: 20px;">Error compiling React code: ${error}</div>`);
        }
      } else if (mode === "plaintext") {
        const htmlContent = content.replace(/\n/g, '<br>');
        setPreviewHtml(`<div style="font-family: monospace; white-space: pre-wrap; padding: 20px;">${htmlContent}</div>`);
      } else {
        setPreviewHtml(`<div style="padding: 20px;"><pre><code>${content}</code></pre></div>`);
      }
    }
    updatePreview();
  }, [mode, content, selectedTemplateData, variables]);

  // File upload handler
  const onDrop = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list: Array<{ filename: string; content: string; type?: string }> = [];
    for (const file of Array.from(files)) {
      const buffer = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...Array.from(chunk));
      }
      const base64 = btoa(binary);
      list.push({ filename: file.name, content: base64, type: file.type });
    }
    setValue("attachments", list);
  }, [setValue]);

  // Template saving
  const [isTemplateSaveMode, setIsTemplateSaveMode] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  async function saveAsTemplate() {
    if (!templateName || mode === "template" || mode === "visual") return;

    try {
      const response = await fetch("/api/templates/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          type: mode,
          content: content,
          variables: {}, // TODO: Parse variables from content
        }),
      });

      if (response.ok) {
        setIsTemplateSaveMode(false);
        setTemplateName("");
        setTemplateDescription("");
        mutateCustomTemplates(); // Refresh custom templates
        alert("Template saved successfully!");
      } else {
        alert("Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      alert("Error saving template");
    }
  }

  // Load custom template
  async function loadCustomTemplate(templateId: string) {
    const template = customTemplates?.find((t: CustomTemplate) => t.id === templateId);
    if (template) {
      setMode(template.type);
      setContent(template.content);
      setValue("content", template.content);
    }
  }

  // Form submission
  async function onSubmit(values: FormValues) {
    let endpoint = "/api/send-custom";
    
    if (mode === "template") {
      endpoint = "/api/send";
      if (selectedTemplate) {
        (values as FormValues & { templateId: string }).templateId = selectedTemplate;
      }
    } else if (mode === "visual") {
      // For visual mode, treat as React compilation
      endpoint = "/api/send-custom";
      (values as FormValues & { mode: string }).mode = "html"; // Send the HTML generated by the visual builder
    }
    
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        // Close the email form modal if in visual mode
        if (mode === "visual") {
          setShowEmailForm(false);
        }
        alert("Email sent successfully!");
      } else {
        alert("Failed to send email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Error sending email");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Advanced Email Composer</h1>
          
          {/* Mode selector and template actions */}
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              {[
                { key: "visual", label: "Visual", icon: "🎨" },
                { key: "template", label: "Template", icon: "📧" },
                { key: "html", label: "HTML", icon: "🌐" },
                { key: "react", label: "React", icon: "⚛️" },
                { key: "css", label: "CSS", icon: "🖌️" },
                { key: "javascript", label: "JS", icon: "📜" },
                { key: "plaintext", label: "Text", icon: "📝" },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setMode(key as CompositionMode)}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1 ${
                    mode === key
                      ? "bg-blue-100 text-blue-700 border border-blue-300"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            
            {/* Template actions */}
            {mode === "visual" && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowEmailForm(true)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  📧 Send Email
                </button>
              </div>
            )}
            {mode !== "template" && mode !== "visual" && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsTemplateSaveMode(true)}
                  className="px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                >
                  💾 Save Template
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto p-6">
        {mode === "visual" ? (
          /* Visual Email Builder - Full Width */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            <VisualEmailBuilder
              onEmailChange={(html) => {
                setContent(html);
                setValue("content", html);
                setPreviewHtml(html);
              }}
            />
          </div>
        ) : (
          <Allotment defaultSizes={[40, 60]}>
            {/* Left Panel - Form and Editor */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mr-3">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email headers */}
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2">
                  <span className="block text-sm font-medium text-gray-700 mb-1">To</span>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    {...register("to")}
                  />
                  {errors.to && (
                    <p className="text-red-600 text-sm mt-1">{String(errors.to.message)}</p>
                  )}
                </label>
                <label>
                  <span className="block text-sm font-medium text-gray-700 mb-1">CC</span>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    {...register("cc")}
                  />
                </label>
                <label>
                  <span className="block text-sm font-medium text-gray-700 mb-1">BCC</span>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    {...register("bcc")}
                  />
                </label>
                <label className="col-span-2">
                  <span className="block text-sm font-medium text-gray-700 mb-1">From</span>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    {...register("from")}
                  />
                  {errors.from && (
                    <p className="text-red-600 text-sm mt-1">{String(errors.from.message)}</p>
                  )}
                </label>
                <label className="col-span-2">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Subject</span>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    {...register("subject")}
                  />
                  {errors.subject && (
                    <p className="text-red-600 text-sm mt-1">{String(errors.subject.message)}</p>
                  )}
                </label>
              </div>

              {/* Template selector for template mode */}
              {mode === "template" && (
                <>
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-1">Built-in Templates</span>
                    <select
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                    >
                      <option value="">Select a template</option>
                      {templates?.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Built-in template variables */}
                  {selectedTemplateData && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Template Variables</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.keys(selectedTemplateData.variables).map((key) => (
                          <label key={key} className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700 mb-1">{key}</span>
                            <input
                              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={variables?.[key] || ""}
                              onChange={(e) =>
                                setValue("variables", { ...variables, [key]: e.target.value })
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Custom template selector for non-template modes */}
              {mode !== "template" && customTemplates && customTemplates.length > 0 && (
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-1">Load Custom Template</span>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value=""
                    onChange={(e) => e.target.value && loadCustomTemplate(e.target.value)}
                  >
                    <option value="">Select a custom template to load</option>
                    {customTemplates
                      .filter((t: CustomTemplate) => t.type === mode)
                      .map((t: CustomTemplate) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Code Editor for non-template modes */}
              {mode !== "template" && (
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-1">
                    {mode.toUpperCase()} Content
                  </span>
                  <div className="border border-gray-300 rounded-md overflow-hidden">
                    <Editor
                      height="400px"
                      language={
                        mode === "html" ? "html" :
                        mode === "react" ? "typescript" :
                        mode === "css" ? "css" :
                        mode === "javascript" ? "javascript" :
                        "plaintext"
                      }
                      value={content}
                      onChange={(value) => {
                        setContent(value || "");
                        setValue("content", value || "");
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        roundedSelection: false,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-1">Attachments</span>
                <input
                  type="file"
                  multiple
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => onDrop(e.target.files)}
                />
                <p className="text-xs text-gray-500 mt-1">Files will be base64-encoded and sent via Resend.</p>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Email"}
              </button>
            </form>
          </div>

          {/* Right Panel - Preview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 ml-3">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Live Preview</h2>
              
              {/* Preview mode toggle */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setPreviewMode("desktop")}
                  className={`px-3 py-1 rounded text-sm ${
                    previewMode === "desktop"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  🖥️ Desktop
                </button>
                <button
                  onClick={() => setPreviewMode("mobile")}
                  className={`px-3 py-1 rounded text-sm ${
                    previewMode === "mobile"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  📱 Mobile
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div
                className={`mx-auto bg-white border border-gray-200 rounded-lg overflow-hidden ${
                  previewMode === "mobile" ? "max-w-sm" : "w-full"
                }`}
                style={{ minHeight: "500px" }}
              >
                {previewHtml ? (
                  <iframe
                    title="Email Preview"
                    className="w-full h-full min-h-[500px]"
                    srcDoc={previewHtml}
                    style={{ border: "none" }}
                  />
                ) : (
                  <div className="p-6 text-gray-500 text-center">
                    {mode === "template" ? "Select a template to preview." : "Start writing to see preview."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Allotment>
        )}
      </div>

      {/* Template Save Modal */}
      {isTemplateSaveMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save as Template</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter template name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium">Type:</span>
                <span className="ml-2 bg-gray-100 px-2 py-1 rounded">{mode.toUpperCase()}</span>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={saveAsTemplate}
                disabled={!templateName.trim()}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Template
              </button>
              <button
                onClick={() => {
                  setIsTemplateSaveMode(false);
                  setTemplateName("");
                  setTemplateDescription("");
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Send Modal for Visual Mode */}
      {showEmailForm && mode === "visual" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Email</h3>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email headers */}
              <div className="space-y-3">
                <label>
                  <span className="block text-sm font-medium text-gray-700 mb-1">To *</span>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    {...register("to")}
                  />
                  {errors.to && (
                    <p className="text-red-600 text-sm mt-1">{String(errors.to.message)}</p>
                  )}
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="block text-sm font-medium text-gray-700 mb-1">CC</span>
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      {...register("cc")}
                    />
                  </label>
                  <label>
                    <span className="block text-sm font-medium text-gray-700 mb-1">BCC</span>
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      {...register("bcc")}
                    />
                  </label>
                </div>
                
                <label>
                  <span className="block text-sm font-medium text-gray-700 mb-1">From</span>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    {...register("from")}
                  />
                  {errors.from && (
                    <p className="text-red-600 text-sm mt-1">{String(errors.from.message)}</p>
                  )}
                </label>
                
                <label>
                  <span className="block text-sm font-medium text-gray-700 mb-1">Subject *</span>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    {...register("subject")}
                  />
                  {errors.subject && (
                    <p className="text-red-600 text-sm mt-1">{String(errors.subject.message)}</p>
                  )}
                </label>

                {/* Attachments */}
                <label>
                  <span className="block text-sm font-medium text-gray-700 mb-1">Attachments</span>
                  <input
                    type="file"
                    multiple
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onChange={(e) => onDrop(e.target.files)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Files will be base64-encoded and sent via Resend.</p>
                </label>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSubmitting ? "Sending..." : "Send Email"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
