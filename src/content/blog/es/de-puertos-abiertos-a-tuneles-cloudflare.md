---
title: "De abrir puertos a túneles de Cloudflare: la evolución de mi servidor doméstico"
date: "2026-07-10"
description: "Dos años de self-hosting en una Raspberry Pi contados como dos arquitecturas: el clásico port-forwarding con proxy inverso y un script casero de DNS dinámico, y el diseño con Cloudflare Tunnel + Zero Trust que lo sustituyó - con cero puertos abiertos."
tags: ["Self-Hosting", "Networking", "Cybersecurity"]
lang: "es"
translation: "from-port-forwarding-to-cloudflare-tunnels"
---

# De abrir puertos a túneles de Cloudflare: la evolución de mi servidor doméstico

En 2024 escribí sobre [por qué montar un servidor doméstico](/es/blog/creando-servidor-domestico/). Esta es la continuación, dos años y muchas lecciones después: en qué se convirtió aquella idea, contado como **dos arquitecturas** - la clásica que todo el mundo construye primero (puertos abiertos, proxy inverso y un script peleándose con la IP dinámica de mi operadora), y la que la sustituyó (un túnel de Cloudflare con **cero puertos abiertos**).

Todo corre en una Raspberry Pi 5 en mi casa. Al final de este post verás exactamente cómo una petición viaja desde un móvil en la otra punta del mundo hasta un contenedor en esa Pi, sin un solo puerto redirigido en mi router y sin que mi IP doméstica aparezca en ningún registro DNS.

## La plataforma hoy

| Componente | Detalle |
|---|---|
| Host | Raspberry Pi 5, 16 GB RAM, Ubuntu Server (aarch64) |
| Almacenamiento principal | SSD de 2 TB, cifrado con LUKS - aplicaciones, bases de datos, música |
| Almacenamiento masivo | HDD de 4,5 TB, LUKS + LVM - biblioteca de fotos y vídeo |
| Runtime | Docker Compose, un directorio por stack |
| DNS + edge | Cloudflare: DNS, Tunnel, Zero Trust Access, DNSSEC |

Ambos discos se desbloquean con una passphrase al arrancar (`/etc/crypttab`, con `nofail` para que un disco ausente nunca bloquee el arranque). Cada servicio es su propio stack de Compose:

```
/mnt/ssd/selfhost/
├── cloudflared/   # el borde: un túnel de salida, todas las reglas de ingress
├── nextcloud/     # archivos, contactos, notas + Postgres + Redis + notify_push
├── navidrome/     # servidor de música + pipeline de sincronización con Spotify
└── immich/        # copia de fotos (medios en el HDD, BD en el SSD)
```

Todo contenedor que deba ser accesible se une a una red externa compartida de Docker llamada `proxy`. Quién puede hablar con el mundo exterior es, precisamente, la historia de este post.

## Arquitectura v1 - Traefik, Let's Encrypt y un script contra mi operadora

La primera versión era el patrón de cualquier tutorial de self-hosting: redirigir los puertos 80/443 en el router, un proxy inverso que termina TLS con certificados de Let's Encrypt, y un registro `A` apuntando a tu IP pública. Documenté aquella primera construcción en detalle en su momento - el stack de Compose completo, la configuración de Traefik y todo lo demás - en [Montando Nextcloud en una Raspberry Pi](/es/blog/montando-nextcloud-en-raspberry-pi-docker/).

