"use client";
import React, { useState } from 'react';
import { LogOut, Trash2, X, Loader2, UserCog2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User } from '@/app/types';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { CopilotChatIcon } from '@/components/ui/icon';

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
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      window.location.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    console.log('Clear chat clicked');
  };

  const getUserId = (user: User) => user._id || user.id;

  return (
    <div className="relative bg-white dark:bg-[#0a0a0a] rounded-b-2xl shadow-sm z-10">

      {/* Sidebar Toggle Button */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="absolute left-2 sm:left-4 z-20 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-all sm:inline-flex"
        >
          <CopilotChatIcon />
        </Button>
      )}

      {/* Theme Toggle */}
      <div className="absolute right-12 sm:right-16 z-20">
        <ThemeToggle />
      </div>

      {/* About Button */}
      <Button
  variant="ghost"
  size="icon"
  onClick={() => {
    console.log("About clicked");
    setShowAbout(true);
  }}
  className="absolute right-2 sm:right-4 z-[9999] bg-white dark:bg-[#0a0a0a] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] rounded-full transition-all"
>
  <UserCog2 className="h-5 w-5 sm:h-6 sm:w-6 z-20 text-black dark:text-[#e0e0e0]" />
</Button>


      {/* User Switch Row */}
      <div className="rotate-180">
        <div className="w-full h-10 sm:h-12 relative overflow-hidden bg-white dark:bg-[#0a0a0a] dark:text-[#e0e0e0] rounded-b-2xl shadow">
          <div
            className="absolute inset-0 bg-black dark:bg-[#1a1a1a] rounded-xl"
            style={{
              clipPath: "polygon(25% 0%, 75% 0%, 85% 100%, 15% 100%)",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-2 sm:gap-3 rotate-180">
              {Array.isArray(chatUsers) && chatUsers.length > 0 ? (
                chatUsers.map((user, index) => {
                  const isSelected = selectedUser && getUserId(selectedUser) === getUserId(user);
                  return (
                    <Button
                      key={`${getUserId(user)}-${index}`}
                      title={user.email}
                      variant="ghost"
                      className={`w-7 h-7 sm:w-9 sm:h-9 p-0 rounded-md bg-white dark:bg-[#0a0a0a] hover:bg-gray-200 dark:hover:bg-[#1a1a1a]
                        text-black dark:text-[#e0e0e0] text-sm sm:text-base font-semibold shadow-md transition-all ease-in-out duration-200 
                        ${isSelected ? 'ring-2 ring-white dark:ring-[#2d2d2d] scale-110' : 'opacity-60 hover:opacity-90'}`}
                      onClick={() => onUserSelect(user)}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </Button>
                  );
                })
              ) : (
                <span className="text-white dark:text-[#e0e0e0] text-sm sm:text-base">No Users</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 z-[9999]">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-xl shadow-2xl w-[90%] max-w-[384px] p-4 sm:p-6 relative mx-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAbout(false)}
              className="absolute top-2 right-2 hover:bg-gray-200 dark:hover:bg-[#1a1a1a] rounded-full"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-[#e0e0e0]" />
            </Button>

            {currentUser ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-black dark:bg-[#1a1a1a] mx-auto flex items-center justify-center text-white dark:text-[#e0e0e0] text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 shadow-md">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-[#e0e0e0]">{currentUser.name}</h2>
                  <p className="text-gray-500 dark:text-[#a0a0a0] text-xs sm:text-sm">{currentUser.email}</p>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-center text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-[#1a1a1a] text-sm sm:text-base"
                    onClick={handleClearChat}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Chat History
                  </Button>

                  <Button
                    variant="destructive"
                    className="w-full justify-center text-sm sm:text-base"
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
              <div className="flex flex-col items-center py-8 sm:py-10">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-gray-400 mb-2" />
                <p className="text-gray-500 dark:text-[#a0a0a0] text-sm sm:text-base">Loading user data...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
