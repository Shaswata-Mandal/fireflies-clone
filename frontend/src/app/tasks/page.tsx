import { ListTodo } from "lucide-react";
import { ComingSoon } from "@/shared/components/ComingSoon";
import { ROUTE_TITLES, ROUTES } from "@/shared/constants/routes";

export default function TasksPage() {
  return (
    <ComingSoon
      title={ROUTE_TITLES[ROUTES.TASKS]}
      icon={ListTodo}
      description="Action items from every meeting will be collected here."
    />
  );
}
