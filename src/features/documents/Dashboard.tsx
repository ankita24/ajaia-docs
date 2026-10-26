import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  FilePlus2,
  Upload,
  Search,
  Users,
  Clock3,
  LogOut,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import {
  listDocuments,
  createDocument,
  updateDocument,
} from "./documentService";
import type { DocumentRecord } from "../../types/document";

interface DashboardProps {
  onOpenDocument: (id: string) => void;
}

export default function Dashboard({ onOpenDocument }: DashboardProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadDocuments() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in again.");

      setUserId(user.id);

      const data = await listDocuments();
      setDocuments(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load documents."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return documents.filter((doc) => doc.title.toLowerCase().includes(query));
  }, [documents, search]);

  const ownedDocuments = filteredDocuments.filter(
    (doc) => doc.owner_id === userId
  );

  const sharedDocuments = filteredDocuments.filter(
    (doc) => doc.owner_id !== userId
  );

  async function handleCreateDocument() {
    setCreating(true);
    setError("");

    try {
      const doc = await createDocument();
      setDocuments((previous) => [doc, ...previous]);
      onOpenDocument(doc.id);
    } catch (err) {
      console.error("Create document failed:", err);

      setError(
        err instanceof Error
          ? `Could not create document: ${err.message}`
          : "Could not create document. Check the browser console."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleImport(file?: File) {
    if (!file) return;

    setError("");
    setImporting(true);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (!["txt", "md"].includes(extension ?? "")) {
        throw new Error("Please select a .txt or .md file.");
      }

      if (file.size > 1024 * 1024) {
        throw new Error("File must be 1 MB or smaller.");
      }

      const text = await file.text();

      if (!text.trim()) {
        throw new Error("The selected file is empty.");
      }

      const content = {
        type: "doc",
        content: text.split(/\r?\n/).map((line) => ({
          type: "paragraph",
          ...(line ? { content: [{ type: "text", text: line }] } : {}),
        })),
      };

      const doc = await createDocument();

      const updatedDoc = await updateDocument(doc.id, {
        title:
          file.name
            .replace(/\.(txt|md)$/i, "")
            .trim()
            .slice(0, 200) || "Imported document",
        content,
      });

      setDocuments((previous) => [
        updatedDoc,
        ...previous.filter((item) => item.id !== updatedDoc.id),
      ]);

      onOpenDocument(updatedDoc.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not import this file."
      );
      await loadDocuments();
    } finally {
      setImporting(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function renderDocumentList(items: DocumentRecord[], emptyMessage: string) {
    if (items.length === 0) {
      return (
        <div className="dashboard-empty">
          <FileText size={24} />
          <p>{emptyMessage}</p>
        </div>
      );
    }
    return (
      <div className="document-grid">
        {items.map((doc) => (
          <button
            key={doc.id}
            type="button"
            className="document-card"
            onClick={() => onOpenDocument(doc.id)}
          >
            <div className="document-card-icon">
              <FileText size={22} />
              <h3>{doc.title}</h3>
            </div>

            <p className="document-meta">
              <Clock3 size={14} />
              {new Date(doc.updated_at).toLocaleDateString()}
            </p>

            {doc.owner_id !== userId && (
              <span className="shared-label">
                <Users size={13} />
                Shared with me
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-icon">
            <FileText size={23} />
          </div>

          <div>
            <h1>Ajaia</h1>
            <p>Your collaborative workspace</p>
          </div>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => void supabase.auth.signOut()}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-welcome">
          <div>
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h2>Your ideas, organized.</h2>
            <p className="welcome-description">
              Create documents, capture ideas, and work together.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={handleCreateDocument}
            disabled={creating || importing}
          >
            {creating ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <FilePlus2 size={18} />
            )}
            New document
          </button>
        </div>

        <div className="dashboard-actions">
          <label className="search-box">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search documents..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <button
            type="button"
            className="secondary-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing || creating}
          >
            {importing ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <Upload size={17} />
            )}
            Import file
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            hidden
            onChange={(event) => {
              void handleImport(event.target.files?.[0]);
            }}
          />
        </div>

        <p className="import-hint">
          Import TXT or Markdown files up to 1 MB. Markdown syntax is imported
          as editable text.
        </p>

        {error && (
          <div className="dashboard-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button type="button" onClick={() => void loadDocuments()}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="dashboard-loading">
            <LoaderCircle className="spin" size={24} />
            <p>Loading your documents...</p>
          </div>
        ) : (
          <>
            <section className="document-section">
              <div className="section-heading">
                <h2>My documents</h2>
                <span>{ownedDocuments.length}</span>
              </div>

              {renderDocumentList(
                ownedDocuments,
                search
                  ? "No owned documents match your search."
                  : "No documents yet. Create your first document!"
              )}
            </section>

            <section className="document-section">
              <div className="section-heading">
                <h2>Shared with me</h2>
                <span>{sharedDocuments.length}</span>
              </div>

              {renderDocumentList(
                sharedDocuments,
                search
                  ? "No shared documents match your search."
                  : "Documents shared with you will appear here."
              )}
            </section>
          </>
        )}
      </section>

      <footer className="dashboard-footer">
        Made for ideas worth sharing.
      </footer>
    </main>
  );
}
