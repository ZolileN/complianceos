const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  const users = await prisma.user.findMany({
    select: { email: true, name: true, role: true }
  });
  console.log("Users in DB:", users);
}

listUsers().catch(console.error).finally(() => prisma.$disconnect());
