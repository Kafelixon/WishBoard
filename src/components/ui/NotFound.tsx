import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/page";
import { usePageTitle } from "@/lib/usePageTitle";

interface NotFoundProps {
  title?: string;
  message?: string;
}

export const NotFound = ({ title, message }: NotFoundProps) => {
  const { t } = useTranslation();
  title ??= t("notFound.title");
  message ??= t("notFound.message");
  usePageTitle(title);
  return (
    <div className="mx-auto max-w-xl pt-10">
      <EmptyState
        icon={<Compass aria-hidden="true" />}
        title={title}
        description={message}
        action={
          <Button asChild>
            <Link to="/wishlists">{t("notFound.back")}</Link>
          </Button>
        }
      />
    </div>
  );
};
