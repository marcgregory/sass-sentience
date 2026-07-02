import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { reports } from "../db/schema";
import { eq, and, count, desc, asc, SQL } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";

const createReportSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["daily", "weekly", "monthly", "custom", "adhoc"]),
  format: z.enum(["csv", "pdf"]).default("csv"),
  dateRangeStart: z.string(),
  dateRangeEnd: z.string(),
  filters: z.object({
    estateId: z.string().optional(),
    siteId: z.string().optional(),
    deviceId: z.string().optional(),
    severity: z.array(z.string()).optional(),
  }).optional(),
});

export async function reportRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      sort?: string;
      order?: string;
    };

    const page = Math.max(1, parseInt(query.page ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "20")));
    const offset = (page - 1) * limit;

    const [{ total }] = await db
      .select({ total: count() })
      .from(reports);

    const sortField = query.sort === "name" ? reports.name : reports.createdAt;
    const orderBy = query.order === "asc" ? asc(sortField) : desc(sortField);

    const result = await db
      .select()
      .from(reports)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return reply.send({
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  app.get("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);

    if (!report) {
      return reply.status(404).send({ message: "Report not found", code: "NOT_FOUND" });
    }

    return reply.send(report);
  });

  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = createReportSchema.parse(request.body);
    const user = request.user as { sub: string; email: string; role: string; name: string };

    const [report] = await db
      .insert(reports)
      .values({
        name: body.name,
        type: body.type,
        format: body.format,
        dateRangeStart: new Date(body.dateRangeStart),
        dateRangeEnd: new Date(body.dateRangeEnd),
        filters: body.filters ?? {},
        metrics: [],
        status: "generating",
        generatedBy: user.sub,
      })
      .returning();

    // In a real app, this would trigger async report generation.
    // For now, mark it as ready immediately.
    const [readyReport] = await db
      .update(reports)
      .set({
        status: "ready",
        generatedAt: new Date(),
        fileUrl: `/api/reports/${report.id}/download`,
      })
      .where(eq(reports.id, report.id))
      .returning();

    return reply.status(201).send(readyReport);
  });
}
