"use client";

import { useMemo, useState } from "react";
import { Clock3, Film, Radio, Sparkles } from "lucide-react";
import type { DemoPackageId } from "@/lib/demo/types";
import {
  COUNTRY_CODES,
  countryFlag,
  findCountry,
  normalizePhone,
} from "@/lib/whatsapp/phone";

interface DemoSetupFormProps {
  busy: boolean;
  error: string | null;
  onSubmit(input: {
    name: string;
    packageId: DemoPackageId;
    countryIso: string;
    phone: string;
  }): Promise<void>;
}

const PACKAGES = [
  { id: 7 as const, name: "1 hora FULL", detail: "Señal completa y eventos disponibles.", icon: Radio },
  { id: 6 as const, name: "4 horas", detail: "Más tiempo para explorar series y películas.", icon: Film },
];

export function DemoSetupForm({ busy, error, onSubmit }: DemoSetupFormProps) {
  const [name, setName] = useState("");
  const [countryIso, setCountryIso] = useState("US");
  const [phone, setPhone] = useState("");
  const [packageId, setPackageId] = useState<DemoPackageId | null>(null);

  const dial = findCountry(countryIso)?.dial ?? "1";
  const normalized = useMemo(
    () => normalizePhone(dial, phone),
    [dial, phone],
  );

  return (
    <form
      className="n7-form n7-setup-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (packageId && normalized) {
          void onSubmit({ name: name.trim(), packageId, countryIso, phone });
        }
      }}
    >
      <div className="n7-field">
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

      <div className="n7-field">
        <label htmlFor="visitor-phone">WhatsApp</label>
        <div className="n7-phone-row">
          <select
            aria-label="País"
            value={countryIso}
            onChange={(event) => setCountryIso(event.target.value)}
            disabled={busy}
          >
            {COUNTRY_CODES.map((country) => (
              <option key={country.iso} value={country.iso}>
                {countryFlag(country.iso)} +{country.dial} · {country.name}
              </option>
            ))}
          </select>
          <input
            id="visitor-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Tu número"
            inputMode="tel"
            autoComplete="tel-national"
            disabled={busy}
            required
          />
        </div>
        <small className="n7-phone-preview">
          {normalized
            ? `Te enviaremos las credenciales a +${dial} ${normalized.slice(dial.length)}`
            : "Escribe tu número sin el código de país."}
        </small>
      </div>

      <fieldset className="n7-package-fieldset" disabled={busy}>
        <legend>Elige tu demo</legend>
        <div className="n7-package-grid">
          {PACKAGES.map((item) => {
            const Icon = item.icon;
            return (
              <label className="n7-package-option" data-selected={packageId === item.id} key={item.id}>
                <input
                  type="radio"
                  name="packageId"
                  value={item.id}
                  checked={packageId === item.id}
                  onChange={() => setPackageId(item.id)}
                />
                <span className="n7-package-icon"><Icon aria-hidden="true" size={20} /></span>
                <strong>{item.name}</strong>
                <small>{item.detail}</small>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="n7-deadline-note">
        <Clock3 aria-hidden="true" size={17} />
        <span>Recargar la página no reinicia el tiempo.</span>
      </div>
      {error ? <p className="n7-error" role="alert">{error}</p> : null}
      <button
        className="n7-primary-button"
        type="submit"
        disabled={busy || name.trim().length < 2 || packageId === null || !normalized}
      >
        <span>{busy ? "Generando…" : "Generar mi demo"}</span>
        <Sparkles aria-hidden="true" size={19} />
      </button>
    </form>
  );
}
