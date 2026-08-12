"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  COUNTRY_CODES,
  findCountry,
  matchesCountry,
  type Country,
} from "@/lib/whatsapp/phone";

/** Two territories ship no flag; they fall back to their code. */
function Flag({ iso, name }: { iso: string; name: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <b className="ca-flag-fallback">{iso}</b>;
  return (
    <img
      className="ca-flag"
      src={`/flags/${iso.toLowerCase()}.webp`}
      alt={name}
      width={24}
      height={18}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
    />
  );
}

interface CountryPickerProps {
  value: string;
  disabled?: boolean;
  onChange(iso: string): void;
}

export function CountryPicker({
  value,
  disabled,
  onChange,
}: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  /** True only while the keyboard, not the mouse, moved the highlight. */
  const followActive = useRef(false);

  const selected = findCountry(value) ?? COUNTRY_CODES[0];
  const visible = useMemo(
    () => COUNTRY_CODES.filter((country) => matchesCountry(country, search)),
    [search],
  );

  useEffect(() => {
    if (!open) return;
    searchBox.current?.focus();
    function onPointerDown(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  /**
   * Scrolls only for the keyboard. Doing it on every change of the highlighted
   * row spins forever with the mouse: the scroll slides a different row under
   * the motionless cursor, its mouseenter highlights it, and that scrolls
   * again.
   */
  useEffect(() => {
    if (!open || !followActive.current) return;
    followActive.current = false;
    // Optional call: jsdom ships no scrollIntoView.
    list.current?.children[active]?.scrollIntoView?.({ block: "nearest" });
  }, [active, open]);

  function choose(country: Country) {
    onChange(country.iso);
    setOpen(false);
    setSearch("");
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      followActive.current = true;
      setActive((current) => {
        if (visible.length === 0) return 0;
        return (current + step + visible.length) % visible.length;
      });
      return;
    }
    if (event.key === "Enter" && visible[active]) {
      event.preventDefault();
      choose(visible[active]);
    }
  }

  return (
    <div className="ca-country" ref={root}>
      <button
        type="button"
        className="ca-country-trigger"
        disabled={disabled}
        aria-label={`País: ${selected.name}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          setActive(0);
        }}
      >
        <Flag iso={selected.iso} name={selected.name} />
        <span>+{selected.dial}</span>
        <ChevronDown aria-hidden="true" size={15} />
      </button>

      {open ? (
        <div className="ca-country-panel">
          <div className="ca-country-search">
            <Search aria-hidden="true" size={15} />
            <input
              ref={searchBox}
              type="text"
              value={search}
              placeholder="País, código o 809…"
              aria-label="Buscar país"
              autoComplete="off"
              onChange={(event) => {
                setSearch(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
            />
          </div>

          {visible.length === 0 ? (
            <p className="ca-country-empty">Ningún país coincide.</p>
          ) : (
            <ul ref={list} role="listbox" aria-label="Países">
              {visible.map((country, index) => (
                <li
                  key={country.iso}
                  role="option"
                  aria-selected={country.iso === selected.iso}
                  data-active={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(country)}
                >
                  <Flag iso={country.iso} name={country.name} />
                  <span className="ca-country-name">{country.name}</span>
                  <span className="ca-country-dial">+{country.dial}</span>
                  {country.iso === selected.iso ? (
                    <Check aria-hidden="true" size={15} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
