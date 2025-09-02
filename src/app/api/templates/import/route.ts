import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { CustomTemplate } from "../custom/route";

// POST - Import templates from JSON
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { templates, options = {} } = body as {
      templates?: Array<{
        name: string;
        type: string;
        content: string;
        variables?: Record<string, unknown>;
        createdAt?: Date | string;
        updatedAt?: Date | string;
        [key: string]: unknown;
      }>;
      version?: string;
      exportDate?: string;
      options?: {
        overwrite?: boolean;
        generateNewIds?: boolean;
      };
    };

    if (!templates || !Array.isArray(templates) || templates.length === 0) {
      return NextResponse.json(
        { error: "No templates found in import data" },
        { status: 400 }
      );
    }

    const templatesCollection = await getCollection<CustomTemplate>("custom_templates");
    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const templateData of templates) {
      try {
        // Validate required fields
        if (!templateData.name || !templateData.type || !templateData.content) {
          results.errors.push(`Template "${templateData.name || 'Unnamed'}" is missing required fields`);
          continue;
        }

        // Generate new ID if requested or if ID doesn't exist
        let templateId = templateData.id;
        if (!templateId || options.generateNewIds) {
          templateId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }

        // Check if template already exists
        const existingTemplate = await templatesCollection.findOne({ id: templateId });

        if (existingTemplate && !options.overwrite) {
          results.skipped++;
          continue;
        }

        const templateToSave: CustomTemplate = {
          id: templateId,
          name: templateData.name,
          description: templateData.description,
          type: templateData.type,
          content: templateData.content,
          variables: templateData.variables || {},
          createdAt: templateData.createdAt ? new Date(templateData.createdAt) : new Date(),
          updatedAt: new Date(),
        };

        if (existingTemplate && options.overwrite) {
          // Update existing template
          await templatesCollection.updateOne(
            { id: templateId },
            { $set: templateToSave }
          );
          results.updated++;
        } else {
          // Insert new template
          await templatesCollection.insertOne(templateToSave);
          results.imported++;
        }
      } catch (error) {
        results.errors.push(`Failed to import template "${templateData.name || 'Unnamed'}": ${(error as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Import completed: ${results.imported} imported, ${results.updated} updated, ${results.skipped} skipped`,
    });
  } catch (error) {
    console.error("Error importing templates:", error);
    return NextResponse.json({ error: "Failed to import templates" }, { status: 500 });
  }
}
