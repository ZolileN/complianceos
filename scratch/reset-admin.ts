import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'zolile@praxisone.com';
  const plainPassword = 'Password123!';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Check if tenant exists
  let tenant = await prisma.tenant.findUnique({
    where: { slug: 'praxisone' }
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'PraxisOne Central',
        slug: 'praxisone',
        plan: 'enterprise',
        isActive: true,
      }
    });
    console.log('Created PraxisOne tenant');
  }

  // Find or create admin user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (user) {
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: 'administrator',
        tenantId: tenant.id
      }
    });
    console.log(`Updated password for existing administrator: ${email}`);
  } else {
    await prisma.user.create({
      data: {
        email,
        name: 'Zolile Admin',
        password: hashedPassword,
        role: 'administrator',
        tenantId: tenant.id
      }
    });
    console.log(`Created new administrator user: ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
