"use client";
import { useState, useEffect } from "react";
import { Sidebar } from "@/app/components/slider";
import { ChatWindow } from "@/app/components/chat";
import { User } from "@/app/types";
import { use } from "react";

interface DashboardProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ChatAppPage({ params }: DashboardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const resolvedParams = use(params);

  // Store user ID in localStorage when component mounts
  useEffect(() => {
    if (resolvedParams.id) {
      localStorage.setItem('userId', resolvedParams.id);
    }
  }, [resolvedParams.id]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        isOpen={isOpen} 
        setSelectedUser={setSelectedUser} 
        setIsOpen={setIsOpen}
        currentUserId={resolvedParams.id}
        selectedUser={selectedUser}
      />
      <ChatWindow 
        isOpen={isOpen} 
        selectedUser={selectedUser} 
        setIsOpen={setIsOpen}
        currentUserId={resolvedParams.id}
        setSelectedUser={setSelectedUser}
      />
    </div>
  );
}