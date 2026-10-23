import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <Card className="border-dashed opacity-60" aria-disabled="true">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          Coming soon
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {description ?? "This feature is not available yet."}
        </p>
      </CardContent>
    </Card>
  );
}
