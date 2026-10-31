import { FC } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wishlist } from "@/lib/types";

interface RenameFollowDialogProps {
  wishlist: Wishlist | null;
  isSubmitting: boolean;
  onSave: (wishlist: Wishlist, customName: string) => void;
  onClose: () => void;
}

interface RenameForm {
  customName: string;
}

export const RenameFollowDialog: FC<RenameFollowDialogProps> = ({
  wishlist,
  isSubmitting,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const { register, handleSubmit } = useForm<RenameForm>({
    values: { customName: wishlist?.customName ?? wishlist?.name ?? "" },
  });

  return (
    <Dialog
      open={wishlist !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rename.title")}</DialogTitle>
          <DialogDescription>
            {wishlist
              ? t("rename.descriptionWithName", { name: wishlist.name })
              : t("rename.description")}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5 pt-2"
          onSubmit={(event) => {
            void handleSubmit((data) => {
              if (wishlist) onSave(wishlist, data.customName.trim());
            })(event);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="customName">{t("rename.label")}</Label>
            <Input
              id="customName"
              {...register("customName")}
              placeholder={wishlist?.name}
              maxLength={100}
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {t("rename.save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
