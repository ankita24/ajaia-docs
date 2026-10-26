
import { useState } from 'react';
import { useAuth } from './features/auth/useAuth';
import AuthPage from './features/auth/AuthPage';
import Dashboard from './features/documents/Dashboard';
import DocumentEditor from './features/documents/DocumentEditor';
import { getDocument } from './features/documents/documentService';
import type { DocumentRecord, Permission } from './types/document';
import { supabase } from './lib/supabase';
import './index.css';

export default function App() {
  const { session, loading } = useAuth();

  const [selectedDocument, setSelectedDocument] =
    useState<DocumentRecord | null>(null);

  const [permission, setPermission] = useState<Permission>('editor');
  const [documentLoading, setDocumentLoading] = useState(false);
  const [error, setError] = useState('');

  async function openDocument(id: string) {
    setDocumentLoading(true);
    setError('');

    try {
      const doc = await getDocument(id);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Please sign in again.');

      if (doc.owner_id === user.id) {
        setPermission('editor');
      } else {
        const { data: share, error: shareError } = await supabase
          .from('document_shares')
          .select('permission')
          .eq('document_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (shareError) throw shareError;
        if (!share) throw new Error('You no longer have access.');

        setPermission(share.permission as Permission);
      }

      setSelectedDocument(doc);
    } catch {
      setError('Unable to open this document. Check your access and try again.');
    } finally {
      setDocumentLoading(false);
    }
  }

  if (loading) {
    return <p className="app-loading">Loading Ajaia…</p>;
  }

  if (!session) {
    return <AuthPage />;
  }

  if (documentLoading) {
    return <p className="app-loading">Opening document…</p>;
  }

  if (selectedDocument) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setSelectedDocument(null)}
          className="back-button"
        >
          ← Back to documents
        </button>

        {error && <p role="alert">{error}</p>}

        <DocumentEditor
          key={selectedDocument.id}
          document={selectedDocument}
          permission={permission}
        />
      </div>
    );
  }

  return (
    <div>
      {error && <p role="alert">{error}</p>}

      <Dashboard onOpenDocument={openDocument} />

      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="sign-out-button"
      >
        Sign out
      </button>
    </div>
  );
}
