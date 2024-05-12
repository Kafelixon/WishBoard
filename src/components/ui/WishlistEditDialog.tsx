import { Wishlist } from "@/lib/types";
import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface WishlistDialogProps {
  wishlist: Wishlist;
  isOpen: boolean;
  isSubmitting: boolean;
  actionType: "Add" | "Update";
  dialogTitle: string;
  handleAction: (wishlist: Wishlist) => void;
  setDialogOpen: (open: boolean) => void;
  handleDelete?: () => void;
  handleItemChange: (changes: Partial<Wishlist>) => void;
}

export const WishlistEditDialog: FC<WishlistDialogProps> = ({
  wishlist,
  isOpen,
  isSubmitting,
  actionType,
  dialogTitle,
  handleAction,
  setDialogOpen,
  handleDelete,
  handleItemChange,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleAction(wishlist);
            setDialogOpen(false);
          }}
        >
          <Input
            id="name"
            value={wishlist.name}
            placeholder="Wishtlist Name"
            onChange={(e) => {
              handleItemChange({ name: e.target.value });
            }}
          />
          <div
            className={`flex flex-row ${
              actionType === "Add" ? "justify-end" : "justify-between"
            } mt-4`}
          >
            {actionType === "Update" && handleDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  handleDelete();
                  setDialogOpen(false);
                }}
              >
                Delete Item
              </Button>
            )}
            <Button type="submit" className="max-w-fit place-self-end">
              {isSubmitting ? (
                <Loader2 className="mx-2 h-4 w-4 animate-spin" />
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
