import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  <Card className="glass w-full md:w-[60vw] lg:w-[45vw] m-auto">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-4 items-start">
      <p className="text-muted-foreground">{message}</p>
      <Button asChild>
        <Link to="/wishlists">Back to your wishlists</Link>
      </Button>
    </CardContent>
  </Card>

  );
};
