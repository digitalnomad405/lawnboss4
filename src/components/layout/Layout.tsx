import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const Layout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Desktop sidebar - fixed position */}
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-[256px] lg:block">
        <Sidebar />
      </aside>

      {/* Mobile sidebar - handled by Sidebar component */}
      <div className="lg:hidden">
        <Sidebar />
      </div>

      {/* Main content wrapper */}
      <div className="flex flex-1 flex-col lg:pl-[256px]">
        <Topbar />
        <main className="relative flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}; 