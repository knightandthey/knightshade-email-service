"use client";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import Link from "next/link";

type TemplateMeta = {
  id: string;
  name: string;
  description?: string;
  variables: Record<string, string>;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const isPlainEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isDisplayNameAddress = (value: string) => {
  const v = value.trim();
  return /^([^<>"\\]+|"[^"]+")\s*<[^<>@\s]+@[^<>@\s]+>$/.test(v);
};

const schema = z.object({
  to: z.string().email(),
  cc: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().email().optional()
  ),
  bcc: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().email().optional()
  ),
  from: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .refine((val) => isPlainEmail(val) || isDisplayNameAddress(val), {
        message: "Enter an email or \"Name <email@domain>\"",
      })
      .optional()
  ),
  subject: z.string().min(1),
  templateId: z.string().min(1),
  variables: z.record(z.string(), z.string()),
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

export default function Home() {
  const { data: templates }: { data?: TemplateMeta[] } = useSWR(
    "/api/templates",
    fetcher
  );
  const [selected, setSelected] = useState<string>("");
  const selectedTemplate = useMemo(
    () => templates?.find((t) => t.id === selected),
    [templates, selected]
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      from: process.env.NEXT_PUBLIC_DEFAULT_FROM,
      variables: {},
    },
  });

  useEffect(() => {
    if (selectedTemplate) {
      setValue("templateId", selectedTemplate.id);
      const defaults: Record<string, string> = {};
      Object.entries(selectedTemplate.variables).forEach(([k, v]) => {
        defaults[k] = v;
      });
      setValue("variables", defaults);
    }
  }, [selectedTemplate, setValue]);

  const variables = watch("variables");

  const [previewHtml, setPreviewHtml] = useState<string>("");
  useEffect(() => {
    async function updatePreview() {
      if (!selectedTemplate) return;
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplate.id, variables }),
      });
      const text = await res.text();
      setPreviewHtml(text);
    }
    updatePreview();
  }, [selectedTemplate, variables]);

  async function onSubmit(values: FormValues) {
    await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
  }

  const onDrop = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list: Array<{ filename: string; content: string; type?: string }> = [];
    for (const file of Array.from(files)) {
      const buffer = await file.arrayBuffer();
      // Browser-safe base64 encoding
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

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Email Service</h1>
          <div className="flex space-x-4">
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Simple Compose
            </Link>
            <a
              href="/compose"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Advanced Compose
            </a>
            <a
              href="/history"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              History
            </a>
            <a
              href="/demo"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Rich Text Demo
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <h2 className="text-2xl font-semibold">Simple Template Email</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2">
              <span className="block text-sm mb-1">To</span>
              <input className="w-full border rounded px-3 py-2" {...register("to")} />
              {errors.to && (
                <p className="text-red-600 text-sm">{String(errors.to.message)}</p>
              )}
            </label>
            <label>
              <span className="block text-sm mb-1">CC</span>
              <input className="w-full border rounded px-3 py-2" {...register("cc")} />
            </label>
            <label>
              <span className="block text-sm mb-1">BCC</span>
              <input className="w-full border rounded px-3 py-2" {...register("bcc")} />
            </label>
            <label className="col-span-2">
              <span className="block text-sm mb-1">From</span>
              <input className="w-full border rounded px-3 py-2" {...register("from")} />
            </label>
            <label className="col-span-2">
              <span className="block text-sm mb-1">Subject</span>
              <input className="w-full border rounded px-3 py-2" {...register("subject")} />
            </label>
          </div>

          <div>
            <span className="block text-sm mb-1">Template</span>
            <select
              className="w-full border rounded px-3 py-2"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Select a template</option>
              {templates?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <div>
              <h2 className="text-lg font-medium mb-2">Template Variables</h2>
              <div className="grid grid-cols-2 gap-3">
                {Object.keys(selectedTemplate.variables).map((key) => (
                  <label key={key} className="flex flex-col">
                    <span className="text-sm mb-1">{key}</span>
                    <input
                      className="border rounded px-3 py-2"
                      value={variables?.[key] || ""}
                      onChange={(e) => setValue("variables", { ...variables, [key]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <span className="block text-sm mb-1">Attachments</span>
                <input
                  type="file"
                  multiple
                  className="border rounded px-3 py-2 w-full"
                  onChange={(e) => onDrop(e.target.files)}
                />
                <p className="text-xs text-gray-500 mt-1">Files will be base64-encoded and sent via Resend.</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Email"}
          </button>
        </form>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Live Preview</h2>
          <div className="border rounded h-[70vh] overflow-auto bg-white">
            {previewHtml ? (
              <iframe title="preview" className="w-full h-full" srcDoc={previewHtml} />
            ) : (
              <div className="p-6 text-gray-500">Select a template to preview.</div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
