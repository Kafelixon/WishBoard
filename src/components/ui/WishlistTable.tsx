import { DEFAULT_CURRENCY } from "@/lib/currency";
import { FC, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BookmarkCheck,
  BookmarkPlus,
  BookmarkX,
  Check,
  ExternalLink,
  Gift,
  GripVertical,
  Lock,
  Pencil,
  Plus,
  Star,
} from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TKey } from "@/i18n";
import { WishlistItem } from "@/lib/types";
import {
  WishlistItemChanger,
  addItemToWishlist,
  deleteWishlistItem,
  fetchWishlistView,
  reorderItems,
  reserveItem,
  unreserveItem,
  updateWishlistItem,
} from "@/lib/wishlistHandlers";
import { ITEM_SORTS, type ItemSort, priceCurrencies, sortItems, toItemSort } from "@/lib/itemSort";
import { cn } from "@/lib/utils";
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
  notes: "",
  quantity: 1,
  mostWanted: false,
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

  // The sort lives in the URL so a reload or a shared link keeps it.
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = toItemSort(searchParams.get("sort"));
  const setSort = (next: ItemSort) => {
    setSearchParams(
      (params) => {
        if (next === "owner") params.delete("sort");
        else params.set("sort", next);
        return params;
      },
      { replace: true },
    );
  };
  // Item ids in the owner's draft order while they arrange the list; null otherwise.
  const [arrangeOrder, setArrangeOrder] = useState<string[] | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const sortedItems = useMemo(() => sortItems(items, sort), [items, sort]);
  const arrangedItems = useMemo(() => {
    if (!arrangeOrder) return null;
    const byId = new Map(items.map((item) => [item.id, item]));
    return arrangeOrder.flatMap((id) => byId.get(id) ?? []);
  }, [arrangeOrder, items]);
  const shownItems = arrangedItems ?? sortedItems;
  const sortsByPrice = sort === "price-asc" || sort === "price-desc";
  const mixedCurrencies = sortsByPrice && priceCurrencies(items).length > 1;

  const enqueueWrite = (
    write: () => Promise<WishlistItem[]>,
    successMessage: string,
    errorMessage: string,
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
        toast({ title: errorMessage, variant: "destructive" });
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

  const startArranging = () => {
    setSort("owner");
    setArrangeOrder(items.map((item) => item.id));
  };

  const moveItem = (itemId: string, to: number) => {
    setArrangeOrder((order) => {
      if (!order) return order;
      const from = order.indexOf(itemId);
      if (from < 0 || to < 0 || to >= order.length || from === to) return order;
      const next = [...order];
      next.splice(from, 1);
      next.splice(to, 0, itemId);
      return next;
    });
  };

  const saveOrder = () => {
    setArrangeOrder(null);
    setDraggedId(null);
    if (!userId || !arrangedItems) return;
    const itemIds = arrangedItems.map((item) => item.id);
    if (itemIds.join() === items.map((item) => item.id).join()) return;
    // Show the new order right away, and put the old one back if saving fails.
    const previous = items;
    onItemsChange(arrangedItems);
    enqueueWrite(
      () =>
        reorderItems(userId, wishlistId, itemIds).catch((error: unknown) => {
          onItemsChange(previous);
          throw error;
        }),
      t("items.reordered"),
      t("items.reorderFailed"),
    );
  };

  const canReserve = RESERVATIONS_AVAILABLE && !canEditWishlist && !!userId;

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
      reserve ? t("items.reserveFailed") : t("items.unreserveFailed"),
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
  const askToSignIn = RESERVATIONS_AVAILABLE && !canEditWishlist && !userId;
  const sortSelect = items.length > 1 && (
    <SortSelect sort={sort} onChange={setSort} mixedCurrencies={mixedCurrencies} />
  );

  return (
    <section aria-label={t("items.section")} className="flex flex-col gap-8">
      {!isLoading && items.length > 0 && canEditWishlist && (
        <div className="flex flex-wrap items-end justify-between gap-4 border-y border-border py-4">
          {arrangedItems ? (
            <>
              <p className="text-muted-foreground">{t("items.arrangeHint")}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setArrangeOrder(null);
                  }}
                >
                  {t("items.cancelArrange")}
                </Button>
                <Button onClick={saveOrder}>
                  <Check aria-hidden="true" /> {t("items.saveOrder")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <dl className="flex flex-wrap gap-x-10 gap-y-3">
                <Stat label={t("items.statItems", { count: items.length })} value={String(items.length)} />
                {privateCount > 0 && <Stat label={t("items.statPrivate", { count: privateCount })} value={String(privateCount)} />}
              </dl>
              <div className="flex flex-wrap items-end gap-2">
                {sortSelect}
                {items.length > 1 && (
                  <Button variant="outline" disabled={isSubmitting} onClick={startArranging}>
                    <ArrowUpDown aria-hidden="true" /> {t("items.arrange")}
                  </Button>
                )}
                {userId && (
                  <Button onClick={openAddDialog}>
                    <Plus aria-hidden="true" /> {t("items.add")}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {!isLoading && items.length > 0 && !canEditWishlist && (askToSignIn || sortSelect) && (
        <div className="flex flex-wrap items-end justify-between gap-4 border-y border-border py-4">
          {askToSignIn && (
            <p className="text-muted-foreground">
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
          <div className="ml-auto">{sortSelect}</div>
        </div>
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
      ) : shownItems.length === 0 ? (
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
          items={shownItems}
          canEditWishlist={canEditWishlist}
          setCurrentItem={setCurrentItem}
          setEditDialogOpen={setEditDialogOpen}
          onToggleReservation={canReserve ? handleToggleReservation : undefined}
          arrange={
            arrangedItems ? { onMove: moveItem, draggedId, onDrag: setDraggedId } : undefined
          }
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

const SORT_LABELS: Record<ItemSort, TKey> = {
  owner: "items.sortOwner",
  "price-asc": "items.sortPriceAsc",
  "price-desc": "items.sortPriceDesc",
  newest: "items.sortNewest",
};

const SortSelect: FC<{
  sort: ItemSort;
  onChange: (sort: ItemSort) => void;
  /** Price sorts with more than one currency say that each currency is sorted on its own. */
  mixedCurrencies: boolean;
}> = ({ sort, onChange, mixedCurrencies }) => {
  const { t } = useTranslation();
  return (
    <div className="grid gap-1">
      <label htmlFor="itemSort" className="text-sm text-muted-foreground">
        {t("items.sortLabel")}
      </label>
      <select
        id="itemSort"
        value={sort}
        aria-describedby={mixedCurrencies ? "itemSort-hint" : undefined}
        onChange={(e) => {
          onChange(toItemSort(e.target.value));
        }}
        className="h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground transition-colors hover:border-foreground/30 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        {ITEM_SORTS.map((option) => (
          <option key={option} value={option}>
            {t(SORT_LABELS[option])}
          </option>
        ))}
      </select>
      {mixedCurrencies && (
        <p id="itemSort-hint" className="max-w-56 text-xs text-muted-foreground">
          {t("items.sortCurrencyHint")}
        </p>
      )}
    </div>
  );
};

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
      draggable={false}
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

/** Set while the owner arranges the list: cards can be dragged, or moved with their arrow buttons. */
interface ArrangeControls {
  onMove: (itemId: string, to: number) => void;
  draggedId: string | null;
  onDrag: (itemId: string | null) => void;
}

/** Moving a card can drop focus from its arrow; put it back so keyboard users can keep going. */
const refocusMoveButton = (itemId: string, direction: "earlier" | "later") => {
  requestAnimationFrame(() => {
    const buttons = [direction, direction === "earlier" ? "later" : "earlier"].map((dir) =>
      document.querySelector<HTMLButtonElement>(`[data-move="${CSS.escape(`${itemId}:${dir}`)}"]`),
    );
    buttons.find((button) => button && !button.disabled)?.focus();
  });
};

const CardsList: FC<{
  items: WishlistItem[];
  canEditWishlist: boolean;
  setCurrentItem: (item: WishlistItem) => void;
  setEditDialogOpen: (open: boolean) => void;
  /** Set for signed-in visitors who may reserve items. */
  onToggleReservation?: (item: WishlistItem) => void;
  arrange?: ArrangeControls;
}> = ({ items, canEditWishlist, setCurrentItem, setEditDialogOpen, onToggleReservation, arrange }) => {
  const { t } = useTranslation();
  return (
  <ul className={GRID_CLASS}>
    {items.map((item, index) => {
      const isPrivate = item.public === false;
      const isTaken = item.reservation === "taken";
      const isMine = item.reservation === "mine";
      const quantity = item.quantity ?? 1;
      const title = <span className="line-clamp-2">{item.name}</span>;
      const move = (to: number, direction: "earlier" | "later") => {
        arrange?.onMove(item.id, to);
        refocusMoveButton(item.id, direction);
      };
      return (
        // Dragging is a pointer shortcut; the arrow buttons are the keyboard and touch way to move a card.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <li
          key={item.id}
          draggable={arrange ? true : undefined}
          onDragStart={
            arrange &&
            ((event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", item.id);
              arrange.onDrag(item.id);
            })
          }
          onDragOver={
            arrange &&
            ((event) => {
              if (!arrange.draggedId) return;
              event.preventDefault();
              arrange.onMove(arrange.draggedId, index);
            })
          }
          onDrop={
            arrange &&
            ((event) => {
              event.preventDefault();
            })
          }
          onDragEnd={
            arrange &&
            (() => {
              arrange.onDrag(null);
            })
          }
          className={cn(
            "group relative aspect-[4/5] animate-rise overflow-hidden rounded-xl border border-border bg-[hsl(41_36%_88%)] shadow-paper transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift",
            arrange && "cursor-grab active:cursor-grabbing",
            arrange?.draggedId === item.id && "opacity-50",
          )}
        >
          <div className={isTaken ? "absolute inset-0 opacity-50 grayscale" : "absolute inset-0"}>
            <ItemImage src={item.image} name={item.name} eager={index < EAGER_IMAGE_COUNT} />
          </div>
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {item.mostWanted && (
              <span className="inline-flex items-center gap-1 rounded-md bg-card/95 px-2 pb-px pt-[3px] text-xs font-medium text-primary shadow-sm">
                <Star className="relative -top-px size-3 fill-current" aria-hidden="true" />
                {t("items.mostWanted")}
              </span>
            )}
            {isPrivate && (
              <span className="inline-flex items-center gap-1 rounded-md bg-card/95 px-2 pb-px pt-[3px] text-xs font-medium text-destructive shadow-sm">
                <Lock className="relative -top-px size-3" aria-hidden="true" />
                {t("items.private")}
                <span className="sr-only">{t("items.privateHint")}</span>
              </span>
            )}
            {isTaken && (
              <span className="inline-flex items-center gap-1 rounded-md bg-card/95 px-2 pb-px pt-[3px] text-xs font-medium text-muted-foreground shadow-sm">
                <BookmarkCheck className="relative -top-px size-3" aria-hidden="true" />
                {t("items.reserved")}
                <span className="sr-only">{t("items.reservedHint")}</span>
              </span>
            )}
            {isMine && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 pb-px pt-[3px] text-xs font-medium text-primary-foreground shadow-sm">
                <BookmarkCheck className="relative -top-px size-3" aria-hidden="true" />
                {t("items.reservedByYou")}
              </span>
            )}
          </div>
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
          {canEditWishlist && !arrange && (
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
          {arrange && (
            <div className="absolute right-2.5 top-2.5 z-10 flex gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="size-8 rounded-lg text-primary shadow-sm"
                aria-label={t("items.moveEarlier", { name: item.name })}
                data-move={`${item.id}:earlier`}
                disabled={index === 0}
                onClick={() => {
                  move(index - 1, "earlier");
                }}
              >
                <ArrowLeft aria-hidden="true" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="size-8 rounded-lg text-primary shadow-sm"
                aria-label={t("items.moveLater", { name: item.name })}
                data-move={`${item.id}:later`}
                disabled={index === items.length - 1}
                onClick={() => {
                  move(index + 1, "later");
                }}
              >
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          )}
          <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-3 rounded-lg border border-white/70 bg-white/80 py-2 pl-3 pr-2 shadow-lift backdrop-blur-md">
            <div className="min-w-0 flex-1">
              <h2 className="break-words font-display text-[0.95rem] font-semibold leading-tight tracking-tight">
                {item.link && !arrange ? (
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
                {quantity > 1 && <> · {t("items.quantity", { count: quantity })}</>}
              </p>
              {item.notes && (
                <p className="line-clamp-2 break-words text-xs leading-snug text-muted-foreground">
                  {item.notes}
                </p>
              )}
            </div>
            {arrange ? (
              <GripVertical className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              item.link && (
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
                  aria-hidden="true"
                >
                  <ExternalLink className="size-4" />
                </span>
              )
            )}
          </div>
        </li>
      );
    })}
  </ul>  );
};
