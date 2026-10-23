import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "@/schemas/project";

/**
 * Prisma-like database dependency. Structurally typed so tests can inject an
 * in-memory fake without importing the real generated client.
 */
export interface ProjectsDb {
  project: {
    findMany(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
      take?: number;
      include?: Record<string, unknown>;
    }): Promise<unknown[]>;
    findFirst(args: { where: Record<string, unknown> }): Promise<unknown>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    updateMany(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
    deleteMany(args: {
      where: Record<string, unknown>;
    }): Promise<{ count: number }>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  profile: {
    upsert(args: {
      where: Record<string, unknown>;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<unknown>;
  };
}

export interface ProjectRecord {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { repositories: number; tasks: number };
}

/**
 * The generated PrismaClient satisfies this shape at runtime; its methods
 * have narrower parameter types, so this cast is required.
 */
export function asProjectsDb(client: unknown): ProjectsDb {
  return client as ProjectsDb;
}

export class NotFoundError extends Error {
  constructor(resource = "Project") {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

const P2002 = "P2002";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === P2002
  );
}

/**
 * Idempotent profile creation for users created before the
 * handle_new_user trigger existed (or in edge cases where it did not run).
 */
export async function ensureProfile(
  db: ProjectsDb,
  userId: string,
  email?: string | null,
): Promise<void> {
  await db.profile.upsert({
    where: { id: userId },
    create: { id: userId, displayName: email ?? undefined },
    update: {},
  });
}

export async function listProjects(
  db: ProjectsDb,
  userId: string,
  take = 20,
): Promise<ProjectRecord[]> {
  return db.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    take,
    include: { _count: { select: { repositories: true, tasks: true } } },
  }) as Promise<ProjectRecord[]>;
}

export async function countProjects(db: ProjectsDb, userId: string) {
  return db.project.count({ where: { ownerId: userId } });
}

export async function createProject(
  db: ProjectsDb,
  userId: string,
  input: CreateProjectInput,
  email?: string | null,
): Promise<ProjectRecord> {
  await ensureProfile(db, userId, email);
  try {
    return (await db.project.create({
      data: {
        ownerId: userId,
        name: input.name,
        description: input.description ?? null,
      },
    })) as ProjectRecord;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError(
        "You already have a project with this name.",
      );
    }
    throw error;
  }
}

/**
 * Returns the project only when it exists AND is owned by userId. Callers
 * get NOT_FOUND in both cases so existence is never leaked across users.
 */
export async function getProject(
  db: ProjectsDb,
  userId: string,
  projectId: string,
): Promise<ProjectRecord> {
  const project = (await db.project.findFirst({
    where: { id: projectId, ownerId: userId },
  })) as ProjectRecord | null;
  if (!project) throw new NotFoundError();
  return project;
}

export async function updateProject(
  db: ProjectsDb,
  userId: string,
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectRecord> {
  try {
    const result = await db.project.updateMany({
      where: { id: projectId, ownerId: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description ?? null }
          : {}),
      },
    });
    if (result.count === 0) throw new NotFoundError();
    return getProject(db, userId, projectId);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError(
        "You already have a project with this name.",
      );
    }
    throw error;
  }
}

export async function deleteProject(
  db: ProjectsDb,
  userId: string,
  projectId: string,
) {
  const result = await db.project.deleteMany({
    where: { id: projectId, ownerId: userId },
  });
  if (result.count === 0) throw new NotFoundError();
}
