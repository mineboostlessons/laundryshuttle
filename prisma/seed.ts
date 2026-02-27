import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // --- Platform Admin ---
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL || "admin@laundryshuttle.com";
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD || "changeme123!";

  const existingAdmin = await prisma.user.findFirst({
    where: { email: adminEmail, role: "platform_admin" },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        firstName: "Platform",
        lastName: "Admin",
        passwordHash,
        role: "platform_admin",
        tenantId: null,
        authProvider: "email",
        emailVerified: new Date(),
        isActive: true,
      },
    });
    console.log(`Created platform admin: ${adminEmail}`);
  } else {
    console.log(`Platform admin already exists: ${adminEmail}`);
  }

  // --- Demo Tenant ---
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: "demo" },
  });

  if (!existingTenant) {
    const tenant = await prisma.tenant.create({
      data: {
        slug: "demo",
        businessName: "Demo Laundry Co.",
        businessType: "wash_and_fold",
        email: "demo@laundryshuttle.com",
        phone: "(555) 000-0000",
        subscriptionPlan: "standard",
        subscriptionStatus: "active",
        themePreset: "clean_luxe",
        isActive: true,
        isDemo: true,
        demoResetInterval: 24,
        onboardingComplete: true,
        setupCompletenessScore: 100,
        socialLinks: {
          facebook: "https://facebook.com/demolaundry",
          instagram: "https://instagram.com/demolaundry",
          yelp: "https://yelp.com/biz/demo-laundry",
        },
        trustBadges: ["eco_friendly", "same_day_service"],
        notificationSettings: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: false,
          smsBudgetCap: 100,
        },
      },
    });
    console.log(`Created demo tenant: ${tenant.slug}`);

    // Demo Location
    const laundromat = await prisma.laundromat.create({
      data: {
        tenantId: tenant.id,
        name: "Demo Location - Downtown",
        address: "123 Main Street",
        city: "New York",
        state: "NY",
        zip: "10001",
        lat: 40.7484,
        lng: -73.9967,
        phone: "(555) 000-0001",
        timezone: "America/New_York",
        numWashers: 20,
        numDryers: 16,
        isActive: true,
        operatingHours: {
          monday: { open: "07:00", close: "21:00" },
          tuesday: { open: "07:00", close: "21:00" },
          wednesday: { open: "07:00", close: "21:00" },
          thursday: { open: "07:00", close: "21:00" },
          friday: { open: "07:00", close: "21:00" },
          saturday: { open: "08:00", close: "20:00" },
          sunday: { open: "08:00", close: "18:00" },
        },
        pickupDays: ["monday", "wednesday", "friday"],
        deliveryDays: ["tuesday", "thursday", "saturday"],
        pickupTimeSlots: ["9am-12pm", "12pm-3pm", "3pm-6pm"],
        deliveryTimeSlots: ["9am-12pm", "12pm-3pm", "3pm-6pm"],
      },
    });
    console.log(`Created demo location: ${laundromat.name}`);

    // Demo Owner
    const ownerHash = await bcrypt.hash("demo1234", 12);
    const owner = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "owner@demo.laundryshuttle.com",
        firstName: "Demo",
        lastName: "Owner",
        passwordHash: ownerHash,
        role: "owner",
        authProvider: "email",
        emailVerified: new Date(),
        isActive: true,
      },
    });
    console.log(`Created demo owner: ${owner.email}`);

    // Demo Manager
    const managerHash = await bcrypt.hash("demo1234", 12);
    const manager = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "manager@demo.laundryshuttle.com",
        firstName: "Demo",
        lastName: "Manager",
        passwordHash: managerHash,
        role: "manager",
        authProvider: "email",
        emailVerified: new Date(),
        isActive: true,
      },
    });
    console.log(`Created demo manager: ${manager.email}`);

    // Assign manager to location
    await prisma.userLaundromatAssignment.create({
      data: {
        userId: manager.id,
        laundromatId: laundromat.id,
      },
    });

    // Demo Attendant
    const attendantHash = await bcrypt.hash("demo1234", 12);
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "attendant@demo.laundryshuttle.com",
        firstName: "Demo",
        lastName: "Attendant",
        passwordHash: attendantHash,
        role: "attendant",
        authProvider: "email",
        emailVerified: new Date(),
        isActive: true,
      },
    });
    console.log("Created demo attendant");

    // Demo Driver
    const driverHash = await bcrypt.hash("demo1234", 12);
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "driver@demo.laundryshuttle.com",
        firstName: "Demo",
        lastName: "Driver",
        passwordHash: driverHash,
        role: "driver",
        authProvider: "email",
        emailVerified: new Date(),
        isActive: true,
        vehicleInfo: {
          make: "Toyota",
          model: "Corolla",
          year: 2022,
          color: "White",
          licensePlate: "ABC-1234",
        },
      },
    });
    console.log("Created demo driver");

    // Demo Customer
    const customerHash = await bcrypt.hash("demo1234", 12);
    const customer = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "customer@demo.laundryshuttle.com",
        firstName: "Demo",
        lastName: "Customer",
        passwordHash: customerHash,
        role: "customer",
        authProvider: "email",
        emailVerified: new Date(),
        isActive: true,
        notificationPreference: "both",
      },
    });

    // Customer address
    await prisma.customerAddress.create({
      data: {
        userId: customer.id,
        label: "Home",
        addressLine1: "456 Oak Avenue",
        city: "New York",
        state: "NY",
        zip: "10002",
        lat: 40.7214,
        lng: -73.9876,
        isDefault: true,
        pickupNotes: "Leave at front door, ring bell",
      },
    });
    console.log("Created demo customer with address");

    // System Services (mandatory Wash & Fold frequency plans)
    const services = [
      {
        tenantId: tenant.id,
        category: "wash_and_fold",
        name: "One Time Pickup",
        description: "Single pickup and delivery — no commitment.",
        pricingType: "per_pound",
        price: 1.99,
        sortOrder: 1,
        isSystem: true,
      },
      {
        tenantId: tenant.id,
        category: "wash_and_fold",
        name: "Every Week",
        description: "Weekly scheduled pickup and delivery.",
        pricingType: "per_pound",
        price: 1.79,
        sortOrder: 2,
        isSystem: true,
      },
      {
        tenantId: tenant.id,
        category: "wash_and_fold",
        name: "Every Other Week",
        description: "Bi-weekly scheduled pickup and delivery.",
        pricingType: "per_pound",
        price: 1.89,
        sortOrder: 3,
        isSystem: true,
      },
    ];

    await prisma.service.createMany({ data: services });
    console.log(`Created ${services.length} system services`);

    // Demo Service Options
    await prisma.serviceOption.createMany({
      data: [
        { tenantId: tenant.id, name: "Tide Original Detergent", isDefault: true, sortOrder: 1 },
        { tenantId: tenant.id, name: "Hypoallergenic Detergent", extraCost: 1.50, costType: "per_order", sortOrder: 2 },
        { tenantId: tenant.id, name: "Fabric Softener", extraCost: 0.50, costType: "per_order", sortOrder: 3 },
        { tenantId: tenant.id, name: "Eco-Friendly Detergent", extraCost: 2.00, costType: "per_order", sortOrder: 4 },
      ],
    });
    console.log("Created demo service options");

    // Fetch created services for order items
    const createdServices = await prisma.service.findMany({
      where: { tenantId: tenant.id },
    });

    // Demo Orders (various statuses to populate dashboards)
    const statuses = [
      "pending", "confirmed", "picked_up", "processing",
      "ready", "out_for_delivery", "delivered", "delivered",
      "delivered", "delivered", "delivered", "delivered",
    ];

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 14);

    for (let i = 0; i < statuses.length; i++) {
      const orderDate = new Date(baseDate);
      orderDate.setDate(orderDate.getDate() + i);
      const status = statuses[i];
      const subtotal = Math.round((15 + Math.random() * 45) * 100) / 100;
      const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
      const deliveryFee = i % 3 === 0 ? 0 : 5.99;
      const tipAmount = status === "delivered" ? Math.round(Math.random() * 8 * 100) / 100 : 0;
      const total = Math.round((subtotal + taxAmount + deliveryFee + tipAmount) * 100) / 100;

      const order = await prisma.order.create({
        data: {
          orderNumber: `DEM-${new Date().getFullYear()}-${String(i + 1).padStart(5, "0")}`,
          tenantId: tenant.id,
          laundromatId: laundromat.id,
          customerId: customer.id,
          driverId: status === "out_for_delivery" || status === "delivered" ? owner.id : null,
          orderType: i % 3 === 0 ? "walk_in" : "delivery",
          status,
          subtotal,
          taxRate: 0.08,
          taxAmount,
          deliveryFee,
          tipAmount,
          totalAmount: total,
          numBags: Math.floor(Math.random() * 3) + 1,
          totalWeightLbs: Math.round((5 + Math.random() * 20) * 10) / 10,
          pickupDate: orderDate,
          deliveryDate: status === "delivered" ? new Date(orderDate.getTime() + 48 * 60 * 60 * 1000) : null,
          paymentMethod: i % 4 === 0 ? "cash" : "card",
          paidAt: ["delivered", "ready", "out_for_delivery"].includes(status) ? orderDate : null,
          createdAt: orderDate,
        },
      });

      // Add order items
      if (createdServices.length > 0) {
        const service = createdServices[i % createdServices.length];
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            serviceId: service.id,
            itemType: "service",
            name: service.name,
            quantity: Math.floor(Math.random() * 3) + 1,
            unitPrice: service.price,
            totalPrice: subtotal,
          },
        });
      }
    }
    console.log(`Created ${statuses.length} demo orders`);

    // Demo Promo Codes
    await prisma.promoCode.createMany({
      data: [
        {
          tenantId: tenant.id,
          code: "WELCOME20",
          description: "20% off your first order",
          discountType: "percentage",
          discountValue: 20,
          maxUses: 100,
          maxUsesPerCustomer: 1,
          validFrom: new Date(),
          isActive: true,
        },
        {
          tenantId: tenant.id,
          code: "FREEDELIVERY",
          description: "Free delivery on orders over $25",
          discountType: "free_delivery",
          discountValue: 0,
          minOrderAmount: 25,
          maxUses: 50,
          validFrom: new Date(),
          isActive: true,
        },
      ],
    });
    console.log("Created demo promo codes");

    // --- 9 Default CMS Pages ---
    const defaultPages = [
      {
        tenantId: tenant.id,
        title: "Home",
        slug: "home",
        seoTitle: "Demo Laundry Co. — Professional Laundry Pickup & Delivery",
        seoDescription: "Convenient laundry pickup and delivery services. We handle the dirty work so you can enjoy your free time.",
        isPublished: true,
        sortOrder: 0,
        blocks: [
          {
            type: "hero",
            heading: "Professional Laundry, Delivered",
            subheading: "Demo Laundry Co. offers convenient pickup and delivery laundry services. We handle the dirty work so you can enjoy your free time.",
            ctaText: "Schedule a Pickup",
            ctaLink: "/order",
            showGradient: false,
            showAddressChecker: true,
            backgroundImage: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=1600&q=80",
          },
          {
            type: "features",
            heading: "Why Choose Us",
            features: [
              { icon: "truck", title: "Free Pickup & Delivery", description: "We come to your door on your schedule. No minimum order required." },
              { icon: "clock", title: "24-Hour Turnaround", description: "Get your clothes back fresh and fast — most orders ready next day." },
              { icon: "sparkles", title: "Expert Care", description: "Professional cleaning for all fabrics using premium detergents." },
              { icon: "shield", title: "Satisfaction Guaranteed", description: "Not happy? We'll re-clean for free. Your satisfaction is our priority." },
            ],
          },
          { type: "services", heading: "Our Services", showPrices: true },
          {
            type: "cta",
            heading: "Ready to Get Started?",
            subheading: "Schedule your first pickup in minutes. No commitments, no hassle.",
            buttonText: "Schedule a Pickup",
            buttonLink: "/order",
          },
        ],
      },
      {
        tenantId: tenant.id,
        title: "Wash & Fold",
        slug: "wash-and-fold",
        seoTitle: "Wash & Fold Laundry Service — Demo Laundry Co.",
        seoDescription: "Professional wash and fold service starting at $1.99/lb. Same-day and next-day turnaround available.",
        isPublished: true,
        sortOrder: 1,
        blocks: [
          {
            type: "hero",
            heading: "Wash & Fold Service",
            subheading: "Let us handle your everyday laundry. Drop it off or schedule a pickup — we'll wash, dry, and fold it to perfection.",
            ctaText: "Order Now",
            ctaLink: "/order",
            showGradient: false,
            backgroundImage: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=1600&q=80",
          },
          {
            type: "text",
            heading: "How Our Wash & Fold Works",
            body: "Our wash and fold service is perfect for everyday laundry — clothes, towels, sheets, and more. We sort your laundry by color and fabric type, wash with premium detergent, tumble dry on the appropriate setting, and neatly fold everything. Each order is tagged and tracked from pickup to delivery.\n\nWe offer both regular and delicate cycles. Choose from several detergent options including hypoallergenic and eco-friendly alternatives. Special instructions? Just let us know in your order notes.",
          },
          {
            type: "pricing",
            heading: "Wash & Fold Pricing",
            subheading: "Simple, transparent pricing with no hidden fees.",
            tiers: [
              { name: "Regular Wash & Fold", price: "$1.99", unit: "/lb", description: "Standard cycle, 24-hour turnaround", featured: true },
              { name: "Delicate Wash & Fold", price: "$2.99", unit: "/lb", description: "Gentle cycle, cold water wash" },
              { name: "Same-Day Rush", price: "$3.49", unit: "/lb", description: "Picked up by 10am, delivered by 6pm" },
            ],
          },
          {
            type: "how_it_works",
            heading: "3 Easy Steps",
            steps: [
              { title: "Schedule a Pickup", description: "Choose a date and time that works for you. We'll send a driver to your door.", icon: "calendar" },
              { title: "We Clean Your Clothes", description: "Our team sorts, washes, dries, and folds your laundry with care.", icon: "sparkles" },
              { title: "We Deliver It Back", description: "Fresh, clean laundry delivered right back to your doorstep.", icon: "truck" },
            ],
          },
          {
            type: "faq",
            heading: "Wash & Fold FAQ",
            items: [
              { question: "What's the minimum order?", answer: "There's no minimum order for wash & fold. However, orders under 10 lbs are charged a flat $19.90 minimum." },
              { question: "Can I choose my detergent?", answer: "Yes! We offer Tide Original, hypoallergenic, fabric softener, and eco-friendly detergent options." },
              { question: "How do you handle stains?", answer: "We pre-treat visible stains before washing. For tough stains, add a note to your order and we'll give them extra attention." },
              { question: "Do you sort by color?", answer: "Absolutely. We sort all laundry by color and fabric type to prevent color bleeding and ensure proper care." },
            ],
          },
          {
            type: "cta",
            heading: "Try Our Wash & Fold Service",
            subheading: "First-time customers get 20% off with code WELCOME20.",
            buttonText: "Schedule a Pickup",
            buttonLink: "/order",
          },
        ],
      },
      {
        tenantId: tenant.id,
        title: "Pickup & Delivery",
        slug: "pickup-and-delivery",
        seoTitle: "Laundry Pickup & Delivery Service — Demo Laundry Co.",
        seoDescription: "Free laundry pickup and delivery service. Schedule online, we handle the rest. Available 7 days a week.",
        isPublished: true,
        sortOrder: 2,
        blocks: [
          {
            type: "hero",
            heading: "Free Pickup & Delivery",
            subheading: "We come to you. Schedule a pickup online, leave your laundry at the door, and we'll deliver it back fresh and clean.",
            ctaText: "Schedule Now",
            ctaLink: "/order",
            showGradient: false,
            backgroundImage: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1600&q=80",
          },
          {
            type: "how_it_works",
            heading: "How Pickup & Delivery Works",
            steps: [
              { title: "Schedule Online", description: "Pick a date, time slot, and leave any special instructions.", icon: "calendar" },
              { title: "We Pick Up", description: "Our driver arrives at your door. Just leave your bag outside or hand it off.", icon: "truck" },
              { title: "We Clean & Deliver", description: "Your laundry is professionally cleaned and delivered back within 24-48 hours.", icon: "sparkles" },
            ],
          },
          {
            type: "pricing",
            heading: "Delivery Pricing",
            tiers: [
              { name: "Free Delivery", price: "$0", unit: "", description: "On all orders over $25", featured: true },
              { name: "Standard Delivery", price: "$5.99", unit: "", description: "For orders under $25" },
              { name: "Same-Day Rush", price: "$9.99", unit: "", description: "Pickup by 10am, delivery by 6pm" },
            ],
          },
          {
            type: "text",
            heading: "Service Details",
            body: "Our pickup and delivery service is available Monday through Saturday. We offer morning (9am-12pm), afternoon (12pm-3pm), and evening (3pm-6pm) time slots.\n\nAll pickups include a free laundry bag for your first order. Just place your bag in a visible location — our drivers will text you when they arrive and when your order is on its way back.\n\nTracking is available in real time through your customer dashboard. You'll receive SMS and email notifications at every step.",
          },
          {
            type: "faq",
            heading: "Pickup & Delivery FAQ",
            items: [
              { question: "What areas do you serve?", answer: "We currently serve a 10-mile radius from our location in downtown New York. Check our Service Areas page for details." },
              { question: "Do I need to be home for pickup?", answer: "No! Just leave your laundry bag in a visible, covered location. Our driver will text you upon pickup." },
              { question: "How do I track my order?", answer: "Log into your account to see real-time status updates. You'll also receive SMS notifications at each step." },
              { question: "What if I need to reschedule?", answer: "You can reschedule or cancel up to 2 hours before your scheduled pickup time through your dashboard." },
            ],
          },
          {
            type: "cta",
            heading: "Schedule Your First Pickup",
            subheading: "It takes less than 2 minutes. Free delivery on orders over $25.",
            buttonText: "Get Started",
            buttonLink: "/order",
          },
        ],
      },
      {
        tenantId: tenant.id,
        title: "Dry Cleaning",
        slug: "dry-cleaning",
        seoTitle: "Dry Cleaning Service — Demo Laundry Co.",
        seoDescription: "Professional dry cleaning with free pickup and delivery. Shirts, suits, dresses, and specialty garments.",
        isPublished: true,
        sortOrder: 3,
        blocks: [
          {
            type: "hero",
            heading: "Professional Dry Cleaning",
            subheading: "Expert care for your finest garments. We handle suits, dresses, silk, cashmere, and delicate fabrics with precision.",
            ctaText: "Schedule a Pickup",
            ctaLink: "/order",
            showGradient: false,
            backgroundImage: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1600&q=80",
          },
          {
            type: "text",
            heading: "Why Our Dry Cleaning Is Different",
            body: "We use state-of-the-art cleaning equipment and eco-friendly solvents to keep your garments looking their best. Every item is individually inspected, treated for stains, and pressed by hand.\n\nOur team has decades of combined experience handling everything from everyday business attire to wedding gowns and formal wear. We treat every garment as if it were our own.",
          },
          {
            type: "pricing",
            heading: "Dry Cleaning Pricing",
            subheading: "Competitive pricing with premium quality.",
            tiers: [
              { name: "Shirts & Blouses", price: "$4.99", unit: "/item", description: "Laundered and pressed" },
              { name: "Pants & Skirts", price: "$7.99", unit: "/item", description: "Dry cleaned and pressed" },
              { name: "Suits (2-piece)", price: "$14.99", unit: "/item", description: "Full dry clean and press", featured: true },
              { name: "Dresses", price: "$12.99", unit: "/item", description: "Dry cleaned and finished" },
              { name: "Coats & Jackets", price: "$16.99", unit: "/item", description: "Seasonal cleaning available" },
            ],
          },
          {
            type: "cta",
            heading: "Schedule Dry Cleaning Pickup",
            subheading: "Professional results, delivered to your door.",
            buttonText: "Order Now",
            buttonLink: "/order",
          },
        ],
      },
      {
        tenantId: tenant.id,
        title: "Pricing",
        slug: "pricing",
        seoTitle: "Laundry Service Pricing — Demo Laundry Co.",
        seoDescription: "Transparent laundry service pricing. Wash & fold from $1.99/lb, dry cleaning from $4.99/item. No hidden fees.",
        isPublished: true,
        sortOrder: 4,
        blocks: [
          {
            type: "hero",
            heading: "Simple, Transparent Pricing",
            subheading: "No hidden fees, no surprises. Just great laundry service at fair prices.",
            ctaText: "Order Now",
            ctaLink: "/order",
            showGradient: false,
            backgroundImage: "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=1600&q=80",
          },
          {
            type: "pricing",
            heading: "Wash & Fold",
            tiers: [
              { name: "Regular Wash & Fold", price: "$1.99", unit: "/lb", description: "24-hour turnaround", featured: true },
              { name: "Delicate Wash & Fold", price: "$2.99", unit: "/lb", description: "Gentle cycle, cold water" },
              { name: "Same-Day Rush", price: "$3.49", unit: "/lb", description: "Pickup by 10am, delivery by 6pm" },
            ],
          },
          {
            type: "pricing",
            heading: "Dry Cleaning",
            tiers: [
              { name: "Shirts & Blouses", price: "$4.99", unit: "/item", description: "Laundered and pressed" },
              { name: "Suits (2-piece)", price: "$14.99", unit: "/item", description: "Full dry clean and press", featured: true },
              { name: "Dresses", price: "$12.99", unit: "/item", description: "Dry cleaned and finished" },
            ],
          },
          {
            type: "pricing",
            heading: "Specialty Items",
            tiers: [
              { name: "Comforter / Duvet", price: "$24.99", unit: "/item", description: "Large item cleaning" },
              { name: "Wedding Dress", price: "$149.99", unit: "/item", description: "Preservation available" },
              { name: "Leather / Suede", price: "$29.99", unit: "/item", description: "Specialty care" },
            ],
          },
          {
            type: "faq",
            heading: "Pricing FAQ",
            items: [
              { question: "Is there a minimum order?", answer: "No minimum for delivery orders over $25. Orders under $25 have a $5.99 delivery fee. Walk-in orders have no minimum." },
              { question: "Do you charge extra for detergent?", answer: "Our standard Tide detergent is included. Hypoallergenic (+$1.50) and eco-friendly (+$2.00) options are available." },
              { question: "Are there any hidden fees?", answer: "Never. What you see is what you pay. Tax is calculated at checkout based on your location." },
              { question: "Do you offer subscriptions?", answer: "Yes! We offer weekly and bi-weekly subscription plans with 15% savings. Ask us about setting up a recurring schedule." },
            ],
          },
        ],
      },
      {
        tenantId: tenant.id,
        title: "About Us",
        slug: "about",
        seoTitle: "About Us — Demo Laundry Co.",
        seoDescription: "Learn about Demo Laundry Co. — our story, our values, and our commitment to providing the best laundry service.",
        isPublished: true,
        sortOrder: 5,
        blocks: [
          {
            type: "hero",
            heading: "About Demo Laundry Co.",
            subheading: "A modern laundry service built on old-fashioned values: quality, care, and convenience.",
            ctaText: "",
            ctaLink: "",
            showGradient: false,
            backgroundImage: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&q=80",
          },
          {
            type: "text",
            heading: "Our Story",
            body: "Demo Laundry Co. was founded with a simple mission: to give people back their time. We believe doing laundry shouldn't be a chore — it should be effortless.\n\nWhat started as a small neighborhood service has grown into a full-service laundry operation serving thousands of customers across the city. We combine professional-grade equipment with a personal touch, ensuring every garment is treated with care.\n\nOur team is passionate about sustainability, using eco-friendly products whenever possible and reducing water waste through modern washing technology.",
          },
          {
            type: "features",
            heading: "Our Values",
            features: [
              { icon: "heart", title: "Customer First", description: "Everything we do starts with the customer. Your satisfaction is our top priority." },
              { icon: "leaf", title: "Eco-Conscious", description: "We use eco-friendly detergents and energy-efficient equipment to minimize our footprint." },
              { icon: "shield", title: "Quality Guaranteed", description: "Every item is inspected before delivery. Not satisfied? We'll re-clean it for free." },
              { icon: "clock", title: "Reliability", description: "On-time pickups and deliveries, every single time. You can count on us." },
            ],
          },
          {
            type: "testimonials",
            heading: "What Our Customers Say",
            testimonials: [
              { name: "Sarah M.", text: "I've been using Demo Laundry for 6 months now and I'll never go back to doing my own laundry. The quality is incredible.", rating: 5 },
              { name: "James R.", text: "Fast, reliable, and affordable. They handle my business shirts perfectly every time.", rating: 5 },
              { name: "Linda K.", text: "The pickup and delivery service is so convenient. I just leave my bag and it comes back perfectly folded.", rating: 5 },
            ],
          },
          {
            type: "cta",
            heading: "Join Thousands of Happy Customers",
            subheading: "Try us today and see the difference.",
            buttonText: "Schedule Your First Pickup",
            buttonLink: "/order",
          },
        ],
      },
      {
        tenantId: tenant.id,
        title: "FAQ",
        slug: "faq",
        seoTitle: "Frequently Asked Questions — Demo Laundry Co.",
        seoDescription: "Answers to common questions about our laundry pickup & delivery service, pricing, turnaround times, and more.",
        isPublished: true,
        sortOrder: 6,
        blocks: [
          {
            type: "hero",
            heading: "Frequently Asked Questions",
            subheading: "Everything you need to know about our laundry services.",
            ctaText: "",
            ctaLink: "",
            showGradient: false,
            backgroundImage: "https://images.unsplash.com/photo-1517677129300-07b130802f46?w=1600&q=80",
          },
          {
            type: "faq",
            heading: "General Questions",
            items: [
              { question: "How does the pickup and delivery service work?", answer: "Schedule a pickup through our website or app. Our driver will come to your location at the scheduled time, pick up your laundry, and deliver it back clean and folded within 24-48 hours." },
              { question: "What areas do you serve?", answer: "We currently serve a 10-mile radius from our downtown location. Check our Service Areas page or enter your address on our homepage to verify coverage." },
              { question: "What are your operating hours?", answer: "We're open Monday-Friday 7am-9pm, Saturday 8am-8pm, and Sunday 8am-6pm. Pickup and delivery slots are available during these hours." },
              { question: "Do I need to create an account?", answer: "Yes, creating a free account allows you to schedule pickups, track orders, save addresses, and manage payment methods." },
              { question: "What forms of payment do you accept?", answer: "We accept all major credit and debit cards. Payment is processed securely through Stripe." },
              { question: "How do I track my order?", answer: "Log into your account dashboard to see real-time status updates. You'll also receive SMS and email notifications at every stage." },
              { question: "What if an item is damaged or lost?", answer: "We take extreme care with every item. In the rare event something is damaged, we'll compensate you based on the item's value. Contact us immediately to file a claim." },
              { question: "Do you offer commercial or business accounts?", answer: "Yes! We offer commercial accounts for businesses with recurring laundry needs. Contact us for custom pricing and invoicing options." },
              { question: "Can I cancel or reschedule a pickup?", answer: "You can cancel or reschedule up to 2 hours before your scheduled pickup time through your account dashboard." },
              { question: "Do you use eco-friendly products?", answer: "Yes! We offer eco-friendly detergent options and use energy-efficient equipment. Just select the eco-friendly option when placing your order." },
            ],
          },
        ],
      },
      {
        tenantId: tenant.id,
        title: "Service Areas",
        slug: "service-areas",
        seoTitle: "Service Areas — Demo Laundry Co.",
        seoDescription: "Check if Demo Laundry Co. delivers to your area. Currently serving downtown New York and surrounding neighborhoods.",
        isPublished: true,
        sortOrder: 7,
        blocks: [
          {
            type: "hero",
            heading: "Our Service Areas",
            subheading: "Check if we deliver to your neighborhood.",
            ctaText: "",
            ctaLink: "",
            showGradient: false,
            backgroundImage: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1600&q=80",
          },
          {
            type: "service_areas",
            heading: "Do We Deliver to You?",
            subheading: "Enter your address below to check if you're within our delivery zone.",
            showZipChecker: true,
          },
          {
            type: "cta",
            heading: "Within Our Service Area?",
            subheading: "Schedule your first pickup today. Free delivery on orders over $25.",
            buttonText: "Schedule a Pickup",
            buttonLink: "/order",
          },
        ],
      },
      {
        tenantId: tenant.id,
        title: "Contact Us",
        slug: "contact",
        seoTitle: "Contact Us — Demo Laundry Co.",
        seoDescription: "Get in touch with Demo Laundry Co. Call, email, or send us a message. We're here to help.",
        isPublished: true,
        sortOrder: 8,
        blocks: [
          {
            type: "hero",
            heading: "Contact Us",
            subheading: "Have a question? We're here to help.",
            ctaText: "",
            ctaLink: "",
            showGradient: false,
            backgroundImage: "https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1600&q=80",
          },
          {
            type: "contact",
            heading: "Get in Touch",
            subheading: "Reach out by phone, email, or the form below.",
            showPhone: true,
            showEmail: true,
            showForm: true,
          },
          {
            type: "text",
            heading: "Hours & Location",
            body: "123 Main Street, New York, NY 10001\n\nMonday - Friday: 7:00 AM - 9:00 PM\nSaturday: 8:00 AM - 8:00 PM\nSunday: 8:00 AM - 6:00 PM\n\nPickup & delivery available during all operating hours.",
          },
        ],
      },
    ];

    for (const pageData of defaultPages) {
      await prisma.page.create({
        data: {
          tenantId: pageData.tenantId,
          title: pageData.title,
          slug: pageData.slug,
          seoTitle: pageData.seoTitle,
          seoDescription: pageData.seoDescription,
          isPublished: pageData.isPublished,
          sortOrder: pageData.sortOrder,
          blocks: pageData.blocks,
        },
      });
    }
    console.log(`Created ${defaultPages.length} default CMS pages`);
  } else {
    console.log("Demo tenant already exists");
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