[![Arquitectura v1 - Traefik + Let's Encrypt + port forwarding](/images/blog/v1-architecture.svg)](/images/blog/v1-architecture.svg)

Funcionaba. Pero cada pieza escondía un impuesto.

### El problema de la IP dinámica

Las conexiones residenciales no traen IP estática. La mía cambiaba cuando a la operadora le apetecía, y cada cambio dejaba el registro `A` apuntando a casa de un desconocido hasta que algo lo arreglara. Ese algo era `check-ip.sh`, un script en un timer diario de systemd:

```bash
# 1. ¿Qué IP ve el mundo?
CURRENT_IP=$(curl -sf https://api.ipify.org)

# 2. ¿La misma que la última vez? Entonces no hay nada que hacer.
[[ "$CURRENT_IP" == "$(cat /var/cache/public-ip)" ]] && exit 0

# 3. Ha cambiado - actualizar el registro A de Cloudflare vía API.
curl -sf -X PATCH \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  --data "{\"content\": \"$CURRENT_IP\"}" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records/$RECORD"

# 4. Borrar el estado ACME de Traefik para que reemita el certificado...
docker compose stop traefik
rm -f traefik/acme.json && touch traefik/acme.json && chmod 600 traefik/acme.json
docker compose up -d --force-recreate traefik

# 5. ...y esperar 90 segundos cruzando los dedos.
sleep 90
curl -sf -o /dev/null -w "%{http_code}" "https://$DOMAIN/login"
```

El paso 5 no es broma: el script real terminaba literalmente con un `sleep 90` y un chequeo HTTPS que dejaba un aviso en el log si el certificado aún no estaba listo. Cada cambio de IP era una pequeña caída con varios modos de fallo encadenados: la detección de la IP, la llamada a la API, la reemisión ACME, el reinicio del proxy.

### Qué más dolía

- **Dos puertos permanentemente abiertos a internet.** Los puertos 80 y 443 eran una invitación permanente en mi router - una superficie de ataque 24/7 apuntando a mi salón.
- **Mi IP doméstica era de dominio público.** Cualquiera que resolviera `nextcloud.example.com` obtenía la IP de mi casa - y los servicios de histórico DNS archivan esos registros *para siempre*.
- **Las rarezas de ACME.** El `acme.json` de Traefik debe existir previamente como *fichero* con `chmod 600`, o Docker lo crea amablemente como directorio y la emisión de certificados falla de formas confusas. Las renovaciones podían entrar en carrera tras un cambio de IP.
- **El error de diseño que más agradezco haber descubierto yo mismo:** los puertos publicados de Docker **se saltan UFW**. Docker inserta sus cadenas de iptables por delante de las de UFW, así que `ufw deny 8080` no hace nada frente a un contenedor que publica `8080:80`. Mis reglas de firewall me daban una falsa sensación de seguridad - la única puerta real eran las redirecciones del router.

Ninguno de estos problemas es exótico. Son la experiencia *por defecto* del self-hosting a la manera clásica. Por eso el arreglo resultó tan limpio.

## Arquitectura v2 - invertir la conexión

Un túnel de Cloudflare le da la vuelta al modelo. En lugar de que internet se conecte *hacia dentro* de mi casa, un único contenedor ligero (`cloudflared`) marca *hacia fuera*, al edge de Cloudflare, y mantiene vivas varias conexiones QUIC redundantes. El tráfico entrante viaja de vuelta por esas conexiones ya establecidas. Nada escucha en la WAN. El router no redirige nada. Mi IP doméstica no aparece en ningún registro DNS - los hostnames públicos resuelven a la red anycast de Cloudflare.

[![Arquitectura v2 - Cloudflare Tunnel + Zero Trust](/images/blog/v2-architecture.svg)](/images/blog/v2-architecture.svg)

Todo el borde de mi infraestructura es ahora este fichero de Compose:

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CF_TUNNEL_TOKEN}
    extra_hosts:
      # permite al túnel llegar a servicios del propio host (sshd)
      - host.docker.internal:host-gateway
    networks:
      - proxy

networks:
  proxy:
    external: true
```

Eso es todo. Ni un solo puerto publicado en toda la plataforma.

### Enrutado: un túnel, muchos servicios

Las reglas de tráfico viven en el panel de Cloudflare Zero Trust como *reglas de ingress* - hostname (y ruta opcional) → servicio de origen, evaluadas de arriba abajo, gana la primera coincidencia:

| Hostname | Ruta | Origen |
|---|---|---|
| nextcloud.example.com | `/push/*` | `notify_push:7070` |
| nextcloud.example.com | `*` | `nextcloud-app:8080` |
| music.example.com | `*` | `navidrome:4000` |
| photos.example.com | `*` | `immich_server:3000` |
| ssh.example.com | - | `host.docker.internal:2222` (SSH) |

El orden importa: la regla `/push/*` debe estar *encima* del comodín del mismo hostname, o el demonio de push de Nextcloud deja de funcionar en silencio. Los orígenes son nombres DNS normales de Docker en la red `proxy` - cloudflared los resuelve como lo haría cualquier otro contenedor.

Añadir un servicio nuevo son ahora dos pasos: unirse a la red `proxy` y añadir una regla de ingress. Sin puertos, sin certificados, sin registros DNS que gestionar - el panel crea el CNAME por ti, y el TLS se gestiona en el edge de Cloudflare.

### SSH desde cualquier parte, protegido por Zero Trust

La ruta `ssh.example.com` es especial: la protege Cloudflare Access, que exige un código de un solo uso por email *antes de que un solo byte llegue a mi red*. En el cliente es transparente tras el primer login:

```
# ~/.ssh/config
Host pi
  HostName ssh.example.com
  User pi
  ProxyCommand cloudflared access ssh --hostname %h
```

El primer `ssh pi` abre el navegador para el código OTP; después se siente como SSH normal. Access puede incluso renderizar un terminal SSH completo *en el navegador* para máquinas donde no puedo instalar nada. Detrás de todo eso, el sshd de la Pi sigue exigiendo `PasswordAuthentication no` y `PermitRootLogin no` - Access es una puerta delante de las defensas de siempre, no un sustituto.

### Lo que ve ahora un atacante

Esta es mi parte favorita del rediseño. Recorre la cadena desde fuera:

- Resuelve cualquiera de mis hostnames → obtienes el edge anycast de Cloudflare, nunca mi casa.
- Escanea los puertos de mi IP doméstica (si de algún modo la encuentras) → no hay nada escuchando.
- ¿Quieres una shell? Tienes que superar Cloudflare Access (un OTP enviado a un buzón protegido con 2FA por hardware) y *después* un sshd que solo acepta claves.

Las joyas de la corona dejaron de ser puertos y direcciones IP y pasaron a ser **dos cuentas** - Cloudflare y el correo - ambas con 2FA por hardware. DNSSEC firma la zona por encima. ¿Y el viejo script de DNS dinámico, con su token de API incrustado? Borrado, y el token revocado. Ya no le queda nada que hacer.

### Los trade-offs, con honestidad

Ninguna arquitectura sale gratis, y sería deshonesto vender esta como si lo fuera:

- **Cloudflare termina el TLS** en su edge, lo que significa que Cloudflare puede ver mi tráfico en claro. Para mi modelo de amenazas (proteger una nube personal frente a internet) es aceptable; para el tuyo puede que no.
- **El plan gratuito limita los cuerpos de subida a ~100 MB**, así que los vídeos largos del móvil no suben por el túnel - van por LAN o VPN.
- **Es una dependencia.** Si Cloudflare tiene un mal día, mis servicios no son accesibles desde fuera (el acceso por LAN sigue funcionando).

Acepto esos trade-offs antes que puertos abiertos y un `sleep 90` en un script de cron, cualquier día de la semana.

## Notas operativas que se han ganado su sitio

- La imagen de `cloudflared` es **distroless** - no hay shell dentro desde la que depurar. Cuando necesito inspeccionar la red desde el punto de vista del túnel, lanzo un contenedor desechable de `curlimages/curl` en la red `proxy`.
- La automatización nocturna corre en **timers de systemd con `Persistent=true`**, de modo que los trabajos perdidos durante una caída se recuperan al arrancar en lugar de saltarse un día en silencio.
- La vieja regla sigue vigente aun sin redirecciones de puertos: **no publiques puertos de contenedor que no necesites.** Las reglas de iptables de Docker se saltan UFW, así que el único puerto publicado seguro es el que no existe.

## Lo próximo en esta serie

La plataforma a la que sirve este borde tiene sus propias historias:

- **Un Spotify autoalojado**: Navidrome más un pipeline que replica mi biblioteca de Spotify atravesando rate limits → [léelo aquí](/es/blog/spotify-autoalojado-con-navidrome/).
- **Migrar Immich llevando un disco duro en la mano** (y las lecciones de almacenamiento de Nextcloud que lo precedieron) → [léelo aquí](/es/blog/migracion-immich-y-lecciones-de-almacenamiento-nextcloud/).

Los tres diagramas de arquitectura de esta serie se dibujaron para ella - la fuente editable de draw.io está [aquí](/diagrams/homelab-diagrams.drawio) por si quieres adaptarlos a tu propio montaje.
