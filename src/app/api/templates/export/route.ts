import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { CustomTemplate } from "../custom/route";

// GET - Export templates as JSON
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const templateIds = searchParams.get("ids")?.split(",");
    const format = searchParams.get("format") || "json";

    const templates = await getCollection<CustomTemplate>("custom_templates");
    
    let query = {};
    if (templateIds && templateIds.length > 0) {
      query = { id: { $in: templateIds } };
    }

    const results = await templates.find(query).toArray();
    
    // Remove MongoDB _id field and add metadata
    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      templates: results.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        type: template.type,
        content: template.content,
        variables: template.variables || {},
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      })),
    };

    if (format === "json") {
      return NextResponse.json(exportData, {
        headers: {
          "Content-Disposition": `attachment; filename="email-templates-${new Date().toISOString().split('T')[0]}.json"`,
          "Content-Type": "application/json",
        },
      });
    }

    // Future: Support for other formats like ZIP with individual files
    return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
  } catch (error) {
    console.error("Error exporting templates:", error);
    return NextResponse.json({ error: "Failed to export templates" }, { status: 500 });
  }
}
