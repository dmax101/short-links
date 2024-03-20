import fastify from "fastify";
import { z } from "zod";
import { sql } from "./lib/postgres";
import postgres from "postgres";
import { redis } from "./lib/redis";

const app = fastify();

app.get("/:code", async (request, reply) => {
  const getLinkSchema = z.object({ code: z.string().min(3) });

  const { code } = getLinkSchema.parse(request.params);

  const result = await sql/*sql*/ `
    SELECT id, original_url
    FROM short_links
    WHERE short_links.code = ${code}
    `;

  if (result.length === 0) {
    return reply.status(404).send({ message: "Link not found" });
  }

  const link = result[0];

  await redis.zIncrBy("metrics", 1, String(link.id));

  return reply.redirect(301, result[0].original_url);
});

app.get("/api/links", async (request, reply) => {
  const result = await sql/*sql*/ `
    SELECT *
    FROM short_links
    ORDER BY created_at
    DESC
    `;

  return reply.code(200).send(result); // result is an array of objects with the same shape as the table columns. In this case, it's an array of objects with the shape { id: number, code: string, original_url: string, created_at: Date, updated_at: Date }
});

app.post("/api/links", async (request, reply) => {
  const createLinkBodySchema = z.object({
    code: z.string().min(3),
    url: z.string().url(),
  });

  const { code, url } = createLinkBodySchema.parse(request.body);

  try {
    const result = await sql/*sql*/ `
    INSERT INTO short_links (code, original_url)
    VALUES (${code}, ${url})
    RETURNING id
  `;

    const link = result[0];

    return reply.status(201).send({ shortLinkId: link.id });
  } catch (err) {
    if (err instanceof postgres.PostgresError) {
      if (err.code === "23505") {
        return reply.status(409).send({ message: "Link already exists" });
      }

      console.error(err);

      return reply.status(500).send({ message: "Internal server error" });
    }
  }
});

app.get("/metrics", async (request, reply) => {
  const metrics = await redis.zRangeByScoreWithScores(
    "metrics",
    0,
    50,
    "WITHSCORES"
  );

  const metricsSorted = metrics
    .sort((a, b) => b.score - a.score)
    .map((metric) => {
      return {
        shortLinkId: Number(metric.value),
        visits: Number(metric.score),
      };
    });

  return reply.code(200).send(metricsSorted);
});

const port = 3333;

app.listen({ port }).then(() => {
  console.log(`HTTP server running on port ${port}!`);
});
