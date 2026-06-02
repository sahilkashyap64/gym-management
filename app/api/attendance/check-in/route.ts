import { AttendanceSource } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";

type CheckInRequest = {
  memberId?: unknown;
  branch?: unknown;
  date?: unknown;
};

function dateRangeForIndiaDay(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00.000+05:30`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getIndiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));
  return `${valueByType.get("year")}-${valueByType.get("month")}-${valueByType.get("day")}`;
}

export async function POST(request: Request) {
  let body: CheckInRequest;

  try {
    body = (await request.json()) as CheckInRequest;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const memberCode = typeof body.memberId === "string" ? body.memberId : "";
  const branchName = typeof body.branch === "string" ? body.branch : "";
  const dateKey = typeof body.date === "string" ? body.date : "";

  if (!memberCode || !branchName || !isDateKey(dateKey)) {
    return Response.json({ error: "Member, branch, and QR date are required." }, { status: 400 });
  }

  if (dateKey !== getIndiaDateKey()) {
    return Response.json({ error: "This QR code is expired." }, { status: 400 });
  }

  try {
    const [member, branch] = await Promise.all([
      prisma.member.findUnique({
        where: { memberCode },
        select: { id: true, memberCode: true, name: true },
      }),
      prisma.branch.findFirst({
        where: { name: branchName },
        select: { id: true, name: true },
      }),
    ]);

    if (!member) {
      return Response.json({ error: "Member was not found." }, { status: 404 });
    }

    if (!branch) {
      return Response.json({ error: "Branch was not found." }, { status: 404 });
    }

    const { start, end } = dateRangeForIndiaDay(dateKey);
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        memberId: member.id,
        checkedInAt: {
          gte: start,
          lt: end,
        },
      },
      select: { id: true },
    });

    if (existingAttendance) {
      return Response.json({ error: "You have already checked in today." }, { status: 409 });
    }

    const attendance = await prisma.attendance.create({
      data: {
        memberId: member.id,
        branchId: branch.id,
        source: AttendanceSource.QR,
      },
      select: {
        id: true,
        checkedInAt: true,
      },
    });

    return Response.json({
      attendance: {
        id: attendance.id,
        memberId: member.memberCode,
        memberName: member.name,
        branch: branch.name,
        checkedInAt: attendance.checkedInAt.toISOString(),
        source: "member-qr",
      },
    });
  } catch {
    return Response.json({ error: "Attendance could not be saved to the database." }, { status: 500 });
  }
}
