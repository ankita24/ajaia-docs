import { supabase } from "../../lib/supabase";
import type { DocumentRecord } from "../../types/document";

export async function listDocuments() {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocumentRecord[];
}


export async function createDocument() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error('Authentication error:', authError);
    throw authError;
  }

  if (!user) {
    throw new Error('No authenticated user found. Please sign in again.');
  }

  console.log('Authenticated user ID:', user.id);

  const documentData = {
    owner_id: user.id,
    title: 'Untitled document',
    content: {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    },
  };

  console.log('Document being inserted:', documentData);

  const { data, error } = await supabase
    .from('documents')
    .insert(documentData)
    .select('*')
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    throw error;
  }

  return data as DocumentRecord;
}


export async function getDocument(id: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as DocumentRecord;
}

export async function updateDocument(
  id: string,
  changes: {
    title?: string;
    content?: Record<string, unknown>;
  }
) {
  const { data, error } = await supabase
    .from("documents")
    .update({
      ...changes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as DocumentRecord;
}



export async function shareDocument(
  documentId: string,
  recipientId: string,
  permission: 'viewer' | 'editor'
) {
  const { data: existingShare, error: lookupError } = await supabase
    .from('document_shares')
    .select('document_id, user_id, permission')
    .eq('document_id', documentId)
    .eq('user_id', recipientId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (existingShare) {
    if (existingShare.permission === permission) {
      throw new Error(
        `This document is already shared with this user as ${permission}.`
      );
    }

    return updateSharePermission(
      documentId,
      recipientId,
      permission
    );
  }

  const { data, error } = await supabase
    .from('document_shares')
    .insert({
      document_id: documentId,
      user_id: recipientId,
      permission,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This document is already shared with this user.');
    }

    throw new Error(error.message);
  }

  return data;
}



export async function getSharedDocuments() {
  const { data, error } = await supabase
    .from('document_shares')
    .select(`
      document_id,
      permission,
      documents (
        id,
        title,
        updated_at
      )
    `);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}


export async function updateSharePermission(
  documentId: string,
  recipientId: string,
  permission: 'viewer' | 'editor'
) {
  const { data, error } = await supabase
    .from('document_shares')
    .update({ permission })
    .eq('document_id', documentId)
    .eq('user_id', recipientId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}


export async function revokeDocumentAccess(
  documentId: string,
  recipientId: string
) {
  const { error } = await supabase
    .from('document_shares')
    .delete()
    .eq('document_id', documentId)
    .eq('user_id', recipientId);

  if (error) {
    throw new Error(error.message);
  }
}


export async function findUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Please enter an email address.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      'No registered user found with that email address.'
    );
  }

  const { data: authData } = await supabase.auth.getUser();

  if (data.id === authData.user?.id) {
    throw new Error('You cannot share a document with yourself.');
  }

  return data;
}


export async function getDocumentShares(documentId: string) {
  const { data, error } = await supabase
    .from('document_shares')
    .select('document_id, user_id, permission, created_at')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const shares = data ?? [];

  // Look up display details for the collaborators.
  const collaborators = await Promise.all(
    shares.map(async (share) => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', share.user_id)
        .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message);
      }

      return {
        ...share,
        email: profile?.email ?? 'Unknown user',
        display_name: profile?.display_name ?? '',
      };
    })
  );

  return collaborators;
}



