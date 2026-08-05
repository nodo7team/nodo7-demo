"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw, Sparkles, TriangleAlert, X } from "lucide-react";
import { DEMO_PACKAGES, findPackage } from "@/lib/demo/packages";
import type { DemoPackageId } from "@/lib/demo/types";
import { COUNTRY_CODES, findCountry, normalizePhone } from "@/lib/whatsapp/phone";

interface DemoSetupFormProps {
  busy: boolean;
  error: string | null;
  /** The credentials will never appear on screen, so a wrong number costs
   * the visitor the whole demo. Only warn when that is actually true. */
  deliveryOnly: boolean;
  onSubmit(input: {
    name: string;
    packageId: DemoPackageId;
    countryIso: string;
    phone: string;
  }): Promise<void>;
}

export function DemoSetupForm({
  busy,
  error,
  deliveryOnly,
  onSubmit,
}: DemoSetupFormProps) {
  const [name, setName] = useState("");
  const [countryIso, setCountryIso] = useState("US");
  const [phone, setPhone] = useState("");
  const [packageId, setPackageId] = useState<DemoPackageId | null>(null);

  const dial = findCountry(countryIso)?.dial ?? "1";
  const normalized = useMemo(() => normalizePhone(dial, phone), [dial, phone]);
  const chosen = packageId === null ? null : findPackage(packageId);

  return (
    <form
      className="ca-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (packageId && normalized) {
          void onSubmit({ name: name.trim(), packageId, countryIso, phone });
        }
      }}
    >
      {deliveryOnly ? (
        <p className="ca-alert ca-alert-danger" role="note">
          <TriangleAlert aria-hidden="true" size={22} />
          <span>
            <strong>Solo por WhatsApp: revisa bien tu número.</strong>
            Tu usuario y contraseña —o tu código de activación— no se muestran
            en esta pantalla. Si el número está mal, el pase se gasta igual y
            no hay forma de recuperarlo.
          </span>
        </p>
      ) : null}

      <div className="ca-field">
        <label htmlFor="visitor-name">Nombre</label>
        <input
          id="visitor-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="¿Cómo te llamas?"
          minLength={2}
          maxLength={80}
          autoComplete="name"
          disabled={busy}
          required
        />
      </div>

      <div className="ca-field">
        <label htmlFor="visitor-phone">WhatsApp</label>
        <div className="ca-phone-row">
          <select
            aria-label="País"
            value={countryIso}
            onChange={(event) => setCountryIso(event.target.value)}
            disabled={busy}
          >
            {/* No flag emoji: Windows renders the pair as bare letters. */}
            {COUNTRY_CODES.map((country) => (
              <option key={country.iso} value={country.iso}>
                +{country.dial} · {country.name}
              </option>
            ))}
          </select>
          <input
            id="visitor-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Tu número, sin el código de país"
            inputMode="tel"
            autoComplete="tel-national"
            disabled={busy}
            required
          />
        </div>
        <small className="ca-phone-echo" data-confirmed={Boolean(normalized)}>
          {normalized ? (
            <>
              <Check aria-hidden="true" size={15} />
              Enviaremos tu acceso a <b>+{dial} {normalized.slice(dial.length)}</b>
            </>
          ) : (
            "Elige tu país y escribe el número tal como lo usas en WhatsApp."
          )}
        </small>
      </div>

      <fieldset className="ca-plans" disabled={busy}>
        <legend>Elige tu demo</legend>
        <div className="ca-plan-grid">
          {DEMO_PACKAGES.map((item) => {
            const limited = item.excludes.length > 0;
            return (
              <div
                className={`ca-plan ${limited ? "ca-plan-lite" : "ca-plan-full"}`}
                data-selected={packageId === item.id}
                key={item.id}
              >
                <input
                  type="radio"
                  id={`plan-${item.id}`}
                  name="packageId"
                  value={item.id}
                  checked={packageId === item.id}
                  onChange={() => setPackageId(item.id)}
                  aria-describedby={`plan-${item.id}-detail`}
                />
                <label htmlFor={`plan-${item.id}`}>
                  <span className="ca-plan-tag">{item.badge}</span>
                  <span className="ca-plan-name">{item.name}</span>
                  <span className="ca-plan-sub">
                    {item.duration} · {item.tagline}
                  </span>
                </label>
                <ul id={`plan-${item.id}-detail`}>
                  {item.includes.map((line) => (
                    <li data-in="true" key={line}>
                      <Check aria-hidden="true" size={14} strokeWidth={3} />
                      <span>{line}</span>
                    </li>
                  ))}
                  {item.excludes.map((line) => (
                    <li data-in="false" key={line}>
                      <X aria-hidden="true" size={14} strokeWidth={3} />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </fieldset>

      {chosen && chosen.excludes.length > 0 ? (
        <p className="ca-alert ca-alert-loud" role="alert">
          <TriangleAlert aria-hidden="true" size={22} />
          <span>
            <strong>Elegiste {chosen.name}: no vas a ver deportes.</strong>
            Esta demo no incluye fútbol en vivo, eventos deportivos, PPV ni
            packs premium. Si querías probar justo eso, cambia a{" "}
            <b>1 hora FULL</b>.
          </span>
        </p>
      ) : null}

      {chosen && chosen.excludes.length === 0 ? (
        <p className="ca-alert ca-alert-good" role="status">
          <Check aria-hidden="true" size={22} />
          <span>
            <strong>Vas a ver todo.</strong>
            Fútbol en vivo, eventos deportivos, PPV y packs premium entran en
            esta demo. Dura 60 minutos desde que la actives.
          </span>
        </p>
      ) : null}

      <p className="ca-footnote">
        <RotateCcw aria-hidden="true" size={15} />
        Recargar la página no reinicia el reloj ni te devuelve el pase.
      </p>

      {error ? <p className="ca-error" role="alert">{error}</p> : null}

      <button
        className="ca-button ca-button-primary"
        type="submit"
        disabled={busy || name.trim().length < 2 || packageId === null || !normalized}
      >
        <span>{busy ? "Generando…" : "Generar mi demo"}</span>
        <Sparkles aria-hidden="true" size={19} />
      </button>
    </form>
  );
}
