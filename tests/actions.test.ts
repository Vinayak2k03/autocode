import { beforeEach, describe, expect, it, vi } from "vitest";

import { UnauthenticatedError } from "@/lib/auth";

const requireUserMock = vi.fn();
const prismaMock = {
  profile: { upsert: vi.fn() },
  project: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock("@/lib/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/auth")>();
  return { ...mod, requireUser: (...args: unknown[]) => requireUserMock(...args) };
});

vi.mock("@/lib/database/prisma", () => ({
  getPrisma: () => prismaMock,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createProjectAction,
  deleteProjectAction,
  updateProjectAction,
} from "@/app/(app)/projects/actions";

const USER = { id: "aaaaaaaa-0000-4000-8000-00000000000a", email: "a@b.co" };
const UUID = "123e4567-e89b-12d3-a456-426614174000";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createProjectAction", () => {
  it("returns UNAUTHENTICATED and never touches the db", async () => {
    requireUserMock.mockRejectedValue(new UnauthenticatedError());
    const result = await createProjectAction({ name: "x" });
    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
    expect(prismaMock.project.create).not.toHaveBeenCalled();
    expect(prismaMock.profile.upsert).not.toHaveBeenCalled();
  });

  it("returns VALIDATION for bad input", async () => {
    requireUserMock.mockResolvedValue(USER);
    const result = await createProjectAction({ name: "   " });
    expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(prismaMock.project.create).not.toHaveBeenCalled();
  });

  it("creates a project", async () => {
    requireUserMock.mockResolvedValue(USER);
    prismaMock.project.create.mockResolvedValue({ id: UUID });
    const result = await createProjectAction({ name: "p1" });
    expect(result).toEqual({ ok: true, data: { id: UUID } });
  });

  it("maps unique violations to CONFLICT", async () => {
    requireUserMock.mockResolvedValue(USER);
    const err = Object.assign(new Error("unique"), { code: "P2002" });
    prismaMock.project.create.mockRejectedValue(err);
    const result = await createProjectAction({ name: "dup" });
    expect(result).toMatchObject({ ok: false, code: "CONFLICT" });
  });

  it("maps unexpected db errors to INTERNAL without leaking details", async () => {
    requireUserMock.mockResolvedValue(USER);
    prismaMock.project.create.mockRejectedValue(
      new Error("SQL syntax error: SELECT * FROM secret"),
    );
    const result = await createProjectAction({ name: "ok" });
    expect(result).toMatchObject({ ok: false, code: "INTERNAL" });
    if (!result.ok) {
      expect(result.message).not.toContain("SQL");
      expect(result.message).not.toContain("secret");
    }
  });
});

describe("updateProjectAction / deleteProjectAction", () => {
  it("rejects non-uuid project ids", async () => {
    requireUserMock.mockResolvedValue(USER);
    for (const action of [
      () => updateProjectAction("not-a-uuid", { name: "x" }),
      () => deleteProjectAction("../../etc"),
    ]) {
      const result = await action();
      expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
    }
    expect(prismaMock.project.updateMany).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when nothing was updated", async () => {
    requireUserMock.mockResolvedValue(USER);
    prismaMock.project.updateMany.mockResolvedValue({ count: 0 });
    const result = await updateProjectAction(UUID, { name: "x" });
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("deletes and revalidates", async () => {
    requireUserMock.mockResolvedValue(USER);
    prismaMock.project.deleteMany.mockResolvedValue({ count: 1 });
    const result = await deleteProjectAction(UUID);
    expect(result).toEqual({ ok: true, data: null });
  });
});
