import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";

import type {
  Collaborator,
  DocumentRecord,
  Permission,
} from "../../types/document";

import { supabase } from "../../lib/supabase";

import {
  updateDocument,
  findUserByEmail,
  shareDocument,
  getDocumentShares,
  updateSharePermission,
  revokeDocumentAccess,
} from "./documentService";

import EditorToolbar from "./EditorToolbar";

type Props = {
  document: DocumentRecord;
  permission: Permission;
};

export default function DocumentEditor({ document, permission }: Props) {
  const [title, setTitle] = useState(document.title);
  const [saveStatus, setSaveStatus] = useState("Saved");

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [collaboratorError, setCollaboratorError] = useState("");

  const [isOwner, setIsOwner] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<Permission>("viewer");
  const [shareStatus, setShareStatus] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editable = permission === "editor";

  // Check whether the current user owns this document.
  useEffect(() => {
    let active = true;

    async function checkOwner() {
      const { data, error } = await supabase.auth.getUser();

      if (active && !error) {
        setIsOwner(data.user?.id === document.owner_id);
      }
    }

    void checkOwner();

    return () => {
      active = false;
    };
  }, [document.owner_id]);

  // Rich-text editor and autosave.
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: document.content,
    editable,
    onUpdate: ({ editor }) => {
      if (!editable) return;

      setSaveStatus("Unsaved changes");

      if (timer.current) {
        clearTimeout(timer.current);
      }

      timer.current = setTimeout(async () => {
        try {
          setSaveStatus("Saving…");

          await updateDocument(document.id, {
            content: editor.getJSON() as Record<string, unknown>,
          });

          setSaveStatus("Saved");
        } catch {
          setSaveStatus("Save failed — retry by editing again");
        }
      }, 700);
    },
  });

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  // Save the document title.
  async function saveTitle() {
    if (!editable) return;

    const nextTitle = title.trim().slice(0, 200);

    if (!nextTitle) {
      setTitle(document.title);
      return;
    }

    try {
      await updateDocument(document.id, { title: nextTitle });
      setSaveStatus("Saved");
    } catch {
      setSaveStatus("Title save failed");
    }
  }

  // Fetch existing collaborators for this document.
  async function loadCollaborators() {
    setLoadingCollaborators(true);
    setCollaboratorError("");

    try {
      const data = await getDocumentShares(document.id);
      setCollaborators(data as Collaborator[]);
    } catch (error) {
      setCollaboratorError(
        error instanceof Error ? error.message : "Could not load collaborators."
      );
    } finally {
      setLoadingCollaborators(false);
    }
  }

  // Open the sharing dialog and load its collaborators.
  function openShareDialog() {
    setShareStatus("");
    setShareOpen(true);
    void loadCollaborators();
  }

  // Share a document or update an existing recipient's permission.
  async function handleShare() {
    setShareStatus("");

    if (!recipientEmail.trim()) {
      setShareStatus("Please enter an email address.");
      return;
    }

    setIsSharing(true);

    try {
      const recipient = await findUserByEmail(recipientEmail);

      await shareDocument(document.id, recipient.id, sharePermission);

      setShareStatus(
        `Access saved for ${recipient.email} as ${
          sharePermission === "editor" ? "Editor" : "Viewer"
        }.`
      );

      setRecipientEmail("");

      await loadCollaborators();
    } catch (error) {
      setShareStatus(
        error instanceof Error
          ? error.message
          : "Could not share this document."
      );
    } finally {
      setIsSharing(false);
    }
  }

  // Change an existing collaborator's permission.
  async function handlePermissionChange(
    collaborator: Collaborator,
    nextPermission: Permission
  ) {
    setShareStatus("");

    try {
      await updateSharePermission(
        document.id,
        collaborator.user_id,
        nextPermission
      );

      await loadCollaborators();

      setShareStatus(
        `Updated ${collaborator.email} to ${
          nextPermission === "editor" ? "Editor" : "Viewer"
        }.`
      );
    } catch (error) {
      setShareStatus(
        error instanceof Error ? error.message : "Could not update permission."
      );
    }
  }

  // Revoke a collaborator's access.
  async function handleRevokeAccess(collaborator: Collaborator) {
    const confirmed = window.confirm(
      `Remove ${collaborator.email}'s access to this document?`
    );

    if (!confirmed) return;

    setShareStatus("");

    try {
      await revokeDocumentAccess(document.id, collaborator.user_id);

      await loadCollaborators();

      setShareStatus(`Removed access for ${collaborator.email}.`);
    } catch (error) {
      setShareStatus(
        error instanceof Error ? error.message : "Could not remove access."
      );
    }
  }

  return (
    <main className="editor-page">
      <header className="editor-header">
        <input
          aria-label="Document title"
          value={title}
          disabled={!editable}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />

        <span role="status">{saveStatus}</span>

        {isOwner && (
          <button type="button" onClick={openShareDialog}>
            Share
          </button>
        )}
      </header>

      {editor && editable && <EditorToolbar editor={editor} />}

      <section className="paper">
        <EditorContent editor={editor} />
      </section>

      {shareOpen && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShareOpen(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 18, 30, 0.55)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: 16,
            overflowY: "auto",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
            style={{
              background: "#ffffff",
              color: "#25243a",
              padding: 24,
              borderRadius: 16,
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflowY: "auto",
              boxSizing: "border-box",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h2
              id="share-title"
              style={{
                fontSize: 24,
                lineHeight: 1.3,
                margin: "0 0 8px",
                color: "#25243a",
              }}
            >
              Share document
            </h2>

            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: "#6b6b80",
                margin: "0 0 20px",
              }}
            >
              Give another registered Ajaia user access to{" "}
              <strong>{title}</strong>.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleShare();
              }}
            >
              <label
                htmlFor="recipient-email"
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Email address
              </label>

              <input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder="person@example.com"
                disabled={isSharing}
                required
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  border: "1px solid #d9d9e5",
                  borderRadius: 8,
                  fontSize: 14,
                  color: "#25243a",
                  background: "#ffffff",
                  marginBottom: 16,
                  boxSizing: "border-box",
                }}
              />

              <label
                htmlFor="share-permission"
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Access level
              </label>

              <select
                id="share-permission"
                value={sharePermission}
                onChange={(event) =>
                  setSharePermission(event.target.value as Permission)
                }
                disabled={isSharing}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  border: "1px solid #d9d9e5",
                  borderRadius: 8,
                  fontSize: 14,
                  color: "#25243a",
                  background: "#ffffff",
                  marginBottom: 16,
                  boxSizing: "border-box",
                }}
              >
                <option value="viewer">Viewer — can read</option>
                <option value="editor">Editor — can edit</option>
              </select>

              {shareStatus && (
                <p
                  role="status"
                  aria-live="polite"
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: shareStatus.startsWith("Could not")
                      ? "#b42318"
                      : "#4b5563",
                    overflowWrap: "anywhere",
                  }}
                >
                  {shareStatus}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  disabled={isSharing}
                  onClick={() => setShareOpen(false)}
                >
                  Close
                </button>

                <button type="submit" disabled={isSharing}>
                  {isSharing ? "Saving…" : "Share"}
                </button>
              </div>
            </form>

            <div
              style={{
                borderTop: "1px solid #e9e9f0",
                marginTop: 24,
                paddingTop: 20,
              }}
            >
              <h3
                style={{
                  fontSize: 17,
                  lineHeight: 1.4,
                  fontWeight: 600,
                  margin: "0 0 12px",
                  color: "#25243a",
                }}
              >
                People with access
              </h3>

              {loadingCollaborators && (
                <p style={{ fontSize: 14, color: "#6b6b80" }}>
                  Loading collaborators…
                </p>
              )}

              {collaboratorError && (
                <p role="alert" style={{ fontSize: 14, color: "#b42318" }}>
                  {collaboratorError}
                </p>
              )}

              {!loadingCollaborators &&
                !collaboratorError &&
                collaborators.length === 0 && (
                  <p
                    style={{
                      fontSize: 14,
                      color: "#6b6b80",
                      margin: 0,
                    }}
                  >
                    No one else has access yet.
                  </p>
                )}

              {!loadingCollaborators &&
                collaborators.map((person) => (
                  <div
                    key={person.user_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
                      padding: "14px 0",
                      borderTop: "1px solid #eeeeF4",
                    }}
                  >
                    <div
                      style={{
                        flex: "1 1 150px",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          overflowWrap: "anywhere",
                          color: "#25243a",
                        }}
                      >
                        {person.display_name || person.email}
                      </div>

                      {person.display_name && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6b6b80",
                            overflowWrap: "anywhere",
                            marginTop: 3,
                          }}
                        >
                          {person.email}
                        </div>
                      )}
                    </div>

                    <select
                      aria-label={`Permission for ${person.email}`}
                      value={person.permission}
                      onChange={(event) => {
                        void handlePermissionChange(
                          person,
                          event.target.value as Permission
                        );
                      }}
                      style={{
                        padding: "8px 10px",
                        border: "1px solid #d9d9e5",
                        borderRadius: 8,
                        background: "#ffffff",
                        color: "#25243a",
                        fontSize: 13,
                      }}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        void handleRevokeAccess(person);
                      }}
                      style={{
                        padding: "8px 10px",
                        border: "1px solid #e5b8b8",
                        borderRadius: 8,
                        background: "#ffffff",
                        color: "#b42318",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Remove access
                    </button>
                  </div>
                ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
