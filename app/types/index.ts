export interface User {
  id: string;
  name: string;
  email: string;
  lastMessage?: string;
}

export interface Message {
  id: string;
  sender: string;
  receiver: string;
  text: string;
  timestamp: Date;
} 