import { useQuery } from '@tanstack/react-query';
import {
  CurrencyDollarIcon,
  BriefcaseIcon,
  UserGroupIcon,
  ClockIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { Icon } from '../components/ui/Icon';
import { mockApi } from '../utils/mockApi';

type Job = {
  id: string;
  customer: string;
  service: string;
  date: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  amount: number;
};

interface MetricCard {
  title: string;
  value: string;
  change: string;
  icon: typeof CurrencyDollarIcon;
  trend: 'up' | 'down';
}

const metrics: MetricCard[] = [
  {
    title: 'Revenue',
    value: '$24,000',
    change: '+4.75%',
    icon: CurrencyDollarIcon,
    trend: 'up',
  },
  {
    title: 'Active Jobs',
    value: '12',
    change: '+2',
    icon: BriefcaseIcon,
    trend: 'up',
  },
  {
    title: 'Customers',
    value: '48',
    change: '+5',
    icon: UserGroupIcon,
    trend: 'up',
  },
  {
    title: 'Avg. Response Time',
    value: '2.4h',
    change: '-0.5h',
    icon: ClockIcon,
    trend: 'down',
  },
];

const statusStyles = {
  Completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  Scheduled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
};

const Dashboard = () => {
  const { data: recentJobs = [], isLoading, error } = useQuery<Job[]>({
    queryKey: ['recentJobs'],
    queryFn: mockApi.getRecentJobs,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Dashboard
        </h1>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm transition-all hover:shadow-md dark:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {metric.title}
                </p>
                <p className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  {metric.value}
                </p>
              </div>
              <div
                className={`rounded-xl p-3 ${
                  metric.trend === 'up'
                    ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                }`}
              >
                <Icon icon={metric.icon} size="lg" />
              </div>
            </div>
            <div className="mt-4 flex items-center space-x-1">
              <Icon
                icon={metric.trend === 'up' ? ChevronUpIcon : ChevronDownIcon}
                size="sm"
                className={
                  metric.trend === 'up'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }
              />
              <span
                className={`text-sm font-medium ${
                  metric.trend === 'up'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Jobs Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Recent Jobs
          </h2>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500 dark:text-gray-400">Loading jobs...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-red-500 dark:text-red-400">Error loading jobs</div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {job.customer}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {job.service}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {job.date}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusStyles[job.status as keyof typeof statusStyles]
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        ${job.amount}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 