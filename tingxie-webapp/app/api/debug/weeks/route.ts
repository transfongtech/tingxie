import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const weeks = await prisma.week.findMany({
            include: {
                _count: {
                    select: { wordLists: true }
                }
            },
            orderBy: { number: 'asc' }
        });

        return NextResponse.json({
            count: weeks.length,
            weeks
        });

    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
