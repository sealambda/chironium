import { CustomerCard, type Customer } from '@/components/customers/customer-card';

// Mock data for demo purposes.
const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    avatarUrl: '',
    initials: 'SM',
    status: 'up-to-date',
    membership: {
      startDate: new Date('2025-02-15'),
      planDurationMonths: 12,
      endDate: new Date('2026-08-15'),
    },
    lastReview: {
      date: new Date('2026-01-15'),
      label: 'Jan 15',
    },
    reports: {
      frequency: 'Weekly',
      nextDate: new Date('2026-01-21'),
      nextLabel: 'Jan 21',
    },
  },
  {
    id: '2',
    name: 'Marcus Rodriguez',
    avatarUrl: '',
    initials: 'MR',
    status: 'needs-attention',
    membership: {
      startDate: new Date('2025-06-01'),
      planDurationMonths: 6,
      endDate: new Date('2025-12-01'),
    },
    lastReview: {
      date: new Date('2026-01-08'),
      label: 'Jan 8',
    },
    reports: {
      frequency: 'Bi-weekly',
      nextDate: new Date('2026-01-24'),
      nextLabel: 'Jan 24',
    },
  },
  {
    id: '3',
    name: 'Emily Chen',
    avatarUrl: '',
    initials: 'EC',
    status: 'up-to-date',
    membership: {
      startDate: new Date('2025-09-01'),
      planDurationMonths: 12,
      endDate: new Date('2026-09-01'),
    },
    lastReview: {
      date: new Date('2026-01-18'),
      label: 'Jan 18',
    },
    reports: {
      frequency: 'Monthly',
      nextDate: new Date('2026-02-01'),
      nextLabel: 'Feb 1',
    },
  },
  {
    id: '4',
    name: 'David Park',
    avatarUrl: '',
    initials: 'DP',
    status: 'overdue',
    membership: {
      startDate: new Date('2025-03-15'),
      planDurationMonths: 12,
      endDate: new Date('2026-03-15'),
    },
    lastReview: {
      date: new Date('2025-12-20'),
      label: 'Dec 20',
    },
    reports: {
      frequency: 'Weekly',
      nextDate: new Date('2026-01-19'),
      nextLabel: 'Jan 19',
    },
  },
];

/**
 * Customers page displaying a scrollable list of customer cards.
 */
export function CustomersPage() {
  return (
    <div className="space-y-4 pt-2">
      {/* Page header. */}
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold uppercase tracking-wide text-foreground">Customers</h1>
        <span className="text-sm text-muted-foreground">{mockCustomers.length} total</span>
      </header>

      {/* Customer cards list. */}
      <div className="space-y-3">
        {mockCustomers.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            onEmailClick={() => console.log(`Email ${customer.name}`)}
            onWhatsAppClick={() => console.log(`WhatsApp ${customer.name}`)}
            onCallClick={() => console.log(`Call ${customer.name}`)}
          />
        ))}
      </div>
    </div>
  );
}
