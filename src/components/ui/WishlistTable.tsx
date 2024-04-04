import { WishlistItem } from "@/lib/types";
import { useEffect, useState } from "react";
import {
  addItemToWishlist,
  fetchItemsFromWishlist,
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
import { Loader2 } from "lucide-react";

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
  const [productName, setProductName] = useState("");
  const [averagePrice, setAveragePrice] = useState("");
  const [image, setImage] = useState("");
  const [itemPublic, setPublic] = useState(true);
  const [link, setLink] = useState("");
  const [userWishlist, setUserWishlist] = useState<WishlistItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (wishlistId) {
      setIsFetching(true);
      void fetchItemsFromWishlist( wishlistId, userId )
        .then((data) => { 
          if (data) {
            setUserWishlist(data);
          }
        }).finally(() => setIsFetching(false));
    }
  }, [userId, wishlistId]);

  const cards = userWishlist
    ? [...userWishlist]
        .sort(
          (a, b) =>
            parseFloat(a.price.replace("~", "")) -
            parseFloat(b.price.replace("~", ""))
        )
        .map((item, index) => (
          <div
            key={index}
            className={`flex gap-2.5 items-center border pl-2.5 pr-5 py-2.5 rounded-lg border-solid border-gray-300 ${
              item.public === false ? "bg-gray-200" : "glass-fg"
            }`}
          >
            <img
              src={item.image}
              alt="Product Image"
              className="size-28 object-contain bg-white border border-gray-300 rounded-lg"
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
        ))
    : [];

  const addListing = async () => {
    if (!userId || !wishlistId) {
      console.error("User ID or Wishlist ID is missing");
      return;
    }

    setProductName("");
    setAveragePrice("");
    setLink("");
    setImage("https://via.placeholder.com/150"); //TODO: Change default image
    setPublic(true);

    try {
      setIsAdding(true);
      await addItemToWishlist(userId, wishlistId, {
        name: productName.trim(),
        price: averagePrice,
        link: link,
        image: image,
        public: itemPublic,
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
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
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
                value={averagePrice}
                onChange={(e) => setAveragePrice(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link" className="text-right">
                Link
              </Label>
              <Input
                id="link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
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
                checked={itemPublic}
                onChange={(e) => setPublic(e.target.checked)}
                className="col-span-3 place-self-start"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="submit" color="primary" onClick={() => void addListing()}>
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

  return (
    <div className="flex flex-col gap-2.5">
      {canEditWishlist && userId && addItem()}
      {isFetching ? "Loading..." : cards}
    </div>
  );
}
