import { FC } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
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
  handleAction: (data: WishlistItem) => void;
  handleDelete?: () => void;
  isSubmitting: boolean;
  dialogTitle: string;
  actionLabel: string;
}

type ItemSchema = {
  name: string;
  image?: string | undefined;
  price: number;
  link?: string | undefined;
  public?: boolean | undefined;
};

const schema = yup.object().shape({
  name: yup.string().required("Product Name is required"),
  image: yup.string(),
  price: yup
    .number()
    .positive("Price must be positive")
    .required("Average Price is required"),
  link: yup.string(),
  public: yup.boolean(),
});

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
}) => {
  const methods = useForm<ItemSchema>({
    values: currentItem,
    resolver: yupResolver(schema),
  });

  const onSubmit = (data: ItemSchema) => {
    const wishlistItem = { id: currentItem.id, ...data } as WishlistItem;
    handleAction(wishlistItem);
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Add a new item to your wishlist. Click add when you're done.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            className="grid gap-4 pt-4"
            onSubmit={methods.handleSubmit(onSubmit)}
          >
            <ItemFormFields
              handleItemChange={handleItemChange}
              currentItem={currentItem}
            />
            <div
              className={`flex flex-row ${!handleDelete ? "justify-end" : "justify-between"} mt-4`}
            >
              {handleDelete && (
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
                  actionLabel
                )}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
