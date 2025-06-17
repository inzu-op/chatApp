export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  lastMessage?: string;
  pinned?: boolean;
  addedAt?: Date;
}

