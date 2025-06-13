import { FC, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { User } from "@/app/types";
import Navbar from "./Navbar";
import { Trash2, X, UserCircle, Info } from "lucide-react";

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

  const filteredMessages = messages.filter((msg) =>
    msg.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col">
      <Navbar
        onMenuClick={() => setIsOpen(true)}
        selectedUser={selectedUser}
        chatUsers={chatUsers}
        isOpen={isOpen}
        onUserSelect={setSelectedUser}
        currentUser={currentUser}
      />

      {!selectedUser ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 text-center px-4">
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Welcome to the Chat App 👋</h1>
          <p className="text-gray-500">Select a user from the sidebar to start chatting.</p>
          <p className="text-sm mt-2 text-gray-400">Your conversations will appear here.</p>
        </div>
      ) : (
        <>
          {/* Chat Header */}
          <div className="border border-gray-400 mt-5 p-4 bg-white flex justify-between items-center gap-4">
  {/* Left: User Icon + Name */}
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 bg-gray-300 rounded-md flex items-center justify-center">
      <span className="rounded-md text-sm font-medium text-gray-600">
        {selectedUser.name.charAt(0).toUpperCase()}
      </span>
    </div>
    <h1 className="text-xl font-bold text-gray-800">{selectedUser.name}</h1>
  </div>

  {/* Right: Search + Info */}
  <div className="flex items-center gap-3">
    <input
      type="text"
      placeholder="Search messages..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
    />
    <Button variant="ghost" size="icon" onClick={() => setShowAbout(true)}>
      <Info className="w-6 h-6 text-gray-600" />
    </Button>
  </div>
</div>



          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-100">
            {filteredMessages.length === 0 ? (
              <div className="text-center text-gray-500">No messages found ✨</div>
            ) : (
              filteredMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`p-3 rounded-2xl shadow max-w-xs ${
                      msg.sender === "me"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-800"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 bg-white border-t border-gray-400 flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
            <Button onClick={handleSend}>Send</Button>
          </div>

          {/* About Modal */}
          {showAbout && selectedUser && (
            <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-start pt-24">
              <div className="bg-white rounded-xl shadow-xl w-96 p-6 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAbout(false)}
                  className="absolute top-2 right-2 hover:bg-gray-200 rounded-full"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </Button>

                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-black mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-md">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">{selectedUser.name}</h2>
                </div>

                <div className="mt-6 space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-center text-black hover:bg-blue-50"
                    onClick={handleClearChat}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Chat
                  </Button>

                  <Button
                    variant="destructive"
                    className="w-full justify-center"
                    onClick={handleDeleteChat}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Chat
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-center text-gray-600"
                    onClick={() => setShowAbout(false)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
