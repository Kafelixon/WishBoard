import { Wishlist } from "@/lib/types";
import { FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon, { WishlistIconBadge } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  WISHLIST_ICON_COLORS,
  isHexColor,
  toWishlistIconColor,
  wishlistIcons,
  type WishlistIconName,
} from "@/lib/wishlistIcons";
import { cn } from "@/lib/utils";

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

interface WishlistForm {
  name: string;
}

const wishlistSchema = yup.object().shape({
  name: yup.string().required("Give your wishlist a name"),
});

const iconNames = Object.keys(wishlistIcons) as WishlistIconName[];

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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WishlistForm>({
    values: wishlist,
    resolver: yupResolver(wishlistSchema),
  });

  // Text being typed in the hex field; null shows the wishlist's current color.
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const hexValue = hexDraft ?? wishlist.iconColor ?? "";
  const hexInvalid = hexValue !== "" && !isHexColor(hexValue);

  return (
    <Dialog open={isOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Name it and pick an icon. You can change both later.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5 pt-2"
          onSubmit={handleSubmit((data) => {
            const newWishlist = { ...wishlist, ...data };
            handleAction(newWishlist);
            setDialogOpen(false);
          })}
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register("name")}
              onChange={(e) => {
                handleItemChange({ name: e.target.value });
              }}
              placeholder="Birthday 2026"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" role="alert" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3" aria-hidden="true">
            <WishlistIconBadge name={wishlist.icon} color={wishlist.iconColor} />
            <span className="truncate font-display text-lg font-semibold">
              {wishlist.name || "Preview"}
            </span>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Icon</legend>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
              {iconNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-label={name.replace("-", " ")}
                  aria-pressed={wishlist.icon === name}
                  onClick={() => {
                    handleItemChange({ icon: name });
                  }}
                  className={cn(
                    "flex aspect-square cursor-pointer items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    wishlist.icon === name
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary",
                  )}
                >
                  <Icon name={name} className="size-5" aria-hidden="true" />
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-medium">Icon color</legend>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Default color"
                aria-pressed={!wishlist.iconColor}
                onClick={() => {
                  setHexDraft(null);
                  handleItemChange({ iconColor: undefined });
                }}
                className={cn(
                  "size-8 cursor-pointer rounded-full border-2 bg-primary transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !wishlist.iconColor ? "border-foreground" : "border-transparent",
                )}
              />
              {WISHLIST_ICON_COLORS.map(({ name, value }) => (
                <button
                  key={value}
                  type="button"
                  aria-label={name}
                  aria-pressed={wishlist.iconColor === value}
                  onClick={() => {
                    setHexDraft(null);
                    handleItemChange({ iconColor: value });
                  }}
                  style={{ backgroundColor: value }}
                  className={cn(
                    "size-8 cursor-pointer rounded-full border-2 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    wishlist.iconColor === value ? "border-foreground" : "border-transparent",
                  )}
                />
              ))}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="icon-color">Custom hex code</Label>
              <Input
                id="icon-color"
                value={hexValue}
                placeholder="#2563eb"
                maxLength={7}
                autoComplete="off"
                spellCheck={false}
                className="max-w-40 font-mono"
                aria-invalid={hexInvalid ? true : undefined}
                aria-describedby={hexInvalid ? "icon-color-error" : undefined}
                onChange={(e) => {
                  const text = e.target.value.trim();
                  setHexDraft(text);
                  if (text === "") handleItemChange({ iconColor: undefined });
                  else if (isHexColor(text))
                    handleItemChange({ iconColor: toWishlistIconColor(text) });
                }}
                onBlur={() => {
                  setHexDraft(null);
                }}
              />
              {hexInvalid && (
                <p id="icon-color-error" role="alert" className="text-sm text-destructive">
                  Use a hex code like #2563eb.
                </p>
              )}
            </div>
          </fieldset>
          <div
            className={`flex flex-row items-center ${
              actionType === "Add" ? "justify-end" : "justify-between"
            } pt-2`}
          >
            {actionType === "Update" && handleDelete && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this wishlist and all of its items? This cannot be undone.",
                    )
                  ) {
                    handleDelete();
                    setDialogOpen(false);
                  }
                }}
              >
                Delete wishlist
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="animate-spin" aria-label="Saving" />
              ) : actionType === "Add" ? (
                "Create wishlist"
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
