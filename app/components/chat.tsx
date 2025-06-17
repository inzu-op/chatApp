import { FC, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { User } from "@/app/types";
import Navbar from "./Navbar";
import { Trash2, X, Info, Loader2, UserPlus, Search } from "lucide-react";
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
  const [isAddUserPopupOpen, setIsAddUserPopupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: boolean }>({});
  const socketRef = useRef<Socket | null>(null);

  const getUserId = (user: User) => user?._id || user?.id;

  // --- Responsive height for chat window ---
  // Handles resizing for mobile/tablet/desktop
  const [chatWindowHeight, setChatWindowHeight] = useState('100vh');
  useEffect(() => {
    function updateHeight() {
      if (window.innerWidth < 640) {
        setChatWindowHeight('100dvh');
      } else if (window.innerWidth < 1024) {
        setChatWindowHeight('calc(100dvh - 48px)');
      } else {
        setChatWindowHeight('100vh');
      }
    }
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);
  // ----------------------------------------

  // Initialize socket connection
  useEffect(() => {
    if (!currentUserId) return;

    socketRef.current = io('http://localhost:3000', {
      path: '/api/socket',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,
      query: { userId: currentUserId }
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      socket.emit('join-chat', currentUserId);
    });

    socket.on('disconnect', (reason) => {
      // Handle disconnect
    });

    socket.on('connect_error', () => {
      toast.error('Connection error. Please refresh the page.');
    });

    socket.on('new-message', (data) => {
      if (selectedUser && (data.senderId === getUserId(selectedUser) || data.receiverId === getUserId(selectedUser))) {
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
    });

    socket.on('typing', (data) => {
      if (data.userId !== currentUserId) {
        setTypingUsers(prev => ({
          ...prev,
          [data.userId]: true
        }));
        setTimeout(() => {
          setTypingUsers(prev => ({
            ...prev,
            [data.userId]: false
          }));
        }, 3000);
      }
    });

    return () => {
      if (socket.connected) {
        socket.emit('leave-chat', currentUserId);
        socket.disconnect();
      }
    };
  }, [currentUserId, selectedUser]);

  // Fetch initial messages when a user is selected
  useEffect(() => {
    if (!selectedUser || !getUserId(selectedUser) || !currentUserId) return;

    const fetchInitialMessages = async () => {
      try {
        const userId = getUserId(selectedUser);
        const res = await fetch(`/api/messages?userId=${userId}&currentUserId=${currentUserId}`);
        if (!res.ok) throw new Error('Failed to fetch messages');
        const messages = await res.json();
        setMessagesByUser(prev => ({
          ...prev,
          [userId]: messages.map((msg: any) => ({
            sender: msg.sender._id === currentUserId ? 'me' : 'them',
            text: msg.text,
            timestamp: new Date(msg.timestamp),
            read: msg.read
          }))
        }));
      } catch (error) {
        toast.error('Failed to fetch messages');
      }
    };

    fetchInitialMessages();
  }, [selectedUser, currentUserId]);

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch(`/api/users/${currentUserId}`);
        const data = await res.json();
        if (res.ok) setCurrentUser(data);
      } catch (error) {}
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
      } catch (error) {}
    };

    fetchChatUsers();
    const interval = setInterval(fetchChatUsers, 5000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  // Handle sending messages
  const handleSend = async () => {
    if (!input.trim() || !selectedUser || !getUserId(selectedUser) || !currentUserId) {
      toast.error('Please select a valid user to chat with');
      return;
    }

    const receiverId = getUserId(selectedUser);

    try {
      const messageData = {
        text: input.trim(),
        receiverId,
        senderId: currentUserId,
        timestamp: new Date().toISOString()
      };

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

      // Send message through socket
      if (socketRef.current?.connected) {
        socketRef.current.emit('send-message', messageData);
      }

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
      toast.error('Failed to send message');
    }
  };

  const filteredMessages = selectedUser && getUserId(selectedUser)
    ? (messagesByUser[getUserId(selectedUser)] || []).filter((msg) =>
      msg.text.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : [];

  // Handle input changes for typing indicator
  const handleInputChange = (value: string) => {
    setInput(value);
    if (selectedUser && socketRef.current?.connected) {
      socketRef.current.emit('typing', {
        userId: currentUserId,
        receiverId: getUserId(selectedUser)
      });
    }
  };

  return (
    <div
      className="flex-1 flex flex-col dark:bg-[#0a0a0a] dark:text-[#e0e0e0]"
      style={{ height: chatWindowHeight, minHeight: 0 }} // For full height on all screens
    >
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
          <p className="text-xs md:text-sm mt-2 text-gray-400 dark:text-[#808080]">Your conversations will appear here.</p>
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
    </div>
  );
};