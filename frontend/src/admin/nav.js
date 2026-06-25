import {
  LayoutDashboard,
  Globe,
  BriefcaseBusiness,
  Box,
  ShoppingBag,
  Users,
  ImageIcon,
  Settings,
  MessageSquare,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Website', to: '/admin/website', icon: Globe },
  { label: 'Services', to: '/admin/services', icon: BriefcaseBusiness },
  { label: 'Products/Assets', to: '/admin/products', icon: Box },
  { label: 'Orders', to: '/admin/orders', icon: ShoppingBag },
  { label: 'Customers', to: '/admin/customers', icon: Users },
  { label: 'Enquiries', to: '/admin/enquiries', icon: MessageSquare },
  { label: 'Media Library', to: '/admin/media', icon: ImageIcon },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

export default navItems;
