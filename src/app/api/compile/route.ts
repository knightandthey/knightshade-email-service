import { NextRequest, NextResponse } from "next/server";
import * as Babel from "@babel/standalone";
import { render } from "@react-email/render";
import React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Text,
  Heading,
  Section,
  Button,
  Link,
  Hr,
  Img,
  Column,
  Row,
} from "@react-email/components";

// Configure Babel with available presets
const babelConfig = {
  presets: [
    ["react", { "runtime": "classic", "pragma": "React.createElement" }],
    ["typescript"]
  ],
  plugins: [
    ["transform-modules-commonjs"]
  ],
  filename: "email-template.tsx",
};

// Register React Email components globally for compiled code
const reactEmailComponents = {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Text,
  Heading,
  Section,
  Button,
  Link,
  Hr,
  Img,
  Column,
  Row,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, type, variables = {} } = body as {
      code: string;
      type: "react" | "html" | "css" | "javascript";
      variables?: Record<string, unknown>;
    };

    if (type === "html") {
      // For HTML, just return the code as-is
      return new NextResponse(code, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (type === "react") {
      // Compile React/TypeScript code to executable JavaScript
      const compiledCode = Babel.transform(code, babelConfig).code;

      if (!compiledCode) {
        throw new Error("Failed to compile React code");
      }

      // Create a safe execution environment
      const moduleExports: { default?: React.ComponentType<Record<string, unknown>> } = {};
      const require = (moduleName: string) => {
        if (moduleName === "react") return React;
        if (moduleName.startsWith("@react-email/components")) {
          const componentName = moduleName.split("/").pop();
          if (componentName && reactEmailComponents[componentName as keyof typeof reactEmailComponents]) {
            return reactEmailComponents[componentName as keyof typeof reactEmailComponents];
          }
          return reactEmailComponents;
        }
        throw new Error(`Module ${moduleName} is not available in this environment`);
      };

      // Execute the compiled code in a controlled environment
      const execFunction = new Function(
        "React",
        "require",
        "moduleContainer",
        "exports",
        ...Object.keys(reactEmailComponents),
        compiledCode || ""
      );

      const moduleContainer = { exports: moduleExports };
      execFunction(
        React,
        require,
        moduleContainer,
        moduleExports,
        ...Object.values(reactEmailComponents)
      );

      // Get the default export (the React component)
      const EmailComponent = moduleContainer.exports.default || moduleExports.default;
      
      if (!EmailComponent) {
        throw new Error("No default export found in React code. Make sure to export your component as default.");
      }

      // Render the React component to HTML
      const html = await render(React.createElement(EmailComponent, variables));
      
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (type === "css") {
      // For CSS, wrap in a basic HTML structure for preview
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            ${code}
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>CSS Preview</h1>
            </div>
            <div class="content">
              <p>This is a preview of your CSS styles. The styles above will be applied to your email template.</p>
              <a href="#" class="button">Sample Button</a>
            </div>
            <div class="footer">
              <p>Footer content with your custom styles</p>
            </div>
          </div>
        </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (type === "javascript") {
      // For JavaScript, show the code execution result
      let result: string;
      try {
        // Create a safe execution context
        const func = new Function("variables", `
          ${code}
          
          // Try to find and execute common function patterns
          if (typeof generatePersonalizedContent === 'function') {
            return generatePersonalizedContent(variables || {});
          }
          
          // Return the last expression or undefined
          return undefined;
        `);
        
        const executionResult = func(variables);
        result = JSON.stringify(executionResult, null, 2) || "No result";
      } catch (error) {
        result = `Error: ${(error as Error).message}`;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; margin: 20px; }
            .code-block { background: #f8f8f8; border: 1px solid #ddd; padding: 15px; border-radius: 4px; }
            .result { background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin-top: 15px; }
            .error { background: #fee; border-left: 4px solid #f44; }
          </style>
        </head>
        <body>
          <h2>JavaScript Execution Result</h2>
          <div class="code-block">
            <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
          </div>
          <div class="result ${result.startsWith('Error:') ? 'error' : ''}">
            <h3>Result:</h3>
            <pre>${result}</pre>
          </div>
        </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({ error: "Unsupported compilation type" }, { status: 400 });
  } catch (error) {
    console.error("Compilation error:", error);
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 4px; color: #c00; }
        </style>
      </head>
      <body>
        <div class="error">
          <h3>Compilation Error</h3>
          <p>${(error as Error).message}</p>
        </div>
      </body>
      </html>
    `;
    
    return new NextResponse(errorHtml, {
      status: 200, // Return 200 so the iframe shows the error
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
