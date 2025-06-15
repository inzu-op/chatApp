import { FC, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { User } from "@/app/types";
import Navbar from "./Navbar";
import { Trash2, X, UserCircle, Info, Loader2, LogOut, UserPlus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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
}

export const ChatWindow: FC<ChatWindowProps> = ({
  isOpen,
  selectedUser,
  setIsOpen,
  currentUserId,
  setSelectedUser,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
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

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { sender: "me", text: input }]);
    setInput("");
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleDeleteChat = () => {
    setMessages([]);
    setSelectedUser(null);
    setShowAbout(false);
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: currentUserId }),
      });

      if (res.ok) {
        setCurrentUser(null);
        setMessages([]);
        setSelectedUser(null);
        setShowAbout(false);
      } else {
        console.error("Error logging out");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMessages = messages.filter((msg) =>
    msg.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <Navbar
        onMenuClick={() => setIsOpen(true)}
        selectedUser={selectedUser}
        chatUsers={chatUsers}
        isOpen={isOpen}
        onUserSelect={setSelectedUser}
        currentUser={currentUser}
      />

      {!selectedUser ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 text-center px-4 dark:bg-[#0a0a0a] dark:text-[#e0e0e0]">
          <h1 className="text-2xl font-bold text-gray-700 dark:text-[#e0e0e0] mb-2">Welcome to the Chat App 👋</h1>
          <p className="text-gray-500 dark:text-[#a0a0a0]">Select a user from the sidebar to start chatting.</p>
          <p className="text-sm mt-2 text-gray-400 dark:text-[#808080]">Your conversations will appear here.</p>
        </div>
      ) : (
        <>
          {/* Chat Header */}
          <div className="border border-gray-400 mt-5 p-2 bg-white flex justify-between items-center gap-4 dark:bg-[#0a0a0a] dark:text-[#e0e0e0] dark:border-[#2d2d2d]">
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
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-100 dark:bg-[#0a0a0a] dark:text-[#e0e0e0]">
            {filteredMessages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-[#a0a0a0]">No messages found ✨</div>
            ) : (
              filteredMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`p-3 rounded-2xl shadow max-w-xs ${
                      msg.sender === "me"
                        ? "bg-blue-600 text-white dark:bg-[#1a1a1a] dark:text-[#e0e0e0]"
                        : "bg-white text-gray-800 dark:bg-[#1a1a1a] dark:text-[#e0e0e0]"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 bg-white border-t border-gray-400 flex items-center gap-2 dark:bg-[#0a0a0a] dark:text-[#e0e0e0] dark:border-gray-900">
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:bg-[#1a1a1a] dark:text-[#e0e0e0] dark:border-[#2d2d2d] dark:placeholder:text-[#808080]"
            />
            <Button onClick={handleSend}>Send</Button>
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
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear Chat History
                      </Button>

                      <Button
                        variant="destructive"
                        className="w-full justify-center"
                        onClick={handleLogout}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Logging out...
                          </>
                        ) : (
                          <>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
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
                        key={user._id}
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
                          onClick={() => addUserToChat(user._id)}
                          disabled={addingUserId === user._id}
                          className="hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
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
        </>
      )}
    </div>
  );
};
