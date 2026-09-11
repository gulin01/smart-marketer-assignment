import "dotenv/config";
import { execFileSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Brings the test database to a known state: migrations applied, tables empty,
 * one seeded operator.
 *
 * Deliberately avoids `prisma migrate reset`, which drops and recreates the
 * schema. TRUNCATE gives a test run the same clean slate without a destructive
 * schema-level command.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL_TEST;
  if (!connectionString) {
    throw new Error("DATABASE_URL_TEST must be set (see .env.example)");
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: connectionString },
  });

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "Submission","Visit","DistributionLink","Form","HtmlTemplate","Campaign","Operator" RESTART IDENTITY CASCADE',
    );
    await prisma.operator.create({
      data: {
        email: process.env.ADMIN_EMAIL ?? "admin@example.com",
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD ?? "admin1234", 10),
      },
    });
    console.log("Test database ready.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
