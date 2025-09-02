import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export interface CustomTemplate {
  _id?: string;
  id: string;
  name: string;
  description?: string;
  type: "html" | "react" | "css" | "javascript" | "plaintext";
  content: string;
  variables?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

// GET - List all custom templates
export async function GET() {
  try {
    const templates = await getCollection<CustomTemplate>("custom_templates");
    const results = await templates.find({}).toArray();
    
    return NextResponse.json(results.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      variables: template.variables || {},
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    })));
  } catch (error) {
    console.error("Error fetching custom templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// POST - Create a new custom template
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, type, content, variables } = body as {
      name: string;
      description?: string;
      type: "html" | "react" | "css" | "javascript" | "plaintext";
      content: string;
      variables?: Record<string, string>;
    };

    if (!name || !type || !content) {
      return NextResponse.json(
        { error: "Name, type, and content are required" },
        { status: 400 }
      );
    }

    const templates = await getCollection<CustomTemplate>("custom_templates");
    
    // Generate a unique ID
    const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const newTemplate: CustomTemplate = {
      id,
      name,
      description,
      type,
      content,
      variables: variables || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await templates.insertOne(newTemplate);
    
    return NextResponse.json({ 
      id: result.insertedId,
      templateId: id,
      message: "Template created successfully" 
    });
  } catch (error) {
    console.error("Error creating custom template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

// PUT - Update an existing custom template
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, description, type, content, variables } = body as {
      id: string;
      name: string;
      description?: string;
      type: "html" | "react" | "css" | "javascript" | "plaintext";
      content: string;
      variables?: Record<string, string>;
    };

    if (!id || !name || !type || !content) {
      return NextResponse.json(
        { error: "ID, name, type, and content are required" },
        { status: 400 }
      );
    }

    const templates = await getCollection<CustomTemplate>("custom_templates");
    
    const result = await templates.updateOne(
      { id },
      {
        $set: {
          name,
          description,
          type,
          content,
          variables: variables || {},
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Template updated successfully" });
  } catch (error) {
    console.error("Error updating custom template:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

// DELETE - Delete a custom template
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    const templates = await getCollection<CustomTemplate>("custom_templates");
    const result = await templates.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting custom template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
