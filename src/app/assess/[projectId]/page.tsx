import { AssessmentWizard } from "@/components/assess/wizard";

export default async function AssessPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <AssessmentWizard projectId={projectId} />;
}
