"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, Sparkles, TriangleAlert, X } from "lucide-react";
import { CountryPicker } from "@/components/demo/CountryPicker";
import { DEMO_PACKAGES, findPackage } from "@/lib/demo/packages";
import type { DemoPackageId } from "@/lib/demo/types";
import { detectCountry, formatPhone, normalizePhone } from "@/lib/whatsapp/phone";

/** Loose on purpose: the shape is worth catching, the rest is the mail server's
 * job. The same check runs again on the server. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface DemoSetupFormProps {
  busy: boolean;
  error: string | null;
  /** The credentials will never appear on screen, so a wrong number costs
   * the visitor the whole demo. Only warn when that is actually true. */
  deliveryOnly: boolean;
  onSubmit(input: {
    name: string;
    email: string;
    packageId: DemoPackageId;
    countryIso: string;
    phone: string;
    consent: true;
  }): Promise<void>;
}

export function DemoSetupForm({
  busy,
  error,
  deliveryOnly,
  onSubmit,
}: DemoSetupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryIso, setCountryIso] = useState("US");
  const [phone, setPhone] = useState("");
  const [packageId, setPackageId] = useState<DemoPackageId | null>(null);
  const [consent, setConsent] = useState(false);

  const normalized = useMemo(
    () => normalizePhone(countryIso, phone),
    [countryIso, phone],
  );
  const chosen = packageId === null ? null : findPackage(packageId);

  // A Dominican who picked Puerto Rico gets their flag corrected instead of an
  // argument: the number itself says which territory it belongs to.
  useEffect(() => {
    const belongs = detectCountry(countryIso, phone);
    if (belongs) setCountryIso(belongs);
  }, [countryIso, phone]);
  const emailValid = EMAIL_PATTERN.test(email.trim());
  const ready =
    name.trim().length >= 2 &&
    emailValid &&
    Boolean(normalized) &&
    packageId !== null &&
    consent;

  return (
    <form
      className="ca-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (packageId && normalized && consent && emailValid) {
          void onSubmit({
            name: name.trim(),
            email: email.trim(),
            packageId,
            countryIso,
            phone,
            consent: true,
          });
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
        <label htmlFor="visitor-email">Correo electrónico</label>
        <input
          id="visitor-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tucorreo@ejemplo.com"
          maxLength={160}
          autoComplete="email"
          disabled={busy}
          required
        />
        <small className="ca-hint">
          Lo usamos para avisarte de novedades y promociones. La demo llega
          igual por WhatsApp.
        </small>
      </div>

      <div className="ca-field">
        <label htmlFor="visitor-phone">WhatsApp</label>
        <div className="ca-phone-row">
          <CountryPicker
            value={countryIso}
            disabled={busy}
            onChange={setCountryIso}
          />
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
              Enviaremos tu acceso a <b>{formatPhone(normalized)}</b>
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

      <div className="ca-consent">
        <input
          id="visitor-consent"
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          disabled={busy}
          required
        />
        <label htmlFor="visitor-consent">
          Acepto que Nodo 7 OTT guarde mi nombre, WhatsApp y correo para
          contactarme sobre el servicio.
        </label>
      </div>

      <p className="ca-footnote">
        <RotateCcw aria-hidden="true" size={15} />
        Recargar la página no reinicia el reloj ni te devuelve el pase.
      </p>

      {error ? <p className="ca-error" role="alert">{error}</p> : null}

      <button
        className="ca-button ca-button-primary"
        type="submit"
        disabled={busy || !ready}
      >
        <span>{busy ? "Generando…" : "Generar mi demo"}</span>
        <Sparkles aria-hidden="true" size={19} />
      </button>
    </form>
  );
}
