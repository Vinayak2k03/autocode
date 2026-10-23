import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { app } from "@/config/app";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/database/prisma";
import {
  asProjectsDb,
  countProjects,
  listProjects,
} from "@/services/projects";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const db = asProjectsDb(getPrisma());
  const [total, recent] = await Promise.all([
    countProjects(db, user.id),
    listProjects(db, user.id, app.pagination.recentProjectsCount),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <ProjectFormDialog
          trigger={
            <Button size="sm">
              <Plus className="h-4 w-4" /> New project
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{total}</p>
          <p className="text-sm text-muted-foreground">
            {total === 1 ? "project" : "projects"} total
          </p>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Recent projects
        </h2>
        {recent.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No projects yet. Create your first project to get started.
              </p>
              <ProjectFormDialog
                trigger={
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4" /> Create project
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((project) => (
              <li key={project.id}>
                <Link href={`/projects/${project.id}`} className="block">
                  <Card className="h-full transition-colors hover:bg-accent/40">
                    <CardHeader>
                      <CardTitle className="truncate text-base">
                        {project.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-2 min-h-5 text-sm text-muted-foreground">
                        {project.description ?? "No description"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
