import { WishlistItem } from "@/lib/types";
import { FC, useEffect, useState } from "react";
import {
  WishlistItemChanger,
  addItemToWishlist,
  deleteWishlistItem,
  fetchItemsFromWishlist,
  updateWishlistItem,
} from "@/lib/wishlistHandlers";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil } from "lucide-react";
import { Skeleton } from "./skeleton";
import { Switch } from "./switch";

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
        handleAction={() => handleAddOrUpdateItem(addItemToWishlist, "Item added successfully.", "Failed to add item to wishlist.")}
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
          handleAction={() => handleAddOrUpdateItem(updateWishlistItem, "Item updated successfully.", "Failed to update item in wishlist.")}
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

const ItemDialog: FC<{
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  currentItem: WishlistItem;
  handleItemChange: (changes: Partial<WishlistItem>) => void;
  handleAction: () => void;
  handleDelete?: () => void;
  isSubmitting: boolean;
  dialogTitle: string;
  actionLabel: string;
}> = ({
  dialogOpen,
  setDialogOpen,
  currentItem,
  handleItemChange,
  handleAction,
  handleDelete,
  isSubmitting,
  dialogTitle,
  actionLabel,
}) => (
  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogDescription>
          Add a new item to your wishlist. Click add when you're done.
        </DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-4 pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleAction();
          setDialogOpen(false);
        }}
      >
        <ItemFormFields
          currentItem={currentItem}
          handleItemChange={handleItemChange}
        />
        <div className={`flex flex-row ${!handleDelete ? 'justify-end' : 'justify-between'} mt-4`}>
          {handleDelete && (
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete Item
            </Button>
          )}
          <Button type="submit" className="max-w-fit place-self-end">
            {isSubmitting ? (
              <Loader2 className="mx-2 h-4 w-4 animate-spin" />
            ) : (
              actionLabel
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
);

const ItemFormFields: FC<{
  currentItem: WishlistItem;
  handleItemChange: (changes: Partial<WishlistItem>) => void;
}> = ({ currentItem, handleItemChange }) => (
  <>
    <div className="grid grid-cols-4 items-center gap-4 h-10">
      <Label htmlFor="productName" className="text-right">
        Product Name
      </Label>
      <Input
        id="productName"
        value={currentItem.name}
        onChange={(e) => handleItemChange({ name: e.target.value })}
        className="col-span-3"
      />
    </div>
    <div className="grid grid-cols-4 items-center gap-4 h-10">
      <Label htmlFor="averagePrice" className="text-right">
        Average Price
      </Label>
      <Input
        id="averagePrice"
        type="number"
        value={currentItem.price}
        onChange={(e) => {
          const value = e.target.value;
          handleItemChange({
            price: value ? parseFloat(value) : currentItem.price,
          });
        }}
        className="col-span-3"
      />
    </div>
    <div className="grid grid-cols-4 items-center gap-4 h-10">
      <Label htmlFor="link" className="text-right">
        Link
      </Label>
      <Input
        id="link"
        value={currentItem.link}
        onChange={(e) => handleItemChange({ link: e.target.value })}
        className="col-span-3"
      />
    </div>
    <div className="grid grid-cols-4 items-center gap-4 h-10">
      <Label htmlFor="itemPublic" className="text-right">
        Public
      </Label>
      <Switch
        id="itemPublic"
        checked={currentItem.public}
        onCheckedChange={() =>
          handleItemChange({ public: !currentItem.public })
        }
      />
    </div>
  </>
);
