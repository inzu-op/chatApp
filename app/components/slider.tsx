import { FC, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { X, Search, UserPlus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { User } from "../types";
import { toast } from "sonner";

interface SidebarProps {
  isOpen: boolean;
  setSelectedUser: (user: User) => void;
  setIsOpen: (open: boolean) => void;
  currentUserId: string;
  selectedUser: User | null;
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
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(query.trim())}`);
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
        const result = await response.json();
        if (Array.isArray(result)) {
          setChatUsers(result);
        } else if (result.chatUsers) {
          setChatUsers(result.chatUsers);
        } else if (result.user || result.addedUser) {
          const addedUser = result.user || result.addedUser;
          setChatUsers(prev => {
            const existsAlready = prev.some(u => 
              (u.id || u._id) === (addedUser.id || addedUser._id)
            );
            if (existsAlready) return prev;
            return [...prev, addedUser];
          });
        } else {
          await fetchChatUsers();
        }
        
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

  const removeUserFromChat = async (targetUserId: string) => {
    setDeletingUserId(targetUserId);
    try {
      const response = await fetch("/api/users/remove-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: currentUserId, targetUserId }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.chatUsers)) {
          setChatUsers(result.chatUsers);
        } else {
          // Fallback to filtering if the response format is unexpected
          setChatUsers(prev => prev.filter(user => getUserId(user) !== targetUserId));
        }
        
        if (selectedUser && getUserId(selectedUser) === targetUserId) {
          setSelectedUser(null);
        }
        
        setShowDeleteConfirm(null);
        toast.success("User removed from chat successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to remove user from chat");
      }
    } catch (error) {
      console.error("Error removing user from chat:", error);
      toast.error("Failed to remove user from chat");
    } finally {
      setDeletingUserId(null);
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
  }, [searchQuery, isAddUserPopupOpen]);

  const getUserId = (user: User) => user.id || user._id;

  const availableUsers = users.filter(user => {
    const userId = getUserId(user);
    return !chatUsers.some(chatUser => getUserId(chatUser) === userId) && userId !== currentUserId;
  });

  return (
    <>
      {/* Add User Popup */}
      {isAddUserPopupOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] w-full max-w-md rounded-xl shadow-lg p-5 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-black dark:text-[#e0e0e0]" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-[#e0e0e0]">Add User</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={closeAddUserPopup} className="hover:bg-gray-100 dark:hover:bg-[#1a1a1a]">
                <X className="h-5 w-5 text-gray-600 dark:text-[#e0e0e0]" />
              </Button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-[#a0a0a0]" />
              <Input
                className="pl-9 dark:bg-[#1a1a1a] dark:text-[#e0e0e0] dark:border-[#2d2d2d] dark:placeholder:text-[#808080]"
                placeholder="Enter username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {loading ? (
                <p className="text-center text-gray-500 dark:text-[#a0a0a0]">Searching...</p>
              ) : availableUsers.length === 0 && searchQuery.trim() ? (
                <p className="text-center text-gray-500 dark:text-[#a0a0a0]">
                  {users.length === 0 ? "No matching users found" : "All matching users are already in your chat"}
                </p>
              ) : (
                availableUsers.map((user) => (
                  <div
                    key={getUserId(user)}
                    className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1a1a] dark:border-[#2d2d2d]"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-300 dark:bg-[#1a1a1a] rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-[#e0e0e0]">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-[#e0e0e0] border-b border-gray-400 dark:border-[#2d2d2d]">{user.name}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addUserToChat(getUserId(user))}
                      disabled={addingUserId === getUserId(user)}
                      className="text-white dark:text-black dark:hover:bg-zinc-300"
                    >
                      {addingUserId === getUserId(user) ? "Adding..." : "Add"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a0a0a] w-full max-w-md rounded-xl shadow-lg p-5 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-[#e0e0e0]">Confirm Removal</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowDeleteConfirm(null)} 
                className="hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-[#e0e0e0]" />
              </Button>
            </div>

            <p className="text-gray-600 dark:text-[#a0a0a0] mb-6">
              Are you sure you want to remove this user from your chat? This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(null)}
                className="border-gray-300 dark:border-[#2d2d2d] hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => removeUserFromChat(showDeleteConfirm)}
                disabled={deletingUserId === showDeleteConfirm}
                className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
              >
                {deletingUserId === showDeleteConfirm ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: isOpen ? 400 : 0 }}
        transition={{ duration: 0.3 }}
        className=" bg-white dark:bg-[#1a1a1a] dark:text-[#e0e0e0] border-r border-gray-400 dark:border-[#2d2d2d] shadow-md overflow-hidden h-full"
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-gray-400 dark:border-[#2d2d2d]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-[#e0e0e0]">Users</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5 text-gray-600 dark:text-[#e0e0e0]" />
              </Button>
            </div>
            <Button className="w-full" onClick={() => setIsAddUserPopupOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          <div className="overflow-y-auto flex-1 p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2 dark:text-[#a0a0a0]">Chat Users</h3>
            <div className="space-y-2">
              {chatUsers.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-[#a0a0a0]">No users added to chat</div>
              ) : (
                chatUsers.map((user) => (
                  <div
                    key={getUserId(user)}
                    className={`group p-3 rounded-xl transition cursor-pointer border-gray-400 dark:border-[#2d2d2d]
                      ${selectedUser && getUserId(selectedUser) === getUserId(user)
                        ? "bg-zinc-300 dark:bg-[#2d2d2d] dark:text-[#e0e0e0]"
                        : "hover:bg-gray-100 dark:hover:bg-[#2d2d2d] border-transparent dark:text-[#e0e0e0]"
                      }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-300 dark:bg-[#333333] rounded-full flex items-center justify-center">
                          <span className="text-lg font-medium text-gray-600 dark:text-[#e0e0e0]">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate dark:text-[#e0e0e0]">{user.name}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(getUserId(user));
                        }}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full 
                          ${deletingUserId === getUserId(user) ? "opacity-100" : ""}
                          hover:bg-gray-200 dark:hover:bg-[#333333] text-gray-500 dark:text-[#a0a0a0]
                          hover:text-red-500 dark:hover:text-red-400`}
                        disabled={deletingUserId === getUserId(user)}
                        aria-label="Remove user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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