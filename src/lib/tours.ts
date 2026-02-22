// =============================================================================
// Product Tour Definitions
// =============================================================================
// Defines guided tour steps for each dashboard role

export interface TourStep {
  id: string;
  target: string; // CSS selector for the element to highlight
  title: string;
  content: string;
  placement: "top" | "bottom" | "left" | "right" | "center";
  spotlightPadding?: number;
}

export interface TourDefinition {
  slug: string;
  title: string;
  description: string;
  role: string; // Which user role this tour targets
  steps: TourStep[];
}

export const TOUR_DEFINITIONS: Record<string, TourDefinition> = {
  owner_dashboard: {
    slug: "owner_dashboard",
    title: "Owner Dashboard Tour",
    description: "Learn how to manage your laundry business",
    role: "owner",
    steps: [
      {
        id: "welcome",
        target: "[data-tour='dashboard-header']",
        title: "Welcome to Your Dashboard",
        content:
          "This is your command center. Here you'll see key metrics about your business at a glance — revenue, orders, and customer activity.",
        placement: "bottom",
      },
      {
        id: "stats",
        target: "[data-tour='stats-grid']",
        title: "Business Metrics",
        content:
          "These cards show your real-time stats: total orders, revenue, active customers, and more. Click any card to drill into the details.",
        placement: "bottom",
      },
      {
        id: "orders",
        target: "[data-tour='nav-orders']",
        title: "Order Management",
        content:
          "View and manage all incoming orders. You can filter by status, assign drivers, and track each order through its lifecycle.",
        placement: "right",
      },
      {
        id: "staff",
        target: "[data-tour='nav-staff']",
        title: "Staff Management",
        content:
          "Add managers, attendants, and drivers. Each role has specific permissions tailored to their job responsibilities.",
        placement: "right",
      },
      {
        id: "analytics",
        target: "[data-tour='nav-analytics']",
        title: "Analytics & Reports",
        content:
          "Deep dive into your business performance with charts, trends, and exportable reports.",
        placement: "right",
      },
      {
        id: "settings",
        target: "[data-tour='nav-settings']",
        title: "Settings",
        content:
          "Configure your business profile, services, pricing, delivery areas, theme, and payment settings.",
        placement: "right",
      },
      {
        id: "launch-kit",
        target: "[data-tour='nav-launch-kit']",
        title: "Launch Kit",
        content:
          "Generate QR codes, social media posts, email templates, and flyers to promote your business.",
        placement: "right",
      },
    ],
  },

  customer_ordering: {
    slug: "customer_ordering",
    title: "How to Place an Order",
    description: "Walk through the customer ordering experience",
    role: "customer",
    steps: [
      {
        id: "welcome",
        target: "[data-tour='customer-header']",
        title: "Your Customer Dashboard",
        content:
          "Welcome! From here you can place new orders, track existing ones, and manage your account.",
        placement: "bottom",
      },
      {
        id: "new-order",
        target: "[data-tour='new-order-btn']",
        title: "Place a New Order",
        content:
          "Click here to schedule a pickup. Choose your services, set your preferences, and pick a time slot.",
        placement: "bottom",
      },
      {
        id: "order-history",
        target: "[data-tour='order-history']",
        title: "Order History",
        content:
          "Track all your orders here. You can see status updates, leave reviews, and add tips after delivery.",
        placement: "top",
      },
      {
        id: "preferences",
        target: "[data-tour='preferences']",
        title: "Your Preferences",
        content:
          "Save your laundry preferences (detergent, water temperature, folding style) so every order is just the way you like it.",
        placement: "right",
      },
    ],
  },

  driver_routes: {
    slug: "driver_routes",
    title: "Driver Routes Guide",
    description: "Learn to navigate your pickup and delivery routes",
    role: "driver",
    steps: [
      {
        id: "welcome",
        target: "[data-tour='driver-header']",
        title: "Your Driver Dashboard",
        content:
          "This is your daily hub. You'll see your assigned routes, upcoming stops, and earnings here.",
        placement: "bottom",
      },
      {
        id: "routes",
        target: "[data-tour='routes-list']",
        title: "Your Routes",
        content:
          "Each route shows the stops you need to make. Routes are optimized for the shortest travel time.",
        placement: "bottom",
      },
      {
        id: "navigation",
        target: "[data-tour='route-navigate']",
        title: "Turn-by-Turn Navigation",
        content:
          "Tap the navigate button to open directions in your preferred maps app.",
        placement: "top",
      },
      {
        id: "proof",
        target: "[data-tour='delivery-proof']",
        title: "Delivery Confirmation",
        content:
          "Take a photo and capture a signature to confirm each delivery. This protects both you and the customer.",
        placement: "top",
      },
      {
        id: "earnings",
        target: "[data-tour='nav-earnings']",
        title: "Earnings & Tips",
        content:
          "Track your earnings, tips received, and payout history right from the dashboard.",
        placement: "right",
      },
    ],
  },

  pos_counter: {
    slug: "pos_counter",
    title: "POS Counter Guide",
    description: "Learn to process walk-in customers at the counter",
    role: "attendant",
    steps: [
      {
        id: "welcome",
        target: "[data-tour='pos-header']",
        title: "Point of Sale",
        content:
          "Process walk-in orders and retail sales here. The interface is designed for fast, touch-friendly operation.",
        placement: "bottom",
      },
      {
        id: "new-sale",
        target: "[data-tour='pos-new-sale']",
        title: "Start a Sale",
        content:
          "Tap here to begin a new transaction. Add laundry services or retail products to the order.",
        placement: "bottom",
      },
      {
        id: "cart",
        target: "[data-tour='pos-cart']",
        title: "Order Cart",
        content:
          "Items appear here as you add them. Adjust quantities, apply discounts, or remove items.",
        placement: "left",
      },
      {
        id: "payment",
        target: "[data-tour='pos-payment']",
        title: "Accept Payment",
        content:
          "Process payments via card reader, cash, or split payment. Receipts are printed or emailed automatically.",
        placement: "top",
      },
      {
        id: "shift",
        target: "[data-tour='pos-shift']",
        title: "Shift Management",
        content:
          "Open and close your shift to track cash drawer amounts and daily sales totals.",
        placement: "right",
      },
    ],
  },

  manager_operations: {
    slug: "manager_operations",
    title: "Manager Operations Tour",
    description: "Learn to manage day-to-day operations",
    role: "manager",
    steps: [
      {
        id: "welcome",
        target: "[data-tour='manager-header']",
        title: "Manager Dashboard",
        content:
          "Welcome! As a manager, you can oversee orders, assign work to attendants, and manage daily operations.",
        placement: "bottom",
      },
      {
        id: "queue",
        target: "[data-tour='order-queue']",
        title: "Order Queue",
        content:
          "New orders appear here. Drag to reorder priorities, assign to attendants, and update statuses as work progresses.",
        placement: "bottom",
      },
      {
        id: "washer-grid",
        target: "[data-tour='washer-grid']",
        title: "Washer/Dryer Grid",
        content:
          "Track which machines are in use, available, or need maintenance. Assign orders to specific machines.",
        placement: "top",
      },
      {
        id: "staff-schedule",
        target: "[data-tour='staff-schedule']",
        title: "Staff Management",
        content:
          "View who's working today and manage attendant assignments.",
        placement: "right",
      },
    ],
  },
};

export function getTourForRole(role: string): TourDefinition | null {
  const roleToTour: Record<string, string> = {
    owner: "owner_dashboard",
    manager: "manager_operations",
    attendant: "pos_counter",
    driver: "driver_routes",
    customer: "customer_ordering",
  };
  const tourSlug = roleToTour[role];
  return tourSlug ? TOUR_DEFINITIONS[tourSlug] ?? null : null;
}

export function getTourBySlug(slug: string): TourDefinition | null {
  return TOUR_DEFINITIONS[slug] ?? null;
}
