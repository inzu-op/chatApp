import { FC, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { User } from "@/app/types";
import Navbar from "./Navbar";
import { Trash2, X, Info, Loader2, UserPlus, Search, UserMinus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import ChatMsg from "./chatmsg";
import { motion } from "framer-motion";
import { io, Socket } from "socket.io-client";

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
  read?: boolean;
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
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: boolean }>({});
  const socketRef = useRef<Socket | null>(null);

  const getUserId = (user: User) => user?._id || user?.id;

  const [chatWindowHeight, setChatWindowHeight] = useState('100vh');
  useEffect(() => {
    const updateHeight = () => {
      if (window.innerWidth < 640) setChatWindowHeight('100dvh');
      else if (window.innerWidth < 1024) setChatWindowHeight('calc(100dvh - 48px)');
      else setChatWindowHeight('100vh');
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    socketRef.current = io('http://localhost:3000', {
      path: '/api/socket',
      transports: ['polling', 'websocket'],
      reconnection: true,
      query: { userId: currentUserId }
    });

    const socket = socketRef.current;
    socket.on('connect', () => socket.emit('join-chat', currentUserId));
    socket.on('connect_error', () => toast.error('Socket connection failed'));

    socket.on('new-message', (data) => {
      if (selectedUser && (data.senderId === getUserId(selectedUser) || data.receiverId === getUserId(selectedUser))) {
        const userId = getUserId(selectedUser);
        setMessagesByUser(prev => ({
          ...prev,
          [userId]: [...(prev[userId] || []), {
            sender: data.senderId === currentUserId ? 'me' : 'them',
            text: data.text,
            timestamp: new Date(data.timestamp),
            read: false,
          }]
        }));
      }
    });

    socket.on('typing', (data) => {
      if (data.userId !== currentUserId) {
        setTypingUsers(prev => ({ ...prev, [data.userId]: true }));
        setTimeout(() => setTypingUsers(prev => ({ ...prev, [data.userId]: false })), 3000);
      }
    });

    return () => {
      if (socket.connected) {
        socket.emit('leave-chat', currentUserId);
        socket.disconnect();
      }
    };
  }, [currentUserId, selectedUser]);

  useEffect(() => {
    if (!selectedUser || !getUserId(selectedUser) || !currentUserId) return;
    const fetchInitialMessages = async () => {
      try {
        const res = await fetch(`/api/messages?userId=${getUserId(selectedUser)}&currentUserId=${currentUserId}`);
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
      } catch {
        toast.error('Failed to fetch messages');
      }
    };
    fetchInitialMessages();
  }, [selectedUser, currentUserId]);

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch(`/api/users/${currentUserId}`);
      const data = await res.json();
      if (res.ok) setCurrentUser(data);
    };
    if (currentUserId) fetchUser();
  }, [currentUserId]);

  useEffect(() => {
    const fetchChatUsers = async () => {
      try {
        const res = await fetch(`/api/users/chat-users?userId=${currentUserId}`);
        const data = await res.json();
        if (res.ok) setChatUsers(data);
      } catch {}
    };
    fetchChatUsers();
    const interval = setInterval(fetchChatUsers, 5000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  const handleSend = async () => {
    if (!input.trim() || !selectedUser || !currentUserId) {
      toast.error("Please select a valid user to chat with");
      return;
    }

    const messageData = {
      text: input.trim(),
      receiverId: getUserId(selectedUser),
      senderId: currentUserId,
      timestamp: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });

      if (!res.ok) throw new Error('Send failed');

      if (socketRef.current?.connected) {
        socketRef.current.emit('send-message', messageData);
      }

      const userId = getUserId(selectedUser);
      setMessagesByUser(prev => ({
        ...prev,
        [userId]: [...(prev[userId] || []), {
          sender: 'me',
          text: input.trim(),
          timestamp: new Date(),
          read: false
        }]
      }));
      setInput('');
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (selectedUser && socketRef.current?.connected) {
      socketRef.current.emit('typing', {
        userId: currentUserId,
        receiverId: getUserId(selectedUser)
      });
    }
  };

  const filteredMessages = selectedUser && getUserId(selectedUser)
    ? (messagesByUser[getUserId(selectedUser)] || []).filter((msg) =>
      msg.text.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : [];

  const handleClearChat = async () => {
    if (!selectedUser || !currentUserId) return;
    
    try {
      const res = await fetch('/api/messages/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          targetUserId: getUserId(selectedUser),
        })
        
      });
  

      if (!res.ok) throw new Error('Failed to clear chat');
      
      // Clear messages from state
      setMessagesByUser(prev => ({
        ...prev,
        [getUserId(selectedUser)]: []
      }));

      
      toast.success('Chat cleared successfully');
    } catch (error) {
      toast.error('Failed to clear chat');
    }
    setShowAbout(false)
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !currentUserId) return;
  
    try {
      const res = await fetch('/api/users/remove-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          targetUserId: getUserId(selectedUser)
        })
      });
  
      if (!res.ok) throw new Error('Failed to remove user');
  
      // Remove user from chat list
      setChatUsers(prev => prev.filter(user => getUserId(user) !== getUserId(selectedUser)));
  
      // Remove user messages
      setMessagesByUser(prev => {
        const newState = { ...prev };
        delete newState[getUserId(selectedUser)];
        return newState;
      });
  
      // 🔥 Close modal first
      setShowAbout(false);
  
      // Close chat window
      setIsOpen(false);
      setSelectedUser(null);
  
      toast.success('User removed successfully');
    } catch (error) {
      toast.error('Failed to remove user');
    }
  };
  

  return (
    <div className="flex-1 flex flex-col dark:bg-[#0a0a0a] dark:text-[#e0e0e0]" style={{ height: chatWindowHeight, minHeight: 0 }}>
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
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-lg md:text-2xl font-bold text-gray-700 dark:text-[#e0e0e0] mb-2">Welcome to the Chat App 👋</h1>
          <p className="text-gray-500 dark:text-[#a0a0a0] text-sm md:text-base">Select a user from the sidebar to start chatting.</p>
        </div>
      ) : (
        <>
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="sticky top-[60px] z-40 border border-gray-400 mt-3 md:mt-5 px-2 md:px-4 py-2 bg-white flex justify-between items-center gap-2 md:gap-4 dark:bg-[#0a0a0a] dark:text-[#e0e0e0] dark:border-[#2d2d2d] shadow-sm"
          >
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 bg-gray-300 dark:bg-[#1a1a1a] rounded-md flex items-center justify-center">
                <span className="text-sm md:text-base font-medium text-gray-600 dark:text-[#e0e0e0]">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h1 className="text-base md:text-xl font-bold text-gray-800 dark:text-[#e0e0e0] truncate">{selectedUser.name}</h1>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-2 py-1 md:px-4 md:py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm md:text-base dark:bg-[#1a1a1a] dark:text-[#e0e0e0] dark:border-[#2d2d2d] dark:placeholder:text-[#808080]"
              />
              <Button variant="ghost" size="icon" onClick={() => setShowAbout(true)} className="hover:bg-gray-100 dark:hover:bg-[#1a1a1a]">
                <Info className="w-6 h-6 text-gray-600 dark:text-[#e0e0e0]" />
              </Button>
            </div>
          </motion.div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <ChatMsg
              filteredMessages={filteredMessages}
              input={input}
              setInput={handleInputChange}
              handleSend={handleSend}
              currentUser={currentUser}
              selectedUser={selectedUser}
              isTyping={typingUsers[getUserId(selectedUser) || '']}
            />
          </div>
        </>
      )}

{showAbout && selectedUser && (
  <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center">
    <div className="bg-white dark:bg-[#1a1a1a] text-black dark:text-white rounded-xl p-6 max-w-sm w-full relative shadow-lg">
      <button
        onClick={() => setShowAbout(false)}
        className="absolute top-2 right-2 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex flex-col items-center gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gray-400 dark:bg-[#2a2a2a] flex items-center justify-center text-xl font-bold text-white">
          {selectedUser?.name.charAt(0).toUpperCase()}
        </div>

        {/* User Name */}
        <h2 className="text-xl font-semibold">{selectedUser?.name}</h2>

        {/* Description */}
        <p className="text-sm text-center text-gray-600 dark:text-gray-300">
          {selectedUser?.email}
        </p>

        <div className="flex flex-col gap-2 w-full mt-4">
          <Button
            variant="secondary"
            onClick={handleClearChat}
          >
            🧹 Clear Chat
          </Button>

          <Button
            variant="destructive"
            onClick={handleDeleteUser}
          >
            🗑️ Delete User
          </Button>
        </div>
      </div>
    </div>
  </div>
)}

    </div>
  );
};
