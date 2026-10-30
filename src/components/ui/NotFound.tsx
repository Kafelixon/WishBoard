import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/page";
import { usePageTitle } from "@/lib/usePageTitle";

interface NotFoundProps {
  title?: string;
  message?: string;
}

export const NotFound = ({
  title = "Page not found",
  message = "The page you are looking for does not exist.",
}: NotFoundProps) => {
  usePageTitle(title);
  return (
    <div className="mx-auto max-w-xl pt-10">
      <EmptyState
        icon={<Compass aria-hidden="true" />}
        title={title}
        description={message}
        action={
          <Button asChild>
            <Link to="/wishlists">Back to your wishlists</Link>
          </Button>
        }
      />
    </div>
  );
};
