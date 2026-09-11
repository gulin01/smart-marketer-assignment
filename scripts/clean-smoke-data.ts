import dotenv from "dotenv";

// The deployed database URL lives in .env.production.local (gitignored), which
// dotenv does not pick up by default.
dotenv.config({ path: ".env.production.local" });
dotenv.config();
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Removes rows created by the production smoke suite, leaving the demo data a
 * reviewer sees untouched. Campaigns cascade to forms, links, visits and
 * submissions; templates are deleted separately because forms reference them.
 */
const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Set DATABASE_URL_UNPOOLED (see .env.production.local) to clean the deployed database",
  );
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const SMOKE = { contains: "[smoke]" };

async function main() {
  const campaigns = await prisma.campaign.deleteMany({ where: { name: SMOKE } });
  const templates = await prisma.htmlTemplate.deleteMany({ where: { name: SMOKE } });

  console.log(`Deleted ${campaigns.count} campaign(s) and ${templates.count} template(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
