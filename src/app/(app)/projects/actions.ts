"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireUser, UnauthenticatedError } from "@/lib/auth";
import { getPrisma } from "@/lib/database/prisma";
import {
  createProjectSchema,
  projectIdSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "@/schemas/project";
import {
  asProjectsDb,
  ConflictError,
  createProject,
  deleteProject,
  NotFoundError,
  updateProject,
} from "@/services/projects";

function validationFail(error: {
  issues: { path: PropertyKey[]; message: string }[];
}) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fail("VALIDATION", "Please fix the highlighted fields.", fieldErrors);
}

function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof UnauthenticatedError) {
    return fail("UNAUTHENTICATED", error.message);
  }
  if (error instanceof NotFoundError) {
    return fail("NOT_FOUND", error.message);
  }
  if (error instanceof ConflictError) {
    return fail("CONFLICT", error.message);
  }
  console.error("[autocode] unexpected server action error:", error);
  return fail(
    "INTERNAL",
    "Something went wrong. Please try again later.",
  );
}

export type ProjectActionResult = ActionResult<{ id: string }>;

export async function createProjectAction(
  input: CreateProjectInput,
): Promise<ProjectActionResult> {
  try {
    const user = await requireUser();
    const parsed = createProjectSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);

    const project = (await createProject(
      asProjectsDb(getPrisma()),
      user.id,
      parsed.data,
      user.email,
    )) as { id: string };

    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return ok({ id: project.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateProjectAction(
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectActionResult> {
  try {
    const user = await requireUser();
    const id = projectIdSchema.safeParse(projectId);
    if (!id.success) return fail("VALIDATION", "Invalid project id.");
    const parsed = updateProjectSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);

    await updateProject(asProjectsDb(getPrisma()), user.id, id.data, parsed.data);
    revalidatePath(`/projects/${id.data}`);
    revalidatePath("/projects");
    return ok({ id: id.data });
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteProjectAction(
  projectId: string,
): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const id = projectIdSchema.safeParse(projectId);
    if (!id.success) return fail("VALIDATION", "Invalid project id.");

    await deleteProject(asProjectsDb(getPrisma()), user.id, id.data);
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}
