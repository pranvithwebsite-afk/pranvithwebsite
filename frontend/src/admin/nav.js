import {
  LayoutDashboard,
  Globe,
  BriefcaseBusiness,
  Box,
  Ticket,
  ShoppingBag,
  CreditCard,
  Users,
  BarChart3,
  ImageIcon,
  Settings,
  MessageSquare,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Website', to: '/admin/website', icon: Globe },
  { label: 'Services', to: '/admin/services', icon: BriefcaseBusiness },
  { label: 'Products/Assets', to: '/admin/products', icon: Box },
  { label: 'Coupons & Offers', to: '/admin/coupons', icon: Ticket },
  { label: 'Orders', to: '/admin/orders', icon: ShoppingBag },
  { label: 'Payment Attempts', to: '/admin/payments/payment-attempts', icon: CreditCard },
  { label: 'Customers', to: '/admin/customers', icon: Users },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Enquiries', to: '/admin/enquiries', icon: MessageSquare },
  { label: 'Media Library', to: '/admin/media', icon: ImageIcon },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

export default navItems;
