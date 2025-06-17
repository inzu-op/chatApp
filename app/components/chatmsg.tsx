"use client";
import { FC, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { User } from "@/app/types";
import { motion } from "framer-motion";

interface Message {
  sender: "me" | "them";
  text: string;
  timestamp: Date;
  read?: boolean;
}

interface ChatMsgProps {
  filteredMessages: Message[];
  input: string;
  setInput: (input: string) => void;
  handleSend: () => void;
  currentUser: User | null;
  selectedUser: User | null;
}

const ChatMsg: FC<ChatMsgProps> = ({
  filteredMessages,
  input,
  setInput,
  handleSend,
  currentUser,
  selectedUser,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [filteredMessages]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        handleSend();
      }
    }
  };

  const getMessageUser = (msg: Message) => {
    return msg.sender === "me" ? currentUser : selectedUser;
  };

  return (
    <div className="h-full flex-1 flex flex-col bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMessages.map((msg, index) => {
          const messageUser = getMessageUser(msg);
          const isMe = msg.sender === "me";

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex ${isMe ? "justify-end" : "justify-start"} w-full`}
            >
              {/* Left-side avatar for 'them' */}
              {!isMe && messageUser && (
                <div className="mr-2 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-300 mt-2 dark:bg-[#1a1a1a] flex items-center justify-center text-sm font-medium text-gray-600 dark:text-[#e0e0e0]">
                    {messageUser.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}

              {/* Chat bubble */}
              <div
                className={`max-w-[40%] p-3 rounded-xl shadow-sm transition-all duration-200 break-words
                ${isMe
                  ? "bg-zinc-300 text-black font-medium dark:bg-zinc-800 dark:text-white rounded-br-none"
                  : "bg-zinc-400 font-medium text-black dark:bg-[#1a1a1a] dark:text-[#e0e0e0] rounded-bl-none"}`}
              >
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>

              {/* Right-side avatar for 'me' */}
              {isMe && messageUser && (
                <div className="ml-2 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-black mt-2 dark:bg-zinc-800 flex items-center justify-center text-sm font-medium text-white">
                    {messageUser.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-gray-400 border dark:border-[#2d2d2d] p-4 bg-white dark:bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message..."
            className="flex-1 dark:bg-[#1a1a1a] dark:text-[#e0e0e0] dark:border-[#2d2d2d] dark:placeholder:text-[#808080]"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-black hover:bg-black text-white dark:bg-zinc-600 dark:hover:bg-zinc-700"
          >
            <Send className="h-4 w-4 dark:text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatMsg;