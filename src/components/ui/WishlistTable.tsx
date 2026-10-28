import { FC, useMemo, useRef, useState } from "react";
import { ExternalLink, Gift, Lock, Pencil, Plus } from "lucide-react";
import { WishlistItem } from "@/lib/types";
import {
  WishlistItemChanger,
  addItemToWishlist,
  deleteWishlistItem,
  updateWishlistItem,
} from "@/lib/wishlistHandlers";
import { Button } from "@/components/ui/button";
import { ItemDialog } from "@/components/ui/ItemDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/page";
import { useToast } from "@/components/ui/use-toast";
import { normalizeUrl } from "@/lib/url";

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
  link: "",
  public: true,
};

export default function WishlistItemsTable({
  canEditWishlist,
  isLoading,
  items,
  onItemsChange,
  wishlistId,
  userId,
}: WishlistItemsTableProps) {
  const { toast } = useToast();
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
      "Item deleted successfully.",
      "Failed to delete the item.",
    );
    setEditDialogOpen(false);
  };

  const privateCount = items.filter((item) => item.public === false).length;

  return (
    <section aria-label="Items" className="flex flex-col gap-8">
      {!isLoading && items.length > 0 && (
        <div className="flex flex-wrap items-end justify-between gap-4 border-y border-border py-4">
          <dl className="flex flex-wrap gap-x-10 gap-y-3">
            <Stat label={items.length === 1 ? "item" : "items"} value={String(items.length)} />
            {canEditWishlist && privateCount > 0 && (
              <Stat label="private" value={String(privateCount)} />
            )}
          </dl>
          {canEditWishlist && userId && (
            <Button onClick={openAddDialog}>
              <Plus aria-hidden="true" /> Add item
            </Button>
          )}
        </div>
      )}
      <ItemDialog
        dialogOpen={addDialogOpen}
        setDialogOpen={setAddDialogOpen}
        currentItem={currentItem}
        handleItemChange={handleItemChange}
        handleAction={() =>
          { handleAddOrUpdateItem(
            addItemToWishlist,
            "Item added successfully.",
            "Failed to add item to wishlist.",
          ); }
        }
        isSubmitting={isSubmitting}
        dialogTitle="Add an item"
        dialogDescription="Only the name is required. Add an image, price and link if you have them."
        actionLabel="Add item"
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
              "Item updated successfully.",
              "Failed to update item in wishlist.",
            ); }
          }
          handleDelete={handleDeleteItem}
          isSubmitting={isSubmitting}
          dialogTitle="Edit item"
          dialogDescription="Update this item, then save your changes."
          actionLabel="Save changes"
        />
      )}
      {isLoading ? (
        <CardsSkeletonLoader />
      ) : sortedItems.length === 0 ? (
        <EmptyState
          icon={<Gift aria-hidden="true" />}
          title={canEditWishlist ? "Add your first wish" : "Nothing here yet"}
          description={
            canEditWishlist
              ? "Add something you'd love to receive, with a photo and a link to where to buy it."
              : "This wishlist has no public items yet."
          }
          action={
            canEditWishlist && userId ? (
              <Button onClick={openAddDialog}>
                <Plus aria-hidden="true" /> Add item
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
        />
      )}
    </section>
  );
}

const formatPrice = (price: number) =>
  `${price.toLocaleString(undefined, { maximumFractionDigits: 2 })} zł`;

const Stat: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-baseline gap-1.5">
    <dd className="tabular order-first font-display text-2xl font-semibold">{value}</dd>
    <dt className="text-muted-foreground">{label}</dt>
  </div>
);

const CardsSkeletonLoader = () => (
  <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
    {["a", "b", "c", "d"].map((key) => (
      <li key={key} className="overflow-hidden rounded-2xl border border-border bg-card">
        <Skeleton className="aspect-[4/3] rounded-none" />
        <div className="space-y-2 p-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </li>
    ))}
  </ul>
);

const ItemImage: FC<{ src: string; name: string }> = ({ src, name }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={`No image for ${name}`}
        className="absolute inset-0 flex items-center justify-center text-muted-foreground/60"
      >
        <Gift className="size-10" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => {
        setFailed(true);
      }}
      className="absolute inset-0 size-full object-contain p-3 mix-blend-multiply"
    />
  );
};

const CardsList: FC<{
  items: WishlistItem[];
  canEditWishlist: boolean;
  setCurrentItem: (item: WishlistItem) => void;
  setEditDialogOpen: (open: boolean) => void;
}> = ({ items, canEditWishlist, setCurrentItem, setEditDialogOpen }) => (
  <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {items.map((item) => {
      const isPrivate = item.public === false;
      return (
        <li
          key={item.id}
          className="group relative flex animate-rise flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-paper transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
        >
          <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-secondary">
            <ItemImage src={item.image} name={item.name} />
            {isPrivate && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-medium text-destructive shadow-sm">
                <Lock className="size-3" aria-hidden="true" />
                Private
                <span className="sr-only">, only you can see this</span>
              </span>
            )}
            {canEditWishlist && (
              <Button
                variant="outline"
                size="icon"
                className="absolute right-3 top-3 size-9 bg-card/95"
                aria-label={`Edit ${item.name}`}
                onClick={() => {
                  setCurrentItem(item);
                  setEditDialogOpen(true);
                }}
              >
                <Pencil aria-hidden="true" />
              </Button>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="min-w-0 space-y-1">
              <h2 className="break-words font-display text-lg font-semibold leading-snug tracking-tight">
                {item.name}
              </h2>
              <p className="tabular text-muted-foreground">
                {item.price > 0 ? formatPrice(item.price) : "Price not set"}
              </p>
            </div>
            {item.link && (
              <a
                href={item.link}
                className="mt-auto inline-flex items-center gap-1.5 self-start rounded-sm text-[0.95rem] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${item.name} online (opens in a new tab)`}
              >
                View product
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </li>
      );
    })}
  </ul>
);
