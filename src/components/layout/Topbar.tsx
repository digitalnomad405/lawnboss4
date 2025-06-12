import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { Icon } from '../ui/Icon';

export const Topbar = () => {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-end gap-4 border-b bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:px-6 lg:px-8">
      <button 
        className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        aria-label="Notifications"
      >
        <Icon icon={BellIcon} />
      </button>
      <button 
        className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        aria-label="User menu"
      >
        <Icon icon={UserCircleIcon} />
      </button>
    </header>
  );
}; 