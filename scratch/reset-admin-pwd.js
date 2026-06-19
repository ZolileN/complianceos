const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function resetPassword() {
  const email = 'zolile@mlkcomputer.com';
  const newPassword = 'Password123!';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const updated = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });

  console.log("Updated password for:", updated.email);
}

resetPassword().catch(console.error).finally(() => prisma.$disconnect());
