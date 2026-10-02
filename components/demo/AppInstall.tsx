"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  MessageCircle,
  Smartphone,
  Tv,
} from "lucide-react";
import {
  PLAYER_APPS,
  ROKU_APP,
  formatBytes,
  rokuWhatsappUrl,
  type PlayerApp,
} from "@/lib/apps/catalog";

type Device = "phone" | "tv" | "roku";

const DEVICES: ReadonlyArray<{ id: Device; label: string; Icon: typeof Tv }> = [
  { id: "phone", label: "Celular o tablet", Icon: Smartphone },
  { id: "tv", label: "TV, Fire Stick o TV Box", Icon: Tv },
  { id: "roku", label: "Roku", Icon: Tv },
];

function AppRow({ app, children }: { app: PlayerApp; children: React.ReactNode }) {
  return (
    <li className="ca-app" data-recommended={app.recommended ? "true" : undefined}>
      <div className="ca-app-id">
        <strong>{app.name}</strong>
        {app.recommended ? (
          <span className="ca-app-badge">Recomendada</span>
        ) : null}
        <span className="ca-app-size">{formatBytes(app.bytes)}</span>
      </div>
      {children}
    </li>
  );
}

/**
 * Downloading over mobile data costs money and minutes, so the size sits next
 * to every button. The recommended player leads because it is a third of the
 * weight, not because it is better.
 */
function PhoneSteps() {
  return (
    <ol className="ca-steps">
      <li>
        <h3>Descargá la app</h3>
        <p>
          Las dos sirven igual. Si no sabés cuál elegir, llevá la recomendada:
          pesa mucho menos y baja más rápido.
        </p>
        <ul className="ca-apps">
          {PLAYER_APPS.map((app) => (
            <AppRow key={app.id} app={app}>
              <a
                className={`ca-button ${app.recommended ? "ca-button-primary" : "ca-button-quiet"}`}
                href={app.apkUrl}
                rel="noopener"
              >
                <Download aria-hidden="true" size={18} />
                <span>Descargar {app.name}</span>
              </a>
            </AppRow>
          ))}
        </ul>
      </li>

      <li>
        <h3>Aceptá el aviso que aparece</h3>
        <p>
          Tu navegador va a avisarte que{" "}
          <b>este tipo de archivo puede dañar tu dispositivo</b>. Es el mensaje
          normal de Android para cualquier app que no venga de Play Store. Tocá{" "}
          <b>Descargar igual</b>.
        </p>
      </li>

      <li>
        <h3>Abrí el archivo</h3>
        <p>
          Apenas termina, aparece arriba en la barra de notificaciones. Si ya la
          cerraste, está en la carpeta <b>Descargas</b>.
        </p>
      </li>

      <li>
        <h3>Dale permiso, una sola vez</h3>
        <p>
          Android te va a pedir <b>Permitir desde esta fuente</b> (en algunos
          equipos dice «Instalar apps desconocidas»). Activalo para tu navegador
          y volvé atrás.
        </p>
      </li>

      <li>
        <h3>Instalar y abrir</h3>
        <p>
          Tocá <b>Instalar</b>, esperá unos segundos y después <b>Abrir</b>.
          Dejala abierta: ahí vas a cargar los datos que te lleguen por
          WhatsApp.
        </p>
      </li>
    </ol>
  );
}

/**
 * A television has no browser and no keyboard. Downloader turns the URL into
 * seven digits typeable with a remote, which is the only reason this path
 * exists.
 */
