import { FC, useMemo, useRef, useState } from "react";
import { ExternalLink, Gift, Lock, Pencil } from "lucide-react";
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

  return (
    <div className="flex flex-col gap-2.5">
      {canEditWishlist && userId && (
        <Button variant="outline" className="glass-fg" onClick={openAddDialog}>
          Add Item
        </Button>
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
        dialogTitle="Add Item"
        dialogDescription="Add a new item to your wishlist. Image, price and link are optional."
        actionLabel="Add listing"
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
          dialogTitle="Edit Wishlist Item"
          dialogDescription="Update this item, then save your changes."
          actionLabel="Save changes"
        />
      )}
      {isLoading ? (
        <CardsSkeletonLoader />
      ) : sortedItems.length === 0 ? (
        <p className="text-center text-gray-500 py-6">
          {canEditWishlist
            ? "No items yet. Use Add Item to add your first wish."
            : "This wishlist has no public items yet."}
        </p>
      ) : (
        <CardsList
          items={sortedItems}
          canEditWishlist={canEditWishlist}
          setCurrentItem={setCurrentItem}
          setEditDialogOpen={setEditDialogOpen}
        />
      )}
    </div>
  );
}

const CardsSkeletonLoader = () => (
  <>
    <Skeleton className="30vw h-32" />
    <Skeleton className="30vw h-32" />
  </>
);

const ItemImage: FC<{ src: string; name: string }> = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  const frame =
    "size-28 min-h-28 min-w-28 rounded-lg border border-solid border-gray-300";

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={`No image for ${name}`}
        className={`${frame} flex items-center justify-center bg-gray-100 text-gray-400`}
      >
        <Gift className="size-8" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      width={112}
      height={112}
      loading="lazy"
      onError={() => {
        setFailed(true);
      }}
      className={`${frame} object-contain bg-white`}
    />
  );
};

const CardsList: FC<{
  items: WishlistItem[];
  canEditWishlist: boolean;
  setCurrentItem: (item: WishlistItem) => void;
  setEditDialogOpen: (open: boolean) => void;
}> = ({ items, canEditWishlist, setCurrentItem, setEditDialogOpen }) => (
  <>
    {items.map((item) => {
      const isPrivate = item.public === false;
      return (
        <div
          key={item.id}
          className={`flex gap-2.5 justify-between border px-2.5 py-2.5 rounded-lg border-solid border-gray-300 max-w-full break-words ${
            isPrivate ? "bg-gray-200" : "glass-fg"
          }`}
        >
          <div className="flex gap-2.5 items-center min-w-0">
            <ItemImage src={item.image} name={item.name} />
            <div className="flex flex-col min-w-0">
              <h2 className="font-semibold mt-0 mb-1 mx-0">{item.name}</h2>
              <p className="text-gray-500 mt-0 mb-[5px] mx-0">
                {item.price > 0 ? (
                  <>
                    Average Price:{" "}
                    <span className="whitespace-nowrap">{item.price} zł</span>
                  </>
                ) : (
                  "Price not set"
                )}
              </p>
              {isPrivate && (
                <p className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                  <Lock className="size-3" aria-hidden="true" />
                  Private, only you can see this
                </p>
              )}
              {item.link && (
                <a
                  href={item.link}
                  className="inline-flex items-center gap-1 no-underline text-blue-700 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View ${item.name} online (opens in a new tab)`}
                >
                  View product
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
          {canEditWishlist && (
            <Button
              variant="outline"
              className="p-2 size-9 shrink-0"
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
      );
    })}
  </>
);
