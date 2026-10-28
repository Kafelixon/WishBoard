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
import { isValidWebUrl } from "@/lib/url";

interface ItemDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  currentItem: WishlistItem;
  handleItemChange: (changes: Partial<WishlistItem>) => void;
  handleAction: (data: WishlistItem) => void;
  handleDelete?: () => void;
  isSubmitting: boolean;
  dialogTitle: string;
  dialogDescription: string;
  actionLabel: string;
}

type ItemSchema = Omit<WishlistItem, "id">;

const schema: yup.ObjectSchema<ItemSchema> = yup.object({
  name: yup.string().required("Product Name is required"),
  image: yup
    .string()
    .defined()
    .test("web-url", "Enter a valid web address", isValidWebUrl),
  price: yup
    .number()
    .transform((value, originalValue) => (originalValue === "" ? 0 : (value as number)))
    .typeError("Price must be a number")
    .min(0, "Price can't be negative")
    .required(),
  link: yup
    .string()
    .defined()
    .test("web-url", "Enter a valid web address", isValidWebUrl),
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
  dialogDescription,
  actionLabel,
}) => {
  const methods = useForm<ItemSchema>({
    values: currentItem,
    resolver: yupResolver(schema),
  });

  const onSubmit = (data: ItemSchema) => {
    const wishlistItem = { id: currentItem.id, ...data };
    handleAction(wishlistItem);
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
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
