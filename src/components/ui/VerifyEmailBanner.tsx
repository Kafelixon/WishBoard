import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebaseSetup";
import {
  authErrorMessage,
  getAuthErrorCode,
  refreshEmailVerified,
  resendCooldownSeconds,
  resendVerificationEmail,
} from "@/lib/authHandlers";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

/** Firebase errors get their translated text; our own errors (no code) already carry theirs. */
const errorText = (error: unknown) =>
  getAuthErrorCode(error) === undefined && error instanceof Error
    ? error.message
    : authErrorMessage(error);

/**
 * Shown to signed-in email/password accounts that haven't confirmed their address.
 * Unverified accounts are not restricted: this only nudges, and Google accounts arrive verified.
 */
export function VerifyEmailBanner() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [uid, setUid] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      onAuthStateChanged(auth, (firebaseUser) => {
        setUid(firebaseUser && !firebaseUser.emailVerified ? firebaseUser.uid : null);
        setBusy(false);
      }),
    [],
  );

  // The cooldown lives in authHandlers (registration starts it too), so follow it rather than count down here.
  useEffect(() => {
    if (uid === null) return;
    const sync = () => {
      setCooldown(resendCooldownSeconds(uid));
    };
    sync();
    const timer = setInterval(sync, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [uid]);

  if (uid === null) return null;

  const resend = async () => {
    setBusy(true);
    try {
      await resendVerificationEmail();
      toast({ title: t("verifyEmail.sent") });
    } catch (error) {
      console.error(error);
      toast({ title: errorText(error) });
    } finally {
      setCooldown(resendCooldownSeconds(uid));
      setBusy(false);
    }
  };

  const check = async () => {
    setBusy(true);
    try {
      if (await refreshEmailVerified()) setUid(null);
      else toast({ title: t("verifyEmail.stillUnverified") });
    } catch (error) {
      console.error(error);
      toast({ title: errorText(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b border-border/70 bg-secondary">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm sm:px-5">
        <p className="flex-1">{t("verifyEmail.message")}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy || cooldown > 0}
            onClick={() => void resend()}
          >
            {cooldown > 0 ? t("verifyEmail.resendIn", { count: cooldown }) : t("verifyEmail.resend")}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void check()}>
            {t("verifyEmail.check")}
          </Button>
        </div>
      </div>
    </div>
  );
}
