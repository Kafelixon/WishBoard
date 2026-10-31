import { DEFAULT_CURRENCY } from "@/lib/currency";
import { MAX_RESERVATIONS_PER_WISHLIST } from "@/lib/limits";
import { FC, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { BookmarkCheck, BookmarkPlus, BookmarkX, ExternalLink, Gift, Lock, Pencil, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { WishlistItem } from "@/lib/types";
import {
  WishlistItemChanger,
  addItemToWishlist,
  deleteWishlistItem,
  fetchWishlistView,
  reserveItem,
  unreserveItem,
  updateWishlistItem,
} from "@/lib/wishlistHandlers";
import { Button } from "@/components/ui/button";

const loadItemDialog = () => import("@/components/ui/ItemDialog");
// Only owners can edit; the form's yup and react-hook-form code stays out of everyone else's load.
const ItemDialog = lazy(async () => ({ default: (await loadItemDialog()).ItemDialog }));
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/page";
import { useToast } from "@/components/ui/use-toast";
import { normalizeUrl } from "@/lib/url";
import { currentLanguage } from "@/i18n";

interface WishlistItemsTableProps {
  canEditWishlist: boolean;
  isLoading: boolean;
  items: WishlistItem[];
  onItemsChange: (items: WishlistItem[]) => void;
  wishlistId: string;
  userId: string | null;
}

const PLACEHOLDER_ITEM: WishlistItem = {
  id: "",
  image: "",
  name: "",
  price: 0,
  currency: DEFAULT_CURRENCY,
  link: "",
  public: true,
};

/** Reservations need the Postgres backend's /api function. */
const RESERVATIONS_AVAILABLE = import.meta.env.VITE_BACKEND !== "firestore";

export default function WishlistItemsTable({
  canEditWishlist,
  isLoading,
  items,
  onItemsChange,
  wishlistId,
  userId,
}: WishlistItemsTableProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const location = useLocation();
  const [pendingWrites, setPendingWrites] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] =
    useState<WishlistItem>(PLACEHOLDER_ITEM);
  // Saves run one after another so a slow write can never overwrite a newer
  // list, and the form is only reset when a dialog opens, never when a save ends.
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const isSubmitting = pendingWrites > 0;

  const sortedItems = useMemo(
    // Cheapest first; items without a price go last.
    () =>
      [...items].sort(
        (a, b) =>
          (a.price > 0 ? a.price : Infinity) - (b.price > 0 ? b.price : Infinity) ||
          0,
      ),
    [items],
  );

  const enqueueWrite = (
    write: () => Promise<WishlistItem[]>,
    successMessage: string,
    errorMessage: string | ((error: unknown) => string),
  ) => {
    setPendingWrites((count) => count + 1);
    writeQueueRef.current = writeQueueRef.current
      .then(write)
      .then((updatedItems) => {
        onItemsChange(updatedItems);
        toast({ title: successMessage });
      })
      .catch((error: unknown) => {
        console.error(error);
        toast({
          title: typeof errorMessage === "string" ? errorMessage : errorMessage(error),
          variant: "destructive",
        });
      })
      .finally(() => {
        setPendingWrites((count) => count - 1);
      });
  };

  const openAddDialog = () => {
    setCurrentItem(PLACEHOLDER_ITEM);
    setAddDialogOpen(true);
  };

  const handleItemChange = (changes: Partial<WishlistItem>) => {
    if (changes.price) {
      changes.price = parseFloat(
        changes.price.toString().replace(/^0+(?=\.|$)/, ""),
      );
    }
    setCurrentItem((current) => ({ ...current, ...changes }));
  };

  const handleAddOrUpdateItem = (
    itemAction: WishlistItemChanger,
    successMessage: string,
    errorMessage: string,
  ) => {
    if (!userId || !wishlistId) {
      console.error("User ID or Wishlist ID is missing");
      return;
    }

    // The number input can hand back "" while it is being edited.
    const rawPrice: unknown = currentItem.price;
    const itemWithCorrectLink = {
      ...currentItem,
      image: normalizeUrl(currentItem.image),
      link: normalizeUrl(currentItem.link),
      name: currentItem.name.trim(),
      price: Number(rawPrice) || 0,
    };

    enqueueWrite(
      () => itemAction(userId, wishlistId, itemWithCorrectLink),
      successMessage,
      errorMessage,
    );
  };

  const handleDeleteItem = () => {
    if (!userId || !wishlistId) {
      console.error("User ID or Wishlist ID is missing");
      return;
    }
    const itemId = currentItem.id;
    enqueueWrite(
      () => deleteWishlistItem(userId, wishlistId, itemId),
      t("items.deleted"),
      t("items.deleteFailed"),
    );
    setEditDialogOpen(false);
  };

  const canReserve = RESERVATIONS_AVAILABLE && !canEditWishlist && !!userId;

  /** The API's code says why a reservation was refused; anything else is most likely someone else being first. */
  const reserveErrorMessage = (error: unknown) => {
    const code = (error as { code?: unknown } | null)?.code;
    if (code === "reservation-limit") {
      return t("items.reserveLimit", { max: MAX_RESERVATIONS_PER_WISHLIST });
    }
    return t("items.reserveFailed");
  };

  const handleToggleReservation = (item: WishlistItem) => {
    if (!userId) return;
    const reserve = item.reservation !== "mine";
    const change = reserve ? reserveItem : unreserveItem;
    enqueueWrite(
      () =>
        change(userId, wishlistId, item.id).catch(async (error: unknown) => {
          // Someone may have reserved it first; show the current state along with the error.
          const view = await fetchWishlistView(wishlistId, userId);
          if (view) onItemsChange(view.items);
          throw error;
        }),
      reserve ? t("items.reservedToast") : t("items.unreservedToast"),
      reserve ? reserveErrorMessage : t("items.unreserveFailed"),
    );
  };

  useEffect(() => {
    if (!canEditWishlist) return;
    // Fetch the dialog code in the background so the first click doesn't wait for it.
    const timer = setTimeout(() => {
      void loadItemDialog();
    }, 800);
    return () => {
      clearTimeout(timer);
    };
  }, [canEditWishlist]);

  const privateCount = items.filter((item) => item.public === false).length;

  return (
    <section aria-label={t("items.section")} className="flex flex-col gap-8">
      {!isLoading && items.length > 0 && canEditWishlist && (
        <div className="flex flex-wrap items-end justify-between gap-4 border-y border-border py-4">
          <dl className="flex flex-wrap gap-x-10 gap-y-3">
            <Stat label={t("items.statItems", { count: items.length })} value={String(items.length)} />
            {privateCount > 0 && <Stat label={t("items.statPrivate", { count: privateCount })} value={String(privateCount)} />}
          </dl>
          {userId && (
            <Button onClick={openAddDialog}>
              <Plus aria-hidden="true" /> {t("items.add")}
            </Button>
          )}
        </div>
      )}
      {RESERVATIONS_AVAILABLE && !isLoading && items.length > 0 && !canEditWishlist && !userId && (
        <p className="border-y border-border py-4 text-muted-foreground">
          {t("items.signInToReserve")}{" "}
          <Link
            to="/login"
            state={{ from: location.pathname }}
            className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("items.signInToReserveLink")}
          </Link>
        </p>
      )}
      {canEditWishlist && (
        <Suspense fallback={null}>
        <ItemDialog
          dialogOpen={addDialogOpen}
          setDialogOpen={setAddDialogOpen}
          currentItem={currentItem}
          handleItemChange={handleItemChange}
          handleAction={() =>
            { handleAddOrUpdateItem(
              addItemToWishlist,
              t("items.added"),
              t("items.addFailed"),
            ); }
          }
          isSubmitting={isSubmitting}
          dialogTitle={t("items.addTitle")}
          dialogDescription={t("items.addDescription")}
          actionLabel={t("items.add")}
        />

        {editDialogOpen && (
          <ItemDialog
            dialogOpen={editDialogOpen}
            setDialogOpen={setEditDialogOpen}
            currentItem={currentItem}
            handleItemChange={handleItemChange}
            handleAction={() =>
              { handleAddOrUpdateItem(
                updateWishlistItem,
                t("items.updated"),
                t("items.updateFailed"),
              ); }
            }
            handleDelete={handleDeleteItem}
            isSubmitting={isSubmitting}
            dialogTitle={t("items.editTitle")}
            dialogDescription={t("items.editDescription")}
            actionLabel={t("items.saveChanges")}
          />
        )}
        </Suspense>
      )}
      {isLoading ? (
        <CardsSkeletonLoader />
      ) : sortedItems.length === 0 ? (
        <EmptyState
          icon={<Gift aria-hidden="true" />}
          title={canEditWishlist ? t("items.emptyOwnTitle") : t("items.emptyTitle")}
          description={
            canEditWishlist
              ? t("items.emptyOwnDescription")
              : t("items.emptyDescription")
          }
          action={
            canEditWishlist && userId ? (
              <Button onClick={openAddDialog}>
                <Plus aria-hidden="true" /> {t("items.add")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <CardsList
          items={sortedItems}
          canEditWishlist={canEditWishlist}
          setCurrentItem={setCurrentItem}
          setEditDialogOpen={setEditDialogOpen}
          onToggleReservation={canReserve ? handleToggleReservation : undefined}
        />
      )}
    </section>
  );
}

const formatPrice = (price: number, currency = DEFAULT_CURRENCY) =>
  price.toLocaleString(currentLanguage(), {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const formatDay = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(currentLanguage(), { month: "short", day: "numeric" });

const Stat: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-baseline gap-1.5">
    <dd className="tabular order-first font-display text-2xl font-semibold">{value}</dd>
    <dt className="text-muted-foreground">{label}</dt>
  </div>
);

const GRID_CLASS = "grid gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 sm:gap-5 xl:grid-cols-4";

const CardsSkeletonLoader = () => (
  <ul className={GRID_CLASS} aria-busy="true">
    {["a", "b", "c", "d"].map((key) => (
      <li key={key} className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-[hsl(41_36%_88%)]">
        <Skeleton className="absolute inset-x-2.5 bottom-2.5 h-16 bg-white/60" />
      </li>
    ))}
  </ul>
);

// Cards in the first row or two are above the fold, so their photos must not wait for lazy loading.
const EAGER_IMAGE_COUNT = 4;

/** Widths allowed in vercel.json "images.sizes". */
const IMAGE_WIDTHS = [256, 384, 640, 828];

/** Item photos live on shops' own servers at full size; Vercel's image endpoint serves a resized, cached copy. */
const optimizedUrl = (src: string, width: number) =>
  `/_vercel/image?url=${encodeURIComponent(src)}&w=${String(width)}&q=75`;

const ItemImage: FC<{ src: string; name: string; eager: boolean }> = ({ src, name, eager }) => {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  // Falls back to the original photo when the resize endpoint is unavailable (local dev, quota exceeded).
  const [useOriginal, setUseOriginal] = useState(false);
  const optimize = import.meta.env.PROD && src.startsWith("https://") && !useOriginal;

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={t("items.noImage", { name })}
        className="absolute inset-0 flex items-center justify-center pb-16 text-muted-foreground/60"
      >
        <Gift className="size-10" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={optimize ? optimizedUrl(src, 640) : src}
      srcSet={
        optimize
          ? IMAGE_WIDTHS.map((width) => `${optimizedUrl(src, width)} ${String(width)}w`).join(", ")
          : undefined
      }
      sizes="(min-width: 1280px) 280px, (min-width: 768px) 30vw, (min-width: 480px) 46vw, 92vw"
      alt={name}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      onError={() => {
        if (optimize) setUseOriginal(true);
        else setFailed(true);
      }}
      decoding="async"
      className="absolute inset-0 size-full object-contain p-3 pb-[4.75rem] mix-blend-multiply"
    />
  );
};

const CardsList: FC<{
  items: WishlistItem[];
  canEditWishlist: boolean;
  setCurrentItem: (item: WishlistItem) => void;
  setEditDialogOpen: (open: boolean) => void;
  /** Set for signed-in visitors who may reserve items. */
  onToggleReservation?: (item: WishlistItem) => void;
}> = ({ items, canEditWishlist, setCurrentItem, setEditDialogOpen, onToggleReservation }) => {
  const { t } = useTranslation();
  return (
  <ul className={GRID_CLASS}>
    {items.map((item, index) => {
      const isPrivate = item.public === false;
      const isTaken = item.reservation === "taken";
      const isMine = item.reservation === "mine";
      const title = <span className="line-clamp-2">{item.name}</span>;
      return (
        <li
          key={item.id}
          className="group relative aspect-[4/5] animate-rise overflow-hidden rounded-xl border border-border bg-[hsl(41_36%_88%)] shadow-paper transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
        >
          <div className={isTaken ? "absolute inset-0 opacity-50 grayscale" : "absolute inset-0"}>
            <ItemImage src={item.image} name={item.name} eager={index < EAGER_IMAGE_COUNT} />
          </div>
          {isPrivate && (
            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-card/95 px-2 pb-px pt-[3px] text-xs font-medium text-destructive shadow-sm">
              <Lock className="relative -top-px size-3" aria-hidden="true" />
              {t("items.private")}
              <span className="sr-only">{t("items.privateHint")}</span>
            </span>
          )}
          {isTaken && (
            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-card/95 px-2 pb-px pt-[3px] text-xs font-medium text-muted-foreground shadow-sm">
              <BookmarkCheck className="relative -top-px size-3" aria-hidden="true" />
              {t("items.reserved")}
              <span className="sr-only">{t("items.reservedHint")}</span>
            </span>
          )}
          {isMine && (
            <span className="absolute left-2.5 top-2.5 inline-flex flex-col rounded-md bg-primary px-2 pb-px pt-[3px] text-xs font-medium text-primary-foreground shadow-sm">
              <span className="inline-flex items-center gap-1">
                <BookmarkCheck className="relative -top-px size-3" aria-hidden="true" />
                <span>{t("items.reservedByYou")}</span>
              </span>
              {item.reservedUntil !== undefined && (
                <span className="font-normal">
                  {t("items.reservedUntil", { date: formatDay(item.reservedUntil) })}
                </span>
              )}
            </span>
          )}
          {onToggleReservation && isMine && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2.5 top-2.5 z-10 size-8 rounded-lg text-primary shadow-sm"
              aria-label={t("items.unreserveLabel", { name: item.name })}
              title={t("items.unreserveLabel", { name: item.name })}
              onClick={() => {
                onToggleReservation(item);
              }}
            >
              <BookmarkX aria-hidden="true" />
            </Button>
          )}
          {onToggleReservation && !item.reservation && (
            <Button
              size="sm"
              className="absolute right-2.5 top-2.5 z-10 h-8 rounded-lg shadow-sm"
              aria-label={t("items.reserveLabel", { name: item.name })}
              onClick={() => {
                onToggleReservation(item);
              }}
            >
              <BookmarkPlus aria-hidden="true" />
              {t("items.reserve")}
            </Button>
          )}
          {canEditWishlist && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2.5 top-2.5 z-10 size-8 rounded-lg text-primary shadow-sm"
              aria-label={t("items.edit", { name: item.name })}
              onClick={() => {
                setCurrentItem(item);
                setEditDialogOpen(true);
              }}
            >
              <Pencil aria-hidden="true" />
            </Button>
          )}
          <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-3 rounded-lg border border-white/70 bg-white/80 py-2 pl-3 pr-2 shadow-lift backdrop-blur-md">
            <div className="min-w-0 flex-1">
              <h2 className="break-words font-display text-[0.95rem] font-semibold leading-tight tracking-tight">
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                    aria-label={t("items.viewOnline", { name: item.name })}
                  >
                    {title}
                  </a>
                ) : (
                  title
                )}
              </h2>
              <p className="tabular text-sm text-muted-foreground">
                {item.price > 0 ? formatPrice(item.price, item.currency) : t("items.priceNotSet")}
              </p>
            </div>
            {item.link && (
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
                aria-hidden="true"
              >
                <ExternalLink className="size-4" />
              </span>
            )}
          </div>
        </li>
      );
    })}
  </ul>  );
};
