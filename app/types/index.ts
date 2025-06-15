export interface User {
  _id: string;
  id?: string; // Optional id field for compatibility
  name: string;
  email: string;
  lastMessage?: string;
  pinned?: boolean;
  addedAt?: Date;
}

