import { WishlistItem } from "@/lib/types";
import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Switch } from "./switch";

export const ItemDialog: FC<{
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
  dialogOpen, setDialogOpen, currentItem, handleItemChange, handleAction, handleDelete, isSubmitting, dialogTitle, actionLabel,
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
            handleItemChange={handleItemChange} />
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
        className="col-span-3" />
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
        className="col-span-3" />
    </div>
    <div className="grid grid-cols-4 items-center gap-4 h-10">
      <Label htmlFor="link" className="text-right">
        Link
      </Label>
      <Input
        id="link"
        value={currentItem.link}
        onChange={(e) => handleItemChange({ link: e.target.value })}
        className="col-span-3" />
    </div>
    <div className="grid grid-cols-4 items-center gap-4 h-10">
      <Label htmlFor="itemPublic" className="text-right">
        Public
      </Label>
      <Switch
        id="itemPublic"
        checked={currentItem.public}
        onCheckedChange={() => handleItemChange({ public: !currentItem.public })} />
    </div>
  </>
);
