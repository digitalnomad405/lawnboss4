import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  CalendarDaysIcon,
  CalculatorIcon,
  WrenchScrewdriverIcon,
  UsersIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '../ui/Icon';

const navigation = [
  { name: 'Dashboard', icon: HomeIcon, href: '/' },
  { name: 'Services', icon: CalendarDaysIcon, href: '/services' },
  { name: 'Properties', icon: BuildingOfficeIcon, href: '/properties' },
  { name: 'Customers', icon: UserGroupIcon, href: '/customers' },
  { name: 'Technicians', icon: WrenchScrewdriverIcon, href: '/technicians' },
  { name: 'Crews', icon: UsersIcon, href: '/crews' },
  { name: 'Estimates', icon: CalculatorIcon, href: '/estimates' },
  { name: 'Finances', icon: CurrencyDollarIcon, href: '/finances' },
  { name: 'Invoices', icon: DocumentTextIcon, href: '/invoices' },
  { name: 'Messages', icon: EnvelopeIcon, href: '/messages' },
  { name: 'Settings', icon: Cog6ToothIcon, href: '/settings' },
];

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const NavItem = ({ item }: { item: typeof navigation[0] }) => (
    <NavLink
      to={item.href}
      onClick={() => setIsOpen(false)}
      className={({ isActive }) =>
        `flex items-center rounded-lg px-6 py-3 text-base font-medium transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
          isActive
            ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400'
            : 'text-gray-700 dark:text-gray-300'
        }`
      }
    >
      <Icon icon={item.icon} className="mr-4" size="lg" />
      <span>{item.name}</span>
    </NavLink>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg bg-white p-2 shadow-lg dark:bg-gray-800"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          <Icon icon={isOpen ? XMarkIcon : Bars3Icon} />
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="flex h-full flex-col border-r border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-6 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            LawnBoss
          </h1>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <nav className="space-y-1 p-4">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            />

            {/* Sliding sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-40 w-[256px] bg-white shadow-xl dark:bg-gray-800 lg:hidden"
            >
              <div className="flex h-full flex-col">
                {/* Logo */}
                <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-6 dark:border-gray-700">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    LawnBoss
                  </h1>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto">
                  <nav className="space-y-1 p-4">
                    {navigation.map((item) => (
                      <NavItem key={item.name} item={item} />
                    ))}
                  </nav>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}; 