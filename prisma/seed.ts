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
        themePreset: "modern",
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

    // Demo Services
    const services = [
      {
        tenantId: tenant.id,
        category: "wash_and_fold",
        name: "Wash & Fold - Regular",
        description: "Standard wash and fold service. Sorted by color, washed in warm water, tumble dried, and neatly folded.",
        pricingType: "per_pound",
        price: 1.99,
        sortOrder: 1,
      },
      {
        tenantId: tenant.id,
        category: "wash_and_fold",
        name: "Wash & Fold - Delicate",
        description: "Gentle cycle for delicate fabrics. Cold water wash with mild detergent.",
        pricingType: "per_pound",
        price: 2.99,
        sortOrder: 2,
      },
      {
        tenantId: tenant.id,
        category: "dry_cleaning",
        name: "Dry Cleaning - Shirts",
        description: "Professional dry cleaning for dress shirts and blouses.",
        pricingType: "per_item",
        price: 4.99,
        sortOrder: 3,
      },
      {
        tenantId: tenant.id,
        category: "dry_cleaning",
        name: "Dry Cleaning - Suits",
        description: "Full suit dry cleaning — jacket and pants.",
        pricingType: "per_item",
        price: 14.99,
        sortOrder: 4,
      },
      {
        tenantId: tenant.id,
        category: "specialty",
        name: "Comforter / Bedding",
        description: "Large item cleaning for comforters, duvets, and blankets.",
        pricingType: "per_item",
        price: 24.99,
        sortOrder: 5,
      },
    ];

    await prisma.service.createMany({ data: services });
    console.log(`Created ${services.length} demo services`);

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
