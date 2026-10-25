'use client';
import { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import PDFViewerModal from '../components/PDFViewerModal';
import UploadModal from '../components/UploadModal';

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  total_chunks: number;
  file_url?: string;
  file_path?: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<{ url: string; name: string; id?: string; isPDF?: boolean } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setDocuments(data.documents || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      return isNaN(d.getTime()) 
        ? s 
        : d.toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
          });
    } catch { 
      return s; 
    }
  };

  const formatFileSize = (b: number) => 
    b < 1024 
      ? `${b} B` 
      : b < 1024 * 1024 
        ? `${(b / 1024).toFixed(2)} KB` 
        : `${(b / (1024 * 1024)).toFixed(2)} MB`;

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will permanently delete the document, embeddings, and file.`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        setDocuments(documents.filter(doc => doc.id !== id));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen text-slate-100">
      <Navigation />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Knowledge library</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Your documents</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">Manage files that power your answers.</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M10 4v12m6-6H4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
            Upload Document
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 py-16 text-center">
            <span className="mx-auto mb-4 block h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-300" />
            <p className="text-sm text-slate-400">Loading your library…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-5 text-rose-200">
            <p className="text-sm">Couldn’t load documents: {error}</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-16 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-cyan-300"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-6 w-6"><path d="M5 2.5h6l4 4v11H5v-15Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M11 2.5v4h4" stroke="currentColor" strokeWidth="1.4"/></svg></span>
            <h2 className="text-lg font-semibold text-white">Your library is ready</h2>
            <p className="mb-5 mt-2 text-sm text-slate-400">Upload a document to start asking questions about it.</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Upload your first document
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <p className="text-sm font-medium text-slate-200">Stored files</p>
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950/60">
                  <tr>
                    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      File Name
                    </th>
                    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Type
                    </th>
                    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Size
                    </th>
                    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Chunks
                    </th>
                    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Upload Date
                    </th>
                    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="transition hover:bg-slate-800/40">
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="text-sm font-medium text-slate-100">
                          {doc.file_name}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="inline-flex rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2.5 py-1 text-xs font-medium text-cyan-200">
                          {doc.file_type || 'unknown'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-400">
                        {formatFileSize(doc.file_size)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-400">
                        {doc.total_chunks}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-400">
                        {formatDate(doc.upload_date)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium">
                        <div className="flex gap-3 items-center">
                          {doc.file_name.toLowerCase().endsWith('.pdf') ? (
                            <button 
                              onClick={() => {
                                const pdfUrl = doc.file_url 
                                  ? `${doc.file_url}?view=true` 
                                  : `/api/documents?id=${doc.id}&file=true&view=true`;
                                setSelectedPDF({ url: pdfUrl, name: doc.file_name, id: doc.id });
                                setShowPDFModal(true);
                              }} 
                              className="text-cyan-300 transition hover:text-cyan-200"
                            >
                              Preview
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => {
                                  setSelectedPDF({ 
                                    url: doc.file_url || `/api/documents?id=${doc.id}&file=true`, 
                                    name: doc.file_name, 
                                    id: doc.id, 
                                    isPDF: false 
                                  });
                                  setShowPDFModal(true);
                                }} 
                                className="text-cyan-300 transition hover:text-cyan-200"
                              >
                                View
                              </button>
                              {(doc.file_url || doc.file_path) && (
                                <a 
                                  href={doc.file_url || `/api/documents?id=${doc.id}&file=true`} 
                                  download={doc.file_name}
                                  className="text-emerald-300 transition hover:text-emerald-200" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  Download
                                </a>
                              )}
                            </>
                          )}
                          <button 
                            onClick={() => handleDelete(doc.id, doc.file_name)} 
                            disabled={deletingId === doc.id}
                            className="text-rose-300 transition hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === doc.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedPDF && (
          <PDFViewerModal 
            isOpen={showPDFModal} 
            onClose={() => { 
              setShowPDFModal(false); 
              setSelectedPDF(null); 
            }}
            fileUrl={selectedPDF.url} 
            fileName={selectedPDF.name} 
            documentId={selectedPDF.id} 
            isPDF={selectedPDF.isPDF !== false} 
          />
        )}
        <UploadModal 
          isOpen={showUploadModal} 
          onClose={() => setShowUploadModal(false)} 
          onUploadSuccess={fetchDocuments} 
        />
      </main>
    </div>
  );
}
