"use client";
import React, { useState } from 'react';
import {
  Menu, User as UserIcon, LogOut, Trash2, X, Loader2,
  Info,
  UserCog,
  UserCog2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User } from '@/app/types';
import { useRouter } from 'next/navigation';
import { getSession } from "@/lib/auth";

interface NavbarProps {
  onMenuClick: () => void;
  selectedUser: User | null;
  chatUsers: User[];
  isOpen: boolean;
  onUserSelect: (user: User) => void;
  currentUser: User | null;
}

const Navbar: React.FC<NavbarProps> = ({
  onMenuClick,
  selectedUser,
  chatUsers = [],
  isOpen,
  onUserSelect,
  currentUser
}) => {
  const [showAbout, setShowAbout] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      
      // Call logout API
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important: include credentials
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      // Clear all client-side storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear any cookies that might be set
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Force a complete page reload and redirect
      window.location.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    console.log('Clear chat clicked');
  };

  return (
    <div className="relative bg-white rounded-b-2xl shadow-sm z-10">
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="absolute top-2 left-4 z-20 hover:bg-gray-100 transition-all"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* About Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowAbout(true)}
        className="absolute top-2 right-4 z-20 bg-white hover:bg-gray-100 rounded-full transition-all"
      >
        <UserCog2 className="h-6 w-6 text-black" />
      </Button>

      {/* User Switch Row */}
      <div className="rotate-180">
        <div className="w-full h-12 relative overflow-hidden bg-white rounded-b-2xl shadow">
          <div
            className="absolute inset-0 bg-black rounded-xl"
            style={{
              clipPath: "polygon(25% 0%, 75% 0%, 85% 100%, 15% 100%)",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-3 rotate-180">
              {Array.isArray(chatUsers) && chatUsers.length > 0 ? (
                chatUsers.map((user, index) => {
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <Button
                      key={`${user.id}-${index}`}
                      title={user.email}
                      variant="ghost"
                      className={`w-9 h-9 p-0 rounded-md bg-white hover:bg-gray-200 
                        text-black font-semibold shadow-md transition-all ease-in-out duration-200 
                        ${isSelected ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-90'}
                      `}
                      onClick={() => onUserSelect(user)}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </Button>
                  );
                })
              ) : (
                <span className="text-white">No Users</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-24 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-96 p-6 relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAbout(false)}
              className="absolute top-2 right-2 hover:bg-gray-200 rounded-full"
            >
              <X className="h-5 w-5 text-gray-600" />
            </Button>

            {currentUser ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-black mx-auto flex items-center justify-center text-white text-4xl font-bold mb-4 shadow-md">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">{currentUser.name}</h2>
                  <p className="text-gray-500 text-sm">{currentUser.email}</p>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50"
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
                <Loader2 className="h-6 w-6 animate-spin text-gray-400 mb-2" />
                <p className="text-gray-500">Loading user data...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
