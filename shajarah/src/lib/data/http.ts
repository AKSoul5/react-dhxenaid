import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type output } from "zod";
import { DomainError } from "./treeService";

/** Wraps a route handler with uniform JSON error responses. */
export async function handle<T>(fn: () => Promise<T>, status = 200) {
  try {
    const result = await fn();
    return result === undefined ? new NextResponse(null, { status: 204 }) : NextResponse.json(result, { status });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join("; ") }, { status: 422 });
    }
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<output<S>> {
  const body = await req.json().catch(() => {
    throw new DomainError("Request body must be JSON");
  });
  return schema.parse(body);
}
