import { PrismaClient } from '@prisma/client'
import { PrismaAdapter } from '@tidbcloud/prisma-adapter'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Switch adapter automatically when using TiDB via DATABASE_URL.
const useTiDBAdapter = process.env.DATABASE_URL?.includes('tidbcloud.com') ?? false

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient(useTiDBAdapter ? { adapter: PrismaAdapter() } : {})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
