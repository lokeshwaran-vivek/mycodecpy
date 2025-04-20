import { PrismaClient } from "@prisma/client";
import { templates } from "./data/template";
import { hash } from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await hash("test@123", 12);
  // Super admin
  await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      email: "admin@test.com",
      name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  // Business owner
  await prisma.user.upsert({
    where: { email: "business@test.com" },
    update: {},
    create: {
      email: "business@test.com",
      name: "Business",
      password: hashedPassword,
      role: "OWNER",
      type: "BUSINESS",
      emailVerified: new Date(),
      business: {
        create: {
          name: "Business",
          address: "123 Main St",
          gst: "1234567890",
          cin: "1234567890",
          website: "https://business.com",
          logo: "https://business.com/logo.png",
          status: "ACTIVE",
        },
      },
    },
  });

  // Templates
  await prisma.template.createMany({
    data: templates,
  });
}

main()
  .then(async () => {
    console.log("Seeded successfully");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
