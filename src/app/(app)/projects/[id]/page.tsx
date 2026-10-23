import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/database/prisma";
import { projectIdSchema } from "@/schemas/project";
import {
  asProjectsDb,
  getProject,
  NotFoundError,
} from "@/services/projects";
import { ComingSoon } from "@/components/coming-soon";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return { title: "Project" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsed = projectIdSchema.safeParse(id);
  if (!parsed.success) notFound();

  const user = await requireUser();
  let project;
  try {
    project = await getProject(asProjectsDb(getPrisma()), user.id, parsed.data);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="min-w-0 truncate text-2xl font-semibold">
          {project.name}
        </h1>
        <div className="flex shrink-0 gap-2">
          <ProjectFormDialog
            project={project}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            }
          />
          <DeleteProjectButton
            projectId={project.id}
            projectName={project.name}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {project.description ?? "No description"}
          </p>
          <dl className="grid gap-1 text-xs text-muted-foreground">
            <div className="flex gap-2">
              <dt className="w-24">Created</dt>
              <dd>{project.createdAt.toLocaleString()}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24">Updated</dt>
              <dd>{project.updatedAt.toLocaleString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <ComingSoon
          title="Repositories"
          description="Connect a GitHub repository or upload a ZIP to index your code. Available in a future phase."
        />
        <ComingSoon
          title="Tasks"
          description="Let the agent investigate and implement changes. Available in a future phase."
        />
      </div>
    </div>
  );
}
