export type Permission = 'viewer' | 'editor';


export interface DocumentRecord {
  id: string;
  owner_id: string;
  title: string;
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type Collaborator = {
  document_id: string;
  user_id: string;
  permission: Permission;
  created_at: string;
  email: string;
  display_name: string;
};