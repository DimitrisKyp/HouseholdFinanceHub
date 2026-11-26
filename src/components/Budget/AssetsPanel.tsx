"use client";

// What the household owns (bank, crypto, stocks, property): the add form and the list, where each
// value can be updated or the item deleted. Values and the total arrive formatted from the server.
import { useActionState } from "react";
import Badge from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import TextField, { FormError, FormSuccess, InlineMessage, SelectField } from "@/components/ui/Field";
import { useTranslations } from "@/i18n/client";
import { addAssetAction, deleteAssetAction, updateAssetValueAction } from "@/lib/actions/budget";
import { ASSET_KINDS } from "@/lib/calculations";
import type { listAssets } from "@/lib/finance";

/** An asset as the Finances page passes it: a row from listAssets plus its formatted value. */
export type AssetListItem = Awaited<ReturnType<typeof listAssets>>[number] & { valueLabel: string };

type AssetsPanelProps = {
  assets: AssetListItem[];
  /** The net worth, formatted. */
  totalLabel: string;
  canEdit: boolean;
};

const smallButton =
  "rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:text-white disabled:opacity-60";

function AddAssetForm() {
  const [state, formAction, pending] = useActionState(addAssetAction, {});
  const values = state.values ?? {};
  const t = useTranslations("budget");

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_10rem_9rem_auto] sm:items-start" noValidate>
      <div className="space-y-3 sm:col-span-4">
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
      </div>
      <TextField
        id="asset-name"
        name="name"
        label={t("assets.name")}
        placeholder={t("assets.namePlaceholder")}
        maxLength={120}
        defaultValue={values.name}
        error={state.errors?.name}
      />
      <SelectField
        key={`kind-${values.kind}`}
        id="asset-kind"
        name="kind"
        label={t("assets.kind")}
        defaultValue={values.kind ?? "bank"}
        error={state.errors?.kind}
      >
        {ASSET_KINDS.map(kind => (
          <option key={kind} value={kind}>
            {t(`assets.kinds.${kind}`)}
          </option>
        ))}
      </SelectField>
      <TextField
        id="asset-value"
        name="value"
        label={t("assets.value")}
        inputMode="decimal"
        placeholder={t("assets.valuePlaceholder")}
        defaultValue={values.value}
        error={state.errors?.value}
      />
      <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary", size: "md", className: "sm:mt-6" })}>
        {pending ? t("assets.adding") : t("assets.add")}
      </button>
    </form>
  );
}

function AssetRow({ item, canEdit }: { item: AssetListItem; canEdit: boolean }) {
  const [valueState, valueAction, valuePending] = useActionState(updateAssetValueAction, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAssetAction, {});
  const t = useTranslations("budget");
  const message = valueState.error || valueState.success ? valueState : deleteState.error ? deleteState : null;

  return (
    <li className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{item.name}</p>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <Badge>{t(`assets.kinds.${item.kind}`)}</Badge>
            <span className="font-semibold text-emerald-300">{item.valueLabel}</span>
          </p>
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2">
            <form action={valueAction} className="flex items-center gap-2">
              <input type="hidden" name="assetId" value={item.id} />
              <label className="sr-only" htmlFor={`asset-value-${item.id}`}>
                {t("assets.valueFor", { name: item.name })}
              </label>
              <input
                id={`asset-value-${item.id}`}
                name="value"
                inputMode="decimal"
                defaultValue={item.value}
                className="w-28 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
              />
              <button type="submit" disabled={valuePending} className={`${smallButton} hover:border-cyan-400/50`}>
                {valuePending ? "…" : t("assets.save")}
              </button>
            </form>
            <form
              action={deleteAction}
              onSubmit={event => {
                if (!window.confirm(t("assets.confirmDelete", { name: item.name }))) event.preventDefault();
              }}
            >
              <input type="hidden" name="assetId" value={item.id} />
              <button
                type="submit"
                disabled={deletePending}
                aria-label={t("assets.deleteFor", { name: item.name })}
                className={`${smallButton} hover:border-rose-400/50 hover:text-rose-200`}
              >
                {deletePending ? "…" : t("assets.delete")}
              </button>
            </form>
          </div>
        ) : null}
      </div>
      <InlineMessage state={message} />
    </li>
  );
}

export default function AssetsPanel({ assets, totalLabel, canEdit }: AssetsPanelProps) {
  const t = useTranslations("budget");
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
        <p className="text-sm text-slate-300">{t("netWorth")}</p>
        <p className="text-xl font-semibold text-emerald-300">{totalLabel}</p>
      </div>
      {canEdit ? <AddAssetForm /> : null}
      {assets.length ? (
        <ul aria-label={t("assets.title")} className="space-y-2">
          {assets.map(item => (
            <AssetRow key={item.id} item={item} canEdit={canEdit} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">{t("assets.empty")}</p>
      )}
    </div>
  );
}
