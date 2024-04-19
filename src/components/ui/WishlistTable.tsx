import { FC, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { WishlistItem } from "@/lib/types";
import {
  WishlistItemChanger,
  addItemToWishlist,
  deleteWishlistItem,
  fetchItemsFromWishlist,
  updateWishlistItem,
} from "@/lib/wishlistHandlers";
import { Button } from "@/components/ui/button";
import { ItemDialog } from "@/components/ui/ItemDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

interface WishlistItemsTableProps {
  canEditWishlist: boolean;
  wishlistId: string;
  userId: string | null;
}

const PLACEHOLDER_ITEM: WishlistItem = {
  id: "",
  image: "https://via.placeholder.com/150",
  name: "",
  price: 0,
  link: "",
  public: true,
};

export default function WishlistItemsTable({
  canEditWishlist,
  wishlistId,
  userId,
}: WishlistItemsTableProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userWishlist, setUserWishlist] = useState<WishlistItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] =
    useState<WishlistItem>(PLACEHOLDER_ITEM);

  useEffect(() => {
    const fetchWishlist = async () => {
      if (wishlistId) {
        setIsFetching(true);
        const data = await fetchItemsFromWishlist(wishlistId, userId);
        setUserWishlist(data ?? []);
        setIsFetching(false);
      }
    };

    void fetchWishlist();
  }, [userId, wishlistId]);

  const openAddDialog = () => {
    setCurrentItem(PLACEHOLDER_ITEM);
    setAddDialogOpen(true);
  };

  const handleProtocol = (link: string) =>
    link.startsWith("http://") || link.startsWith("https://")
      ? link
      : `http://${link}`;

  const handleItemChange = (changes: Partial<WishlistItem>) =>
    setCurrentItem((current) => ({ ...current, ...changes }));

  const handleAddOrUpdateItem = (
    itemAction: WishlistItemChanger,
    successMessage: string,
    errorMessage: string
  ) => {
    if (!userId || !wishlistId) {
      console.error("User ID or Wishlist ID is missing");
      return;
    }

    setIsSubmitting(true);
    const itemWithCorrectLink = {
      ...currentItem,
      link: handleProtocol(currentItem.link),
      name: currentItem.name.trim(),
    };

    itemAction(userId, wishlistId, itemWithCorrectLink)
      .then(() => {
        toast({ title: successMessage });
      })
      .catch((error) => {
        console.error(error);
        toast({
          title: errorMessage,
          variant: "destructive",
        });
      })
      .finally(() => {
        void fetchItemsFromWishlist(wishlistId, userId).then((data) => {
          if (data) {
            setUserWishlist(data);
          }
        });
        setIsSubmitting(false);
        setCurrentItem(PLACEHOLDER_ITEM);
      });
  };

  const handleDeleteItem = () => {
    if (!userId || !wishlistId) {
      console.error("User ID or Wishlist ID is missing");
      return;
    }
    deleteWishlistItem(userId, wishlistId, currentItem.id)
      .then(() => {
        toast({ title: "Item deleted successfully." });
        return fetchItemsFromWishlist(wishlistId, userId);
      })
      .then((data) => {
        if (data) {
          setUserWishlist(data);
        }
      })
      .catch((error) => {
        console.error(error);
        toast({ title: "Failed to delete the item.", variant: "destructive" });
      });
    setCurrentItem(PLACEHOLDER_ITEM);
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
          handleAddOrUpdateItem(
            addItemToWishlist,
            "Item added successfully.",
            "Failed to add item to wishlist."
          )
        }
        isSubmitting={isSubmitting}
        dialogTitle="Add Item"
        actionLabel="Add listing"
      />

      {editDialogOpen && (
        <ItemDialog
          dialogOpen={editDialogOpen}
          setDialogOpen={setEditDialogOpen}
          currentItem={currentItem}
          handleItemChange={handleItemChange}
          handleAction={() =>
            handleAddOrUpdateItem(
              updateWishlistItem,
              "Item updated successfully.",
              "Failed to update item in wishlist."
            )
          }
          handleDelete={handleDeleteItem}
          isSubmitting={isSubmitting}
          dialogTitle="Edit Wishlist Item"
          actionLabel="Save change"
        />
      )}
      {isFetching ? (
        <CardsSkeletonLoader />
      ) : (
        <CardsList
          items={userWishlist}
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

const CardsList: FC<{
  items: WishlistItem[];
  canEditWishlist: boolean;
  setCurrentItem: (item: WishlistItem) => void;
  setEditDialogOpen: (open: boolean) => void;
}> = ({ items, canEditWishlist, setCurrentItem, setEditDialogOpen }) => (
  <>
    {items
      .sort((a, b) => a.price - b.price)
      .map((item) => (
        <div
          key={item.id}
          className={`flex gap-2.5 justify-between border px-2.5 py-2.5 rounded-lg border-solid border-gray-300 max-w-full break-all ${
            item.public === false ? "bg-gray-200" : "glass-fg"
          }`}
        >
          <div className="flex gap-2.5 items-center">
            <img
              src={item.image}
              alt="Product"
              className="size-28 min-h-28 min-w-28 object-contain bg-white border border-gray-300 rounded-lg"
            />
            <div className="flex flex-col">
              <h2 className="font-semibold mt-0 mb-1 mx-0">{item.name}</h2>
              <p className="text-gray-500 mt-0 mb-[5px] mx-0">
                Average Price: {item.price} zł
              </p>
              <a
                href={item.link}
                className="no-underline text-blue-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                Link
              </a>
            </div>
          </div>
          {canEditWishlist && (
            <Button
              variant="outline"
              className="p-2 size-9"
              onClick={() => {
                setCurrentItem(item);
                setEditDialogOpen(true);
              }}
            >
              <Pencil />
            </Button>
          )}
        </div>
      ))}
  </>
);
