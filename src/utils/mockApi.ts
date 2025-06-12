import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mock = new MockAdapter(axios, { delayResponse: 750 });

type Job = {
  id: string;
  customer: string;
  service: string;
  date: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  amount: number;
};

const recentJobs: Job[] = [
  {
    id: '1',
    customer: 'John Smith',
    service: 'Lawn Mowing',
    date: '2024-03-15',
    status: 'Completed',
    amount: 75,
  },
  {
    id: '2',
    customer: 'Sarah Johnson',
    service: 'Garden Maintenance',
    date: '2024-03-16',
    status: 'In Progress',
    amount: 120,
  },
  {
    id: '3',
    customer: 'Mike Brown',
    service: 'Tree Trimming',
    date: '2024-03-17',
    status: 'Scheduled',
    amount: 200,
  },
  {
    id: '4',
    customer: 'Emily Davis',
    service: 'Lawn Mowing',
    date: '2024-03-18',
    status: 'Scheduled',
    amount: 75,
  },
];

// Mock API endpoints
mock.onGet('/api/jobs/recent').reply(200, recentJobs);

// API client
export const mockApi = {
  getRecentJobs: () => Promise.resolve(recentJobs),
}; 