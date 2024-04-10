import { WishlistItem } from "@/lib/types";
import { useEffect, useState } from "react";
import {
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil } from "lucide-react";
import { Skeleton } from "./skeleton";

interface WishlistItemsTableProps {
  canEditWishlist: boolean;
  wishlistId: string;
  userId: string | null;
}

export default function WishlistItemsTable({
  canEditWishlist,
  wishlistId,
  userId,
}: WishlistItemsTableProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [userWishlist, setUserWishlist] = useState<WishlistItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const PLACEHOLDER_ITEM: WishlistItem = {
    id: 0,
    image: "https://via.placeholder.com/150",
    name: "",
    price: 0,
    link: "",
    public: true,
  };
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] =
    useState<WishlistItem>(PLACEHOLDER_ITEM);

  useEffect(() => {
    if (wishlistId) {
      setIsFetching(true);
      void fetchItemsFromWishlist(wishlistId, userId)
        .then((data) => {
          if (data) {
            setUserWishlist(data);
          }
        })
        .finally(() => setIsFetching(false));
    }
  }, [userId, wishlistId]);

  const cards = userWishlist
    ? [...userWishlist]
        .sort((a, b) => a.price - b.price)
        .map((item, index) => (
          <div
            key={index}
            className={`flex gap-2.5 justify-between border px-2.5 py-2.5 rounded-lg border-solid border-gray-300 max-w-full break-all ${
              item.public === false ? "bg-gray-200" : "glass-fg"
            }`}
          >
            <div className="flex gap-2.5 items-center">
              <img
                src={item.image}
                alt="Product Image"
                className="size-28 min-h-28 min-w-28 object-contain bg-white border border-gray-300 rounded-lg"
              />
              <div className="flex flex-col">
                <h2 className="font-semibold mt-0 mb-1 mx-0">{item.name}</h2>
                <p className=" text-gray-500 mt-0 mb-[5px] mx-0">
                  Average Price: {item.price} zł
                </p>
                <a
                  className="no-underline text-blue-600"
                  href={item.link}
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
                  setCurrentItem({ ...item, id: index });
                  setIsEditing(true);
                }}
              >
                <Pencil />
              </Button>
            )}
          </div>
        ))
    : [];

  const cardsSkeleton = (
    <>
      <Skeleton className="30vw h-32" />
      <Skeleton className="30vw h-32" />
    </>
  );

  const addListing = async () => {
    if (!userId || !wishlistId) {
      console.error("User ID or Wishlist ID is missing");
      return;
    }

    try {
      setIsAdding(true);

      // Add protocol to the url if not present
      if (
        !currentItem.link.startsWith("http://") &&
        !currentItem.link.startsWith("https://")
      ) {
        currentItem.link = `http://${currentItem.link}`;
      }

      await addItemToWishlist(userId, wishlistId, {
        name: currentItem.name.trim(),
        price: currentItem.price,
        link: currentItem.link,
        image: currentItem.image,
        public: currentItem.public,
      });
      setIsAdding(false);
      toast({ title: "Item added successfully." });
      if (userId) {
        void fetchItemsFromWishlist(wishlistId, userId).then((data) => {
          if (data) {
            setUserWishlist(data);
          }
        });
      }
    } catch (error) {
      setIsAdding(false);
      console.error(error);
      toast({
        title: "Failed to add item to wishlist.",
        variant: "destructive",
      });
    }
    setCurrentItem(PLACEHOLDER_ITEM);
  };

  const updateItem = async () => {
    if (!userId || !wishlistId) {
      console.error("User ID or Wishlist ID is missing");
      return;
    }

    try {
      setIsAdding(true);

      // Add protocol to the url if not present
      if (
        !currentItem.link.startsWith("http://") &&
        !currentItem.link.startsWith("https://")
      ) {
        currentItem.link = `http://${currentItem.link}`;
      }

      await updateWishlistItem(userId, wishlistId, {
        id: currentItem.id,
        name: currentItem.name.trim(),
        price: currentItem.price,
        link: currentItem.link,
        image: currentItem.image,
        public: currentItem.public,
      });
      setIsAdding(false);
      toast({ title: "Item updated successfully." });
      if (userId) {
        void fetchItemsFromWishlist(wishlistId, userId).then((data) => {
          if (data) {
            setUserWishlist(data);
          }
        });
      }
    } catch (error) {
      setIsAdding(false);
      console.error(error);
      toast({
        title: "Failed to update the item.",
        variant: "destructive",
      });
    }
    setCurrentItem(PLACEHOLDER_ITEM);
  };

  const deleteItem = async () => {
    if (!userId || !wishlistId) {
      console.error("User ID or Wishlist ID is missing");
      return;
    }

    try {
      await deleteWishlistItem(userId, wishlistId, currentItem.id as number);
      setIsEditing(false);
      toast({ title: "Item deleted successfully." });
      if (userId) {
        void fetchItemsFromWishlist(wishlistId, userId).then((data) => {
          if (data) {
            setUserWishlist(data);
          }
        });
      }
    } catch (error) {
      setIsEditing(false);
      console.error(error);
      toast({
        title: "Failed to delete the item.",
        variant: "destructive",
      });
    }
    setCurrentItem(PLACEHOLDER_ITEM);
  };

  function addItem() {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="glass-fg">
            Add Item
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full p-3 max-w-[95vw] m-auto rounded-lg">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Add a new item to your wishlist. Click add when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* //TODO: Add image upload or link */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="productName" className="text-right">
                Product Name
              </Label>
              <Input
                id="productName"
                value={currentItem.name}
                onChange={(e) =>
                  setCurrentItem({ ...currentItem, name: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="averagePrice" className="text-right">
                Average Price
              </Label>
              <Input
                id="averagePrice"
                type="number"
                value={currentItem.price}
                onChange={(e) => {
                  setCurrentItem({
                    ...currentItem,
                    price: parseFloat(e.target.value),
                  });
                }}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link" className="text-right">
                Link
              </Label>
              <Input
                id="link"
                value={currentItem.link}
                onChange={(e) =>
                  setCurrentItem({ ...currentItem, link: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-left gap-4">
              <Label htmlFor="itemPublic" className="text-right">
                Public
              </Label>
              <input
                id="itemPublic"
                type="checkbox"
                checked={currentItem.public as boolean}
                onChange={() =>
                  setCurrentItem({
                    ...currentItem,
                    public: !currentItem.public,
                  })
                }
                className="col-span-3 place-self-start"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="submit"
                color="primary"
                onClick={() => void addListing()}
              >
                {isAdding ? (
                  <Loader2 className="mx-2 h-4 w-4 animate-spin" />
                ) : (
                  "Add listing"
                )}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  function EditDialog() {
    return (
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Wishlist Item</DialogTitle>
            <DialogDescription>
              Add a new item to your wishlist. Click add when you're done.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4 py-4"
            onSubmit={(event) => {
              event.preventDefault();
              updateItem()
                .then(() => setIsEditing(false))
                .catch((e: unknown) => console.error(e));
            }}
          >
            {/* //TODO: Add image upload or link */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="productName" className="text-right">
                Product Name
              </Label>
              <Input
                id="productName"
                value={currentItem.name}
                onChange={(e) =>
                  setCurrentItem({ ...currentItem, name: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="averagePrice" className="text-right">
                Average Price
              </Label>
              <Input
                id="averagePrice"
                type="number"
                value={currentItem.price}
                onChange={(e) => {
                  setCurrentItem({
                    ...currentItem,
                    price: parseFloat(e.target.value),
                  });
                }}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link" className="text-right">
                Link
              </Label>
              <Input
                id="link"
                value={currentItem.link}
                onChange={(e) =>
                  setCurrentItem({ ...currentItem, link: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-left gap-4">
              <Label htmlFor="itemPublic" className="text-right">
                Public
              </Label>
              <input
                id="itemPublic"
                type="checkbox"
                checked={currentItem.public}
                onChange={() =>
                  setCurrentItem({
                    ...currentItem,
                    public: !currentItem.public,
                  })
                }
                className="col-span-3 place-self-start"
              />
            </div>
            <div className="flex flex-row justify-between mt-5">
              <Button
                type="button"
                variant="destructive"
                onClick={() => void deleteItem()}
              >
                Delete Item
              </Button>
              <Button type="submit" className=" max-w-fit place-self-end">
                Save change
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {canEditWishlist && userId && addItem()}
      {isEditing && EditDialog()}
      {isFetching ? cardsSkeleton : cards}
    </div>
  );
}
