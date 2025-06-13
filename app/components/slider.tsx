import { FC, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { X, Search, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { User } from "../types";
import { toast } from "sonner";

interface SidebarProps {
  isOpen: boolean;
  setSelectedUser: (user: User) => void;
  setIsOpen: (open: boolean) => void;
  currentUserId: string;
  selectedUser: User | null; // 🆕 Add this
}

export const Sidebar: FC<SidebarProps> = ({
  isOpen,
  setSelectedUser,
  setIsOpen,
  currentUserId,
  selectedUser,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [chatUsers, setChatUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [isAddUserPopupOpen, setIsAddUserPopupOpen] = useState(false);

  const fetchChatUsers = async () => {
    try {
      const response = await fetch(`/api/users/chat-users?userId=${currentUserId}`);
      if (response.ok) {
        const data = await response.json();
        setChatUsers(data);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to fetch chat users");
      }
    } catch (error) {
      console.error("Error fetching chat users:", error);
      toast.error("Failed to fetch chat users");
    }
  };

  useEffect(() => {
    fetchChatUsers();
  }, [currentUserId]);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users?query=${encodeURIComponent(query.trim())}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to search users");
      }
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const addUserToChat = async (targetUserId: string) => {
    setAddingUserId(targetUserId);
    try {
      const response = await fetch("/api/users/add-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: currentUserId, targetUserId }),
      });

      if (response.ok) {
        const updatedChatUsers = await response.json();
        setChatUsers(updatedChatUsers);
        toast.success("User added to chat successfully");
        closeAddUserPopup();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add user to chat");
      }
    } catch (error) {
      console.error("Error adding user to chat:", error);
      toast.error("Failed to add user to chat");
    } finally {
      setAddingUserId(null);
    }
  };

  const closeAddUserPopup = () => {
    setIsAddUserPopupOpen(false);
    setSearchQuery("");
    setUsers([]);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAddUserPopupOpen) searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <>
      {/* Add User Popup */}
      {isAddUserPopupOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-5 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-black" />
                <h3 className="text-lg font-semibold text-gray-800">Add User</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={closeAddUserPopup}>
                <X className="h-5 w-5 text-gray-600" />
              </Button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Enter username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {loading ? (
                <p className="text-center text-gray-500">Searching...</p>
              ) : users.length === 0 ? (
                <p className="text-center text-gray-500">No matching users found</p>
              ) : (
                users.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600 ">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-800 border-b border-gray-400">{user.name}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addUserToChat(user._id)}
                      disabled={addingUserId === user._id}
                    >
                      {addingUserId === user._id ? "Adding..." : "Add"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: isOpen ? 400 : 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white border-r border-gray-400 shadow-md overflow-hidden h-full"
      >
        <div className="flex flex-col h-full">
          <div className="p-4  border-gray-400">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Users</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
            <Button className="w-full" onClick={() => setIsAddUserPopupOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          <div className="overflow-y-auto flex-1 p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Chat Users</h3>
            <div className="space-y-2">
              {chatUsers.length === 0 ? (
                <div className="text-center text-gray-500">No users added to chat</div>
              ) : (
                chatUsers.map((user) => (
                  <div
                    key={user._id}
                    className={`p-3 rounded-xl transition cursor-pointer border-gray-400
                      ${selectedUser?._id === user._id
                        ? "bg-zinc-200 "
                        : "hover:bg-gray-100  border-transparent"
                      }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center space-x-3 hover:scale-105 transition-all duration-300 ease-in-out">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-gray-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{user.name}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};
