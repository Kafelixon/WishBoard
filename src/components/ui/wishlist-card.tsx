import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Link2, MoreHorizontal, Pencil } from "lucide-react";
import { Wishlist } from "@/lib/types";
import { currentLanguage } from "@/i18n";
import { WishlistIconBadge } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WishlistCardProps {
  wishlist: Wishlist;
  /** Owners get an actions menu. */
  onEdit?: (wishlist: Wishlist) => void;
  /** Followed wishlists get a menu to rename them for the viewer only. */
  onRename?: (wishlist: Wishlist) => void;
}

const formatUpdated = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(currentLanguage(), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function WishlistCard({ wishlist, onEdit, onRename }: WishlistCardProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const copyLink = () => {
    const url = `${window.location.origin}/wishlist/${wishlist.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast({ title: t("card.copied"), description: t("card.copiedDescription") });
      })
      .catch(() => {
        toast({ title: t("card.copyFailed"), variant: "destructive" });
      });
  };

  const displayName = wishlist.customName ?? wishlist.name;

  return (
    <div className="group relative flex min-h-44 flex-col justify-between gap-6 rounded-xl border border-border bg-card p-5 shadow-paper transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <WishlistIconBadge name={wishlist.icon} color={wishlist.iconColor} />
        {(onEdit ?? onRename) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("card.actionsFor", { name: displayName })}
              className="relative z-10 -mr-2 -mt-1 rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {onEdit && (
                <DropdownMenuItem
                  onSelect={() => {
                    onEdit(wishlist);
                  }}
                >
                  <Pencil aria-hidden="true" /> {t("card.edit")}
                </DropdownMenuItem>
              )}
              {onRename && (
                <DropdownMenuItem
                  onSelect={() => {
                    onRename(wishlist);
                  }}
                >
                  <Pencil aria-hidden="true" /> {t("card.rename")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={copyLink}>
                <Link2 aria-hidden="true" /> {t("card.copyLink")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="min-w-0 space-y-1">
        <h2 className="break-words font-display text-xl font-semibold leading-snug tracking-tight">
          <Link
            to={`/wishlist/${wishlist.id}`}
            className="rounded-sm after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {displayName}
          </Link>
        </h2>
        {wishlist.customName && (
          <p className="truncate text-sm text-muted-foreground" title={wishlist.name}>
            {t("card.originally", { name: wishlist.name })}
          </p>
        )}
        <p className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="truncate">{wishlist.author}</span>
          <span className="tabular shrink-0">{t("card.updated", { date: formatUpdated(wishlist.updateTimestamp) })}</span>
        </p>
      </div>
    </div>
  );
}

export function WishlistCardSkeleton() {
  return (
    <div className="flex min-h-44 flex-col justify-between rounded-xl border border-border bg-card p-5">
      <Skeleton className="size-12" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
    </div>
  );
}
