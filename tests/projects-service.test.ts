import { describe, expect, it } from "vitest";

import {
  ConflictError,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  NotFoundError,
  updateProject,
  type ProjectsDb,
} from "@/services/projects";

type Row = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

class UniqueViolation extends Error {
  code = "P2002";
}

function makeDb() {
  const projects: Row[] = [];
  const profiles = new Set<string>();
  let seq = 0;
  const newId = () => `123e4567-e89b-12d3-a456-42661417${(seq++).toString().padStart(4, "0")}`;

  const db: ProjectsDb = {
    profile: {
      async upsert({ where, create }) {
        if (!profiles.has(where.id as string)) {
          profiles.add(create.id as string);
        }
        return {};
      },
    },
    project: {
      async findMany({ where, take }) {
        return projects
          .filter((p) => p.ownerId === where.ownerId)
          .slice(0, take ?? 20);
      },
      async findFirst({ where }) {
        return (
          projects.find(
            (p) => p.id === where.id && p.ownerId === where.ownerId,
          ) ?? null
        );
      },
      async create({ data }) {
        if (
          projects.some(
            (p) => p.ownerId === data.ownerId && p.name === data.name,
          )
        ) {
          throw new UniqueViolation();
        }
        const row: Row = {
          id: newId(),
          ownerId: data.ownerId as string,
          name: data.name as string,
          description: (data.description as string | null) ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        projects.push(row);
        return row;
      },
      async updateMany({ where, data }) {
        const target = projects.find(
          (p) => p.id === where.id && p.ownerId === where.ownerId,
        );
        if (!target) return { count: 0 };
        if (
          data.name &&
          projects.some(
            (p) =>
              p.ownerId === target.ownerId &&
              p.name === data.name &&
              p.id !== target.id,
          )
        ) {
          throw new UniqueViolation();
        }
        Object.assign(target, data);
        return { count: 1 };
      },
      async deleteMany({ where }) {
        const idx = projects.findIndex(
          (p) => p.id === where.id && p.ownerId === where.ownerId,
        );
        if (idx === -1) return { count: 0 };
        projects.splice(idx, 1);
        return { count: 1 };
      },
      async count({ where }) {
        return projects.filter((p) => p.ownerId === where.ownerId).length;
      },
    },
  };
  return { db, projects, profiles };
}

const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const B = "bbbbbbbb-0000-4000-8000-00000000000b";

describe("project service (in-memory db)", () => {
  it("creates and lists projects scoped to the owner", async () => {
    const { db, profiles } = makeDb();
    await createProject(db, A, { name: "a1" });
    await createProject(db, B, { name: "b1" });

    const aProjects = await listProjects(db, A);
    expect(aProjects).toHaveLength(1);
    expect(aProjects[0]!.name).toBe("a1");
    expect(profiles.has(A)).toBe(true);
  });

  it("returns NOT_FOUND when another user gets/updates/deletes by uuid", async () => {
    const { db, projects } = makeDb();
    const mine = await createProject(db, A, { name: "mine" });

    await expect(getProject(db, B, mine.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(
      updateProject(db, B, mine.id, { name: "hijack" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteProject(db, B, mine.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(projects.find((p) => p.id === mine.id)?.name).toBe("mine");
  });

  it("owner can update and delete", async () => {
    const { db } = makeDb();
    const mine = await createProject(db, A, { name: "orig" });
    const updated = await updateProject(db, A, mine.id, {
      name: "renamed",
      description: "d",
    });
    expect(updated.name).toBe("renamed");
    await deleteProject(db, A, mine.id);
    await expect(getProject(db, A, mine.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("maps duplicate names to ConflictError", async () => {
    const { db } = makeDb();
    await createProject(db, A, { name: "dup" });
    await expect(createProject(db, A, { name: "dup" })).rejects.toBeInstanceOf(
      ConflictError,
    );
    // same name under a different owner is fine
    await expect(
      createProject(db, B, { name: "dup" }),
    ).resolves.toBeTruthy();
  });
});
