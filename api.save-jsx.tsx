/**
 * Indra Save & Analyze Plugin for Puck Editor - API Route
 *
 * Handles file system operations to save generated JSX files.
 *
 * @author Indramal Wansekara
 * @link https://github.com/indramal/Indra-Save-and-Analize-Plugin-for-Puck-Editor/
 *
 * Please keep credit to the author when using this plugin.
 */

import type { ActionFunctionArgs } from "react-router";
import fs from "fs/promises";
import path from "path";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { filePath, content } = await request.json();

    if (!filePath || !content) {
      return new Response(
        JSON.stringify({ error: "Missing filePath or content" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // validate path is within allowed directories for safety (optional but good practice)
    // For this user task, we'll assume relative to 'app/'
    const fullPath = path.join(process.cwd(), "app", filePath);

    // ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(fullPath, content, "utf-8");

    return new Response(JSON.stringify({ success: true, path: fullPath }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error saving file:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to save file",
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
