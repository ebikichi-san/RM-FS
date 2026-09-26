import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/roles";
import { publicViewer, resolveViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(request: Request) {
  const viewer = await resolveViewer(request);
  const identities = await prisma.user.findMany({
    where: {
      OR: [
        { tenantId: viewer.tenantId, email: { not: null } },
        { role: { in: ["CLIENT_ADMIN", "PARTNER_CONSULTANT", "RESPONDENT"] }, email: { not: null } },
      ],
    },
    include: { department: true },
    orderBy: { displayName: "asc" },
  });
  return NextResponse.json({
    viewer: publicViewer(viewer),
    identities: identities.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      role: u.role,
      departmentName: u.department?.name ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const body = z.object({ userId: z.string().min(1) }).parse(await request.json());
  const fake = new Request(request.url, { headers: { "x-user-id": body.userId } });
  const viewer = await resolveViewer(fake);
  const res = NextResponse.json({ viewer: publicViewer(viewer) });
  res.cookies.set(SESSION_COOKIE, viewer.id, { path: "/", sameSite: "lax" });
  return res;
}
