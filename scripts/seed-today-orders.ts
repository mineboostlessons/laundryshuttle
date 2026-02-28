import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find demo tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "demo" },
  });
  if (!tenant) {
    console.error("Demo tenant not found");
    process.exit(1);
  }

  // Find laundromat
  const laundromat = await prisma.laundromat.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!laundromat) {
    console.error("Demo laundromat not found");
    process.exit(1);
  }

  // Find demo customer
  const customer = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "customer" },
  });
  if (!customer) {
    console.error("Demo customer not found");
    process.exit(1);
  }

  // Find demo driver
  const driver = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "driver" },
  });
  if (!driver) {
    console.error("Demo driver not found");
    process.exit(1);
  }

  // Find customer address
  const address = await prisma.customerAddress.findFirst({
    where: { userId: customer.id },
  });

  // Find services for order items
  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id },
  });

  // Get the highest existing order number to avoid conflicts
  const lastOrder = await prisma.order.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  const lastNum = lastOrder
    ? parseInt(lastOrder.orderNumber.split("-").pop() || "0", 10)
    : 0;

  const today = new Date();
  today.setUTCHours(12, 0, 0, 0); // noon UTC — displays correctly in any US timezone

  const timeSlots = [
    "8am-10am", "9am-11am", "10am-12pm", "11am-1pm",
    "12pm-2pm", "1pm-3pm", "2pm-4pm", "3pm-5pm",
    "4pm-6pm", "5pm-7pm",
  ];

  const names = [
    "Sarah Johnson", "Mike Chen", "Lisa Rodriguez", "David Kim",
    "Emily Davis", "James Wilson", "Maria Garcia", "Robert Taylor",
    "Jennifer Lee", "Thomas Brown",
  ];

  console.log(`Creating 10 confirmed orders for today (${today.toISOString().split("T")[0]})...`);

  for (let i = 0; i < 10; i++) {
    const orderNum = lastNum + i + 1;
    const subtotal = Math.round((15 + Math.random() * 50) * 100) / 100;
    const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
    const deliveryFee = 5.99;
    const total = Math.round((subtotal + taxAmount + deliveryFee) * 100) / 100;

    const order = await prisma.order.create({
      data: {
        orderNumber: `DEM-${today.getFullYear()}-${String(orderNum).padStart(5, "0")}`,
        tenantId: tenant.id,
        laundromatId: laundromat.id,
        customerId: customer.id,
        driverId: driver.id,
        orderType: "delivery",
        status: "confirmed",
        subtotal,
        taxRate: 0.08,
        taxAmount,
        deliveryFee,
        totalAmount: total,
        numBags: Math.floor(Math.random() * 3) + 1,
        pickupDate: today,
        pickupTimeSlot: timeSlots[i],
        pickupAddressId: address?.id ?? null,
        pickupNotes: i % 3 === 0 ? "Please ring doorbell" : null,
        paymentMethod: i % 2 === 0 ? "card" : "stored_card",
        createdAt: new Date(today.getTime() - (10 - i) * 60 * 60 * 1000), // stagger creation times
      },
    });

    // Add an order item
    if (services.length > 0) {
      const service = services[i % services.length];
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

    console.log(`  Created order ${order.orderNumber} — ${names[i]} — ${timeSlots[i]}`);
  }

  console.log("\nDone! 10 confirmed orders created for today's pickup.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
