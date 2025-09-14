"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { LayoutDashboard, PenBox, Loader2, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingTransaction, setLoadingTransaction] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);

  useEffect(() => {
    // When route changes to /dashboard, stop loading
    if (pathname === '/dashboard') {
      setLoadingDashboard(false);
    }
    // When route changes to /transaction/create, stop loading
    if (pathname === '/transaction/create') {
      setLoadingTransaction(false);
      setProgressWidth(0);
    }
  }, [pathname]);

  useEffect(() => {
    if (loadingTransaction) {
      const interval = setInterval(() => {
        setProgressWidth(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [loadingTransaction]);

  const handleDashboardClick = (e) => {
    e.preventDefault();
    setLoadingDashboard(true);
    router.push('/dashboard');
  };

  const handleTransactionClick = (e) => {
    e.preventDefault();
    setLoadingTransaction(true);
    setProgressWidth(0);
    router.push('/transaction/create');
  };

  return (
    <div className='fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b'>
      <nav className='container mx-auto px-4 py-4 flex items-center justify-between'>
        <a href="/">
          <Image
            src={"/logo.png"} alt='wealth logo' height={60} width={200}
            className='h-12 w-auto object-contain'
          />
        </a>

      <div className='flex items-center space-x-4'>
        <SignedIn>
          <Button
            variant="outline"
            className='text-gray-600 hover:text-blue-600 flex items-center gap-2 cursor-pointer'
            onClick={handleDashboardClick}
            disabled={loadingDashboard} 
          >
            {loadingDashboard ? <Loader2 className="animate-spin h-5 w-5" /> : <LayoutDashboard size={18} />}
            <span className='hidden md:inline'>Dashboard</span>
          </Button>

          <Button
            className="flex items-center gap-2 cursor-pointer"
            onClick={handleTransactionClick}
            disabled={loadingTransaction}
          >
            {loadingTransaction ? (
              <div className="w-4 h-1 bg-gray-200 rounded">
                <div
                  className="h-full bg-red-500 rounded transition-all duration-100"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
            ) : (
              <PenBox size={18} />
            )}
            <span className='hidden md:inline'>Add Transaction</span>
          </Button>
        </SignedIn>

      <SignedOut>
        <SignInButton forceRedirectUrl='/dashboard'>
          <Button variant="outline">Login</Button>
        </SignInButton>
      </SignedOut>

      {/* Theme Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="w-10 h-10"
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </Button>

      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-10 h-10",
            },
          }}
        />
      </SignedIn>
      </div>
      </nav>
    </div>
  );
};

export default Header;
