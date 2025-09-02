"use client";
import useSWR from "swr";

type EmailLog = {
  _id: string;
  to: string;
  cc?: string;
  bcc?: string;
  from: string;
  subject: string;
  template: string;
  status: string;
  createdAt: string;
  error?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HistoryPage() {
  const { data } = useSWR<EmailLog[]>("/api/history?limit=100", fetcher);
  return (
    <div className="p-6 sm:p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Sent Emails</h1>
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">To</th>
                <th className="text-left p-2">Subject</th>
                <th className="text-left p-2">Template</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((row) => (
                <tr key={row._id} className="border-t">
                  <td className="p-2 whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="p-2 break-words">{row.to}</td>
                  <td className="p-2 break-words">{row.subject}</td>
                  <td className="p-2">{row.template}</td>
                  <td className="p-2">
                    <span
                      className={
                        row.status === "sent"
                          ? "text-green-700"
                          : row.status === "failed"
                          ? "text-red-700"
                          : "text-gray-700"
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


