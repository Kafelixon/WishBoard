import {
  useCallback,
  useRef,
  useState,
  type SyntheticEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Replaces `window.prompt` for re-authentication. `askPassword()` resolves
 * with the entered password, or null when the dialog is dismissed; render
 * `passwordDialog` once in the calling component.
 */
export function usePasswordPrompt(): {
  askPassword: () => Promise<string | null>;
  passwordDialog: ReactNode;
} {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const resolverRef = useRef<((value: string | null) => void) | null>(null);

  const finish = useCallback((value: string | null) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
    setPassword("");
  }, []);

  const askPassword = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        resolverRef.current?.(null);
        resolverRef.current = resolve;
        setOpen(true);
      }),
    [],
  );

  const onSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    if (password) finish(password);
  };

  const passwordDialog = (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) finish(null);
      }}
    >
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t("settings.reauth.title")}</DialogTitle>
            <DialogDescription>{t("settings.reauth.prompt")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="reauth-password">
              {t("settings.reauth.passwordLabel")}
            </Label>
            <Input
              id="reauth-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                finish(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!password}>
              {t("common.continue")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return { askPassword, passwordDialog };
}
