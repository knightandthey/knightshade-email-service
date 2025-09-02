"use client";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

type TemplateMeta = {
  id: string;
  name: string;
  description?: string;
  variables: Record<string, string>;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const schema = z.object({
  to: z.string().email(),
  cc: z.string().email().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  bcc: z.string().email().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  from: z.string().email().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  subject: z.string().min(1),
  templateId: z.string().min(1),
});

type FormValues = z.infer<typeof schema> & {
  variables: Record<string, string>;
};

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
    resolver: zodResolver(schema as any),
    defaultValues: {
      from: process.env.NEXT_PUBLIC_DEFAULT_FROM,
      variables: {},
    } as any,
  });

  useEffect(() => {
    if (selectedTemplate) {
      setValue("templateId", selectedTemplate.id as any);
      const defaults: Record<string, string> = {};
      Object.entries(selectedTemplate.variables).forEach(([k, v]) => {
        defaults[k] = v;
      });
      setValue("variables", defaults as any);
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

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <h1 className="text-2xl font-semibold">Compose Email</h1>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2">
              <span className="block text-sm mb-1">To</span>
              <input className="w-full border rounded px-3 py-2" {...register("to")} />
              {errors.to && <p className="text-red-600 text-sm">{errors.to.message as any}</p>}
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
                      onChange={(e) =>
                        setValue("variables", { ...variables, [key]: e.target.value } as any)
                      }
                    />
                  </label>
                ))}
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
              // eslint-disable-next-line @next/next/no-html-link-for-pages
              <iframe title="preview" className="w-full h-full" srcDoc={previewHtml} />
            ) : (
              <div className="p-6 text-gray-500">Select a template to preview.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
