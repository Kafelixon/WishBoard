import { FC } from "react";
import { WishlistItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { ItemFormFields } from "./ItemFormFields";

interface ItemDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  currentItem: WishlistItem;
  handleItemChange: (changes: Partial<WishlistItem>) => void;
  handleAction: () => void;
  handleDelete?: () => void;
  isSubmitting: boolean;
  dialogTitle: string;
  actionLabel: string;
}

export const ItemDialog: FC<ItemDialogProps> = ({
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
        <div
          className={`flex flex-row ${!handleDelete ? "justify-end" : "justify-between"} mt-4`}
        >
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
