import { FC, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { User } from "@/app/types";
import Navbar from "./Navbar";
import { Trash2, X, UserCircle, Info, Loader2, LogOut, UserPlus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import ChatMsg from "./chatmsg";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from '@/app/hooks/useSocket';

interface ChatWindowProps {
  isOpen: boolean;
  selectedUser: User | null;
  setIsOpen: (open: boolean) => void;
  currentUserId: string;
  setSelectedUser: (user: User | null) => void;
}

interface Message {
  sender: "me" | "them";
  text: string;
  timestamp: Date;
}

export const ChatWindow: FC<ChatWindowProps> = ({
  isOpen,
  selectedUser,
  setIsOpen,
  currentUserId,
  setSelectedUser,
}) => {
  const [messagesByUser, setMessagesByUser] = useState<{ [userId: string]: Message[] }>({});
  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const [chatUsers, setChatUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAddUserPopupOpen, setIsAddUserPopupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize socket at component level
  const { sendMessage, onNewMessage } = useSocket(currentUserId || '');

  const getUserId = (user: User) => user._id || user.id;

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch(`/api/users/${currentUserId}`);
        const data = await res.json();
        if (res.ok) setCurrentUser(data);
        else console.error(data.error);
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };
    if (currentUserId) fetchCurrentUser();
  }, [currentUserId]);

  // Fetch chat users
  useEffect(() => {
    const fetchChatUsers = async () => {
      try {
        const res = await fetch(`/api/users/chat-users?userId=${currentUserId}`);
        const data = await res.json();
        if (res.ok) setChatUsers(data);
        else console.error(data.error);
      } catch (error) {
        console.error("Error fetching chat users:", error);
      }
    };

    fetchChatUsers();
    const interval = setInterval(fetchChatUsers, 5000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  // Handle new messages
  useEffect(() => {
    if (!selectedUser || !currentUserId) return;

    const handleNewMessage = (data: any) => {
      if (data.senderId === getUserId(selectedUser) || data.receiverId === getUserId(selectedUser)) {
        setMessagesByUser(prev => {
          const userId = getUserId(selectedUser);
          const prevMsgs = prev[userId] || [];
          return {
            ...prev,
            [userId]: [...prevMsgs, {
              sender: data.senderId === currentUserId ? 'me' : 'them',
              text: data.text,
              timestamp: new Date(data.timestamp),
              read: false
            }]
          };
        });
      }
    };

    onNewMessage(handleNewMessage);
  }, [selectedUser, currentUserId, onNewMessage]);

  // Fetch initial messages
  useEffect(() => {
    if (!selectedUser || !currentUserId) return;

    const fetchInitialMessages = async () => {
      try {
        const res = await fetch(`/api/messages?userId=${getUserId(selectedUser)}&currentUserId=${currentUserId}`);
        if (!res.ok) throw new Error('Failed to fetch messages');
        const messages = await res.json();
        setMessagesByUser(prev => ({
          ...prev,
          [getUserId(selectedUser)]: messages.map((msg: any) => ({
            sender: msg.sender._id === currentUserId ? 'me' : 'them',
            text: msg.text,
            timestamp: new Date(msg.timestamp),
            read: msg.read
          }))
        }));
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to fetch messages');
      }
    };

    fetchInitialMessages();
  }, [selectedUser, currentUserId]);

  // Update handleSend to use WebSocket
  const handleSend = async () => {
    if (!input.trim() || !selectedUser || !currentUserId) {
      toast.error('Please select a user to chat with');
      return;
    }

    try {
      const messageData = {
        text: input.trim(),
        receiverId: getUserId(selectedUser),
        senderId: currentUserId,
        timestamp: new Date()
      };

      // Send message to API
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Send message through WebSocket
      sendMessage(messageData);

      // Update local state
      setMessagesByUser(prev => {
        const userId = getUserId(selectedUser);
        const prevMsgs = prev[userId] || [];
        return {
          ...prev,
          [userId]: [...prevMsgs, {
            sender: 'me',
            text: input.trim(),
            timestamp: new Date(),
            read: false
          }]
        };
      });
      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  const handleClearChat = async () => {
    if (!selectedUser || !currentUserId) {
      toast.error('Please select a user to clear chat with');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/messages/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          userId: currentUserId,
          targetUserId: getUserId(selectedUser)
        }),
      });

      if (res.ok) {
        // Clear messages from state
        setMessagesByUser(prev => {
          const newMsgs = { ...prev };
          delete newMsgs[getUserId(selectedUser)];
          return newMsgs;
        });
        toast.success('Chat cleared successfully');
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to clear chat');
      }
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error(error instanceof Error ? error.message : 'Failed to clear chat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/users/remove-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          userId: currentUserId,
          targetUserId: getUserId(selectedUser) 
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.chatUsers)) {
          setChatUsers(result.chatUsers);
        } else {
          // Fallback to filtering if the response format is unexpected
          setChatUsers(prev => prev.filter(user => getUserId(user) !== getUserId(selectedUser)));
        }
        
        setMessagesByUser((prev) => {
          const newMsgs = { ...prev };
          if (selectedUser) delete newMsgs[getUserId(selectedUser)];
          return newMsgs;
        });
        setSelectedUser(null);
        setShowAbout(false);
        toast.success("User removed from chat successfully");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to remove user from chat");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to remove user from chat");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMessages = selectedUser
    ? (messagesByUser[getUserId(selectedUser)] || []).filter((msg) =>
    msg.text.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const closeAddUserPopup = () => {
    setIsAddUserPopupOpen(false);
    setSearchQuery("");
  };

  const addUserToChat = async (userId: string) => {
    setAddingUserId(userId);
    try {
      const res = await fetch("/api/users/add-to-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: currentUserId, targetUserId: userId }),
      });

      if (res.ok) {
        setSelectedUser(null);
        setShowAbout(false);
        setIsAddUserPopupOpen(false);
      } else {
        console.error("Error adding user to chat");
      }
    } catch (error) {
      console.error("Error adding user to chat:", error);
    } finally {
      setAddingUserId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col dark:bg-[#0a0a0a] dark:text-[#e0e0e0]">
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="sticky top-0 z-50 bg-white dark:bg-[#0a0a0a] shadow-sm"
      >
      <Navbar
        onMenuClick={() => setIsOpen(true)}
        selectedUser={selectedUser}
        chatUsers={chatUsers}
        isOpen={isOpen}
        onUserSelect={setSelectedUser}
        currentUser={currentUser}
      />
      </motion.div>

      {!selectedUser ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 text-center px-4 dark:bg-[#0a0a0a] dark:text-[#e0e0e0]">
          <h1 className="text-2xl font-bold text-gray-700 dark:text-[#e0e0e0] mb-2">Welcome to the Chat App 👋</h1>
          <p className="text-gray-500 dark:text-[#a0a0a0]">Select a user from the sidebar to start chatting.</p>
          <p className="text-sm mt-2 text-gray-400 dark:text-[#808080]">Your conversations will appear here.</p>
        </div>
      ) : (
        <>
          {/* Chat Header */}
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="sticky top-[60px] z-40 border border-gray-400 mt-5 p-2 bg-white flex justify-between items-center gap-4 dark:bg-[#0a0a0a] dark:text-[#e0e0e0] dark:border-[#2d2d2d] shadow-sm"
          >
            {/* Left: User Icon + Name */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-300 dark:bg-[#1a1a1a] rounded-md flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600 dark:text-[#e0e0e0]">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-[#e0e0e0]">{selectedUser.name}</h1>
            </div>

            {/* Right: Search + Info */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:bg-[#1a1a1a] dark:text-[#e0e0e0] dark:border-[#2d2d2d] dark:placeholder:text-[#808080]"
              />
              <Button variant="ghost" size="icon" onClick={() => setShowAbout(true)} className="hover:bg-gray-100 dark:hover:bg-[#1a1a1a]">
                <Info className="w-6 h-6 text-gray-600 dark:text-[#e0e0e0]" />
              </Button>
            </div>
          </motion.div>

          <div className="flex-1 overflow-y-auto">
            <ChatMsg
              filteredMessages={filteredMessages}
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              currentUser={currentUser}
              selectedUser={selectedUser}
            />
          </div>

          {/* About Modal */}
          {showAbout && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 z-50">
              <div className="bg-white dark:bg-[#0a0a0a] rounded-xl shadow-2xl w-96 p-6 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAbout(false)}
                  className="absolute top-2 right-2 hover:bg-gray-200 dark:hover:bg-[#1a1a1a] rounded-full"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-[#e0e0e0]" />
                </Button>

                {currentUser ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-24 h-24 rounded-full bg-black dark:bg-[#1a1a1a] mx-auto flex items-center justify-center text-white dark:text-[#e0e0e0] text-4xl font-bold mb-4 shadow-md">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-[#e0e0e0]">{selectedUser.name}</h2>
                      <p className="text-gray-500 dark:text-[#a0a0a0] text-sm">{selectedUser.email}</p>
                    </div>

                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-center text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-[#1a1a1a]"
                        onClick={handleClearChat}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Clearing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear Chat History
                          </>
                        )}
                      </Button>

                      <Button
                        variant="destructive"
                        className="w-full justify-center"
                        onClick={handleDeleteUser}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-[#a0a0a0] mb-2" />
                    <p className="text-gray-500 dark:text-[#a0a0a0]">Loading user data...</p>
                  </div>
                )}
              </div>
            </div>
          )}

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
                  ) : users.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-[#a0a0a0]">No matching users found</p>
                  ) : (
                    users.map((user) => (
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
                          className="hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
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
        </>
      )}
    </div>
  );
};