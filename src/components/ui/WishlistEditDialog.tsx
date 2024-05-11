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
  action: "Add" | "Update";
  setDialogOpen: (open: boolean) => void;
  handleAction: () => void;
  handleDelete?: () => void;
  onUpdate: (wishlist: Wishlist) => void;
}

export const WishlistEditDialog: FC<WishlistDialogProps> = ({
  wishlist,
  isOpen,
  isSubmitting,
  action,
  setDialogOpen,
  handleAction,
  handleDelete,
  onUpdate,
}) => {
  const handleUpdate = (key: string, value: string) => {
    onUpdate({ ...wishlist, [key]: value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === "Add"
              ? "Add a new wishlist"
              : "Update your " + wishlist.name + " wishlist"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            console.log("submitting");
            handleAction();
            setDialogOpen(false);
          }}
        >
          <Input
            id="name"
            value={wishlist.name}
            placeholder="Wishtlist Name"
            onChange={(e) => handleUpdate("name", e.target.value)}
          />
          <div
            className={`flex flex-row ${
              action === "Update" ? "justify-end" : "justify-between"
            } mt-4`}
          >
            {action === "Update" && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
              >
                Delete Item
              </Button>
            )}
            <Button type="submit" className="max-w-fit place-self-end">
              {isSubmitting ? (
                <Loader2 className="mx-2 h-4 w-4 animate-spin" />
              ) : (
                action
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
