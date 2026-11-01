import { FC, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useTranslation } from "react-i18next";
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
import { ConfirmDialog } from "./ConfirmDialog";
import { ItemFormFields } from "./ItemFormFields";
import { isValidWebUrl } from "@/lib/url";
import { MAX_NOTES_LENGTH, MAX_PRICE, MAX_QUANTITY } from "@/lib/limits";
import i18n from "@/i18n";

interface ItemDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  currentItem: WishlistItem;
  handleItemChange: (changes: Partial<WishlistItem>) => void;
  /** Resolves with whether the save worked; the dialog closes only then. */
  handleAction: (data: WishlistItem) => Promise<boolean>;
  handleDelete?: () => void;
  isSubmitting: boolean;
  dialogTitle: string;
  dialogDescription: string;
  actionLabel: string;
}

type ItemSchema = Omit<WishlistItem, "id" | "reservation" | "reservedUntil" | "createdAt">;

const schema: yup.ObjectSchema<ItemSchema> = yup.object({
  name: yup.string().required(() => i18n.t("validation.itemName")),
  image: yup
    .string()
    .defined()
    .test("web-url", () => i18n.t("validation.webUrl"), isValidWebUrl),
  price: yup
    .number()
    .transform((value, originalValue) => (originalValue === "" ? 0 : (value as number)))
    .typeError(() => i18n.t("validation.priceNumber"))
    .min(0, () => i18n.t("validation.priceNegative"))
    .max(MAX_PRICE, () => i18n.t("validation.priceTooHigh", { max: MAX_PRICE }))
    .required(),
  currency: yup.string(),
  link: yup
    .string()
    .defined()
    .test("web-url", () => i18n.t("validation.webUrl"), isValidWebUrl),
  public: yup.boolean(),
  notes: yup.string().max(MAX_NOTES_LENGTH, () => i18n.t("validation.notesLength")),
  quantity: yup
    .number()
    .transform((value, originalValue) =>
      originalValue === "" || Number.isNaN(originalValue) ? 1 : (value as number),
    )
    .typeError(() => i18n.t("validation.quantity"))
    .integer(() => i18n.t("validation.quantity"))
    .min(1, () => i18n.t("validation.quantity"))
    .max(MAX_QUANTITY, () => i18n.t("validation.quantity")),
  mostWanted: yup.boolean(),
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
  const { t } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const methods = useForm<ItemSchema>({
    values: currentItem,
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: ItemSchema) => {
    // Kept open on failure, so what was typed isn't lost.
    if (await handleAction({ id: currentItem.id, ...data })) setDialogOpen(false);
  };

  return (
    <>
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
            className="grid gap-5 pt-2"
            onSubmit={methods.handleSubmit(onSubmit)}
          >
            <ItemFormFields
              handleItemChange={handleItemChange}
              currentItem={currentItem}
            />
            <div
              className={`flex flex-row items-center ${!handleDelete ? "justify-end" : "justify-between"} pt-2`}
            >
              {handleDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => { setConfirmDelete(true); }}
                >
                  {t("itemForm.delete")}
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="animate-spin" aria-label={t("common.saving")} />
                ) : (
                  actionLabel
                )}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={confirmDelete}
      onOpenChange={setConfirmDelete}
      title={t("itemForm.delete")}
      description={t("itemForm.deleteConfirm")}
      confirmLabel={t("itemForm.delete")}
      onConfirm={() => { handleDelete?.(); }}
    />
    </>
  );
};
