"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import {
  createProjectAction,
  updateProjectAction,
} from "@/app/(app)/projects/actions";
import {
  createProjectSchema,
  type CreateProjectInput,
} from "@/schemas/project";
import type { ProjectRecord } from "@/services/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProjectFormDialog({
  trigger,
  project,
}: {
  trigger: React.ReactNode;
  /** When set, the dialog edits this project instead of creating one. */
  project?: ProjectRecord;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
    },
  });

  async function onSubmit(values: CreateProjectInput) {
    setFormError(null);
    const result = project
      ? await updateProjectAction(project.id, values)
      : await createProjectAction(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (field === "name" || field === "description") {
            setError(field, { message: messages[0] });
          }
        }
      }
      setFormError(result.fieldErrors ? null : result.message);
      return;
    }

    setOpen(false);
    if (!project) {
      reset();
      router.push(`/projects/${result.data.id}`);
    }
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {project
              ? "Update the project name or description."
              : "Projects group your repositories and agent tasks."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-description">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <textarea
              id="project-description"
              rows={3}
              aria-invalid={!!errors.description}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>
          <div aria-live="polite">
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? project
                ? "Saving…"
                : "Creating…"
              : project
                ? "Save changes"
                : "Create project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
