import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.argv[2] || "hendrygaire@gmail.com";

async function main() {
  const admin = await prisma.user.update({
    where: { email: ADMIN_EMAIL },
    data: { isAdmin: true, isVerified: true },
    select: { id: true, username: true, isAdmin: true, isVerified: true },
  });
  console.log("Admin promoted:", admin);

  const community = await prisma.user.findUnique({
    where: { id: "buzzhub-community-official" },
    select: { id: true, username: true, displayName: true, isVerified: true },
  });
  console.log("BuzzHub Community account:", community);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
