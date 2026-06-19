const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.findFirst({ where: { companyName: { contains: "MLK" } } });
  console.log("Client:", client);
  if (client) {
    const convo = await prisma.conversation.findFirst({ where: { whatsappNumber: "27825319901" } });
    if (convo) {
      await prisma.conversation.update({ where: { id: convo.id }, data: { clientId: client.id } });
      console.log("Updated convo to link to client!");
    } else {
      console.log("Convo not found");
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