function TvSteps() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(app: PlayerApp) {
    try {
      await navigator.clipboard.writeText(app.downloaderCode);
      setCopied(app.id);
      window.setTimeout(() => setCopied(null), 1_500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <ol className="ca-steps">
      <li>
        <h3>Instalá Downloader en tu TV</h3>
        <p>
          Buscá <b>Downloader</b> —el ícono naranja— en la tienda de tu
          televisor: Amazon Appstore en Fire TV, Play Store en Android TV o
          Google TV. Es gratis.
        </p>
      </li>

      <li>
        <h3>Permitile instalar</h3>
        <p>
          En Fire TV: <b>Ajustes → Mi Fire TV → Opciones de desarrollador →
          Instalar apps desconocidas</b>, y activá Downloader. En Android TV o
          Google TV: <b>Ajustes → Apps → Seguridad → Fuentes desconocidas</b>.
        </p>
        <p className="ca-hint">
          ¿No te aparece «Opciones de desarrollador»? Entrá a Ajustes → Mi Fire
          TV → Acerca de y presioná <b>7 veces</b> sobre el nombre de tu equipo.
          Ahí se destraba.
        </p>
      </li>

      <li>
        <h3>Escribí el código en Downloader</h3>
        <p>
          Abrilo, escribí el código en el casillero de arriba y presioná{" "}
          <b>Ir</b>. No hace falta ninguna dirección web.
        </p>
        <ul className="ca-apps">
          {PLAYER_APPS.map((app) => (
            <AppRow key={app.id} app={app}>
              <div className="ca-code-chip">
                <span>{app.downloaderCode}</span>
                <button
                  type="button"
                  aria-label={`Copiar el código de ${app.name}`}
                  onClick={() => void copy(app)}
                >
                  {copied === app.id ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </AppRow>
          ))}
        </ul>
      </li>

      <li>
        <h3>Instalar, abrir y borrar</h3>
        <p>
          Cuando termine de bajar elegí <b>Instalar</b> y después <b>Abrir</b>.
          Downloader te va a ofrecer borrar el archivo: aceptá, ya no hace falta
          y libera espacio en la TV.
        </p>
      </li>
    </ol>
  );
}

/**
 * Roku is the odd one out: no file, no Downloader. The app comes from the
 * channel store and opens onto an access code that is not the demo pass, so
 * the way to get one is to ask for it.
 */
function RokuSteps() {
  return (
    <div className="ca-roku">
      <div className="ca-roku-hero">
        <Image
          src="/brand/clientarea-logo.png"
          alt="ClientArea by Nodo 7 OTT"
          width={1189}
          height={379}
        />
        <h3>{ROKU_APP.storeName}</h3>
        <p>Disponible en la tienda de canales de Roku</p>
      </div>

      <ol className="ca-steps ca-steps-roku">
        <li>
          <h3>Abre la tienda de tu Roku</h3>
          <p>
            Desde el inicio entra a <b>Canales de streaming</b> y elige{" "}
            <b>Buscar canales</b>. Es la tienda oficial, el Roku Channel Store.
          </p>
        </li>

        <li>
          <h3>Busca {ROKU_APP.storeName}</h3>
          <p>
            Escribe <b>{ROKU_APP.storeName}</b>, entra a la app y elige{" "}
            <b>Agregar canal</b>. Es gratis y se instala en segundos.
          </p>
        </li>

        <li>
          <h3>Envíanos el código que te aparece</h3>
          <p>
            Al abrir la app, la pantalla te muestra un código. Envíanoslo por
            WhatsApp y activamos tu acceso.
          </p>
          <a
            className="ca-button ca-button-roku"
            href={rokuWhatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle aria-hidden="true" size={18} />
            <span>Enviar mi código por WhatsApp</span>
          </a>
          <p className="ca-hint ca-roku-number">
            Número: <strong>{ROKU_APP.whatsappDisplay}</strong>
          </p>
        </li>
      </ol>
    </div>
  );
}

export function AppInstall({ onContinue }: { onContinue(): void }) {
  const [device, setDevice] = useState<Device>("phone");

  function move(direction: 1 | -1) {
    const index = DEVICES.findIndex((item) => item.id === device);
    setDevice(DEVICES[(index + direction + DEVICES.length) % DEVICES.length].id);
  }

  return (
    <div className="ca-install">
      <p className="ca-hint">
        Instalala ahora, mientras no corre ningún reloj. Cuando ingreses tu pase
        arrancan 10 minutos, y la demo empieza apenas recibís el acceso.
      </p>

      <div className="ca-device-tabs" role="tablist" aria-label="Tipo de dispositivo">
        {DEVICES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`ca-device-${id}`}
            aria-selected={device === id}
            data-roku={id === "roku" ? "true" : undefined}
            aria-controls="ca-device-panel"
            tabIndex={device === id ? 0 : -1}
            onClick={() => setDevice(id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") move(1);
              if (event.key === "ArrowLeft") move(-1);
            }}
          >
            <Icon aria-hidden="true" size={17} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div
        id="ca-device-panel"
        role="tabpanel"
        aria-labelledby={`ca-device-${device}`}
      >
        {device === "phone" ? <PhoneSteps /> : null}
        {device === "tv" ? <TvSteps /> : null}
        {device === "roku" ? <RokuSteps /> : null}
      </div>

      <button
        className="ca-button ca-button-primary"
        type="button"
        onClick={onContinue}
      >
        <span>Ya la tengo instalada</span>
        <ArrowRight aria-hidden="true" size={19} />
      </button>
    </div>
  );
}
