---
title: "Un Spotify autoalojado: Navidrome, spotdl y una guerra contra los rate limits"
date: "2026-07-10"
description: "Replicar una biblioteca de Spotify de 2.900 canciones en una Raspberry Pi con Navidrome y spotdl: metadatos en banco, backfills reanudables, reconstrucción de playlists desde etiquetas ID3 y todo lo que me enseñó el rate limiter de Spotify."
tags: ["Self-Hosting", "DevOps", "Linux"]
lang: "es"
translation: "self-hosted-spotify-with-navidrome"
---

# Un Spotify autoalojado: Navidrome, spotdl y una guerra contra los rate limits

Este post forma parte de mi [serie sobre el servidor doméstico](/es/blog/de-puertos-abiertos-a-tuneles-cloudflare/). El objetivo era fácil de enunciar y sorprendentemente profundo de ejecutar: **que toda mi biblioteca de Spotify - canciones favoritas y todas las playlists - exista como ficheros de audio normales en mi Raspberry Pi**, servidos por [Navidrome](https://www.navidrome.org/) para que cualquier app compatible con Subsonic pueda reproducirla en streaming desde cualquier lugar.

[![El pipeline de música - un Spotify autoalojado](/images/blog/music-pipeline.svg)](/images/blog/music-pipeline.svg)

## La idea clave: Spotify es un oráculo de metadatos, no una fuente de audio

[spotdl](https://github.com/spotDL/spotify-downloader) nunca toca el audio de Spotify - está protegido con DRM. Spotify se usa únicamente como *oráculo de metadatos*: qué canciones, qué álbumes, qué carátulas, qué números de pista. El audio viene de YouTube Music, que emite sin DRM, emparejado pista a pista buscando "artista título álbum". El techo de calidad es el opus de ~128 kbps de YouTube Music (convertido a mp3) - perfectamente válido para el móvil y el transporte, no un formato de archivo.

La parte de Navidrome es maravillosamente aburrida: vigila una carpeta. Los ficheros aparecen como `{Artista}/{Álbum}/{NN} - {Título}.mp3`, un escaneo cada hora los detecta, y decenas de apps móviles que hablan la API de Subsonic (Symfonium, Tempo, Amperfy...) los reproducen a través del [túnel de Cloudflare](/es/blog/de-puertos-abiertos-a-tuneles-cloudflare/):

```yaml
services:
  navidrome:
    image: deluan/navidrome:latest
    user: "1000:1000"
    environment:
      ND_SCANNER_SCHEDULE: 1h
      ND_BASEURL: https://music.example.com
      ND_PLAYLISTSPATH: Playlists   # importa ./Playlists/*.m3u8
    volumes:
      - ./data:/data
      - /mnt/ssd/music:/music:ro    # solo lectura: Navidrome sirve, nunca escribe
    networks:
      - proxy
```

## Lo que me enseñó el rate limiter

El enfoque ingenuo - pasarle a spotdl una lista de URLs de canciones - murió rápido. Cada URL cruda fuerza una consulta de metadatos por pista, y ~2.900 de esas en bloque es exactamente lo que los sistemas anti-abuso de Spotify existen para frenar. Lecciones, en el orden en que me costaron tiempo:

1. **No uses el client ID compartido de spotdl.** Está estrangulado hasta la inutilidad por todos los demás que lo usan. Una app de desarrollador de Spotify personal (gratuita) tiene su propia cuota.
2. **Incluso tu propia app tiene un tope diario** mientras está en "development mode". Supéralo y Spotify responde `429 Retry-After: 86400` - vuelve dentro de *un día entero*.
3. **La concurrencia dispara otra alarma distinta.** Cuatro hilos en paralelo martilleando el endpoint de sesión consiguieron un soft-ban de la IP (`Could not get session`). Ese error significa *estrangulado*, no *roto* - el arreglo es paciencia, no actualizar paquetes.

El diseño que sobrevivió es un **pipeline en dos pasos** que toca Spotify lo mínimo posible:

**Paso 1 - enumerar y guardar en banco.** Un pequeño script en Python pagina mis canciones favoritas y playlists por la API Web oficial. Esos endpoints devuelven *objetos de pista completos*, así que la misma pasada que lista la biblioteca guarda además los metadatos de cada canción en un fichero `library.spotdl` en disco. Unas docenas de llamadas suaves y espaciadas - esa es toda la participación de Spotify.

**Paso 2 - descargar desde el banco.** `spotdl download library.spotdl` lee los metadatos del disco y solo habla con YouTube. Con `--archive`, cada pista completada queda registrada; las siguientes ejecuciones se saltan lo ya hecho y bajan solo lo nuevo.

```bash
# Paso 1: enumeración paginada, metadatos a disco (el ÚNICO contacto con Spotify)
build-manifest.py  →  backfill/library.spotdl

# Paso 2: las descargas leen el banco; solo YouTube; totalmente reanudable
spotdl download library.spotdl --archive archive \
  --output "{artist}/{album}/{track-number} - {title}.{output-ext}"
```

La consecuencia de guardar los metadatos en disco: **un bloqueo por rate limit detiene el progreso, nunca lo destruye.** Cada ejecución nocturna (timer de systemd, 04:00) continúa exactamente donde paró la anterior, hasta completar el espejo.

## El backfill: 2.906 canciones sin acabar baneado

La descarga masiva inicial merecía paranoia. La petición que fallaba no era por pista - era la obtención de sesión que ocurre *una vez por invocación de spotdl* - así que el bucle se construyó alrededor de eso:

- **Bloques de 30 pistas por invocación**, un solo hilo, con pausas de 12-20 s con jitter entre bloques.
- **Primero un canario**: una pista por invocación durante las primeras ~100, para demostrar que el bloqueo se había levantado antes de comprometerse con la ejecución real.
- **Reanudación a dos capas**: un `cursor` (la siguiente línea del manifiesto, que solo avanza con salidas limpias) más el `--archive` de spotdl (la fuente de verdad de "hecho"). Cualquiera de los dos puede equivocarse por separado; juntos, un crash no cuesta nada.
- **Backoff, no parada en seco**: un bloque fallido se reintenta con esperas crecientes (5 minutos × intento, tope de una hora) y solo se rinde tras seis fallos consecutivos.

La ejecución completa llevó unas 13 horas en la Pi y terminó con ~95% de la biblioteca descargada. Reintentar los rezagados recuperó casi todo el resto; las ~89 canciones finales simplemente no tienen fuente en YouTube - el coste honesto de este enfoque.

Mi bug favorito de aquella semana no tenía nada que ver con Spotify: la ejecución se atascó porque `run.log` había sido creado previamente por root, la redirección sin privilegios `>> run.log` fallaba, bash reportaba el *comando* como fallido, y el bucle interpretaba obedientemente aquello como rate limiting y se echaba atrás 25 minutos cada vez - sin descargar nada. Si escribes scripts de larga duración: **los códigos de salida mienten cuando fallan las redirecciones.**

## Reconstruir las playlists

Descargar ficheros pierde lo que hace que una biblioteca se sienta *tuya*: la pertenencia a playlists. Reconstruirla necesitaba un mapeo fiable de "canción en playlist de Spotify" a "fichero en disco". El truco: al descargar, spotdl incrusta la URL de origen de Spotify en el frame ID3 `WOAS` de cada fichero (con el ISRC como clave de respaldo). Un script relee la pertenencia a playlists desde la API, mapea cada pista a su fichero mediante esa etiqueta, y escribe un `.m3u8` por playlist - más una playlist sintética de "Liked Songs" - en la carpeta desde la que importa Navidrome (`ND_PLAYLISTSPATH`).

Hallazgos variados desde las trincheras:

- La API Web **no puede ver las carpetas de playlists** - el endpoint interno que las conoce responde `403` a los tokens OAuth normales. Un token de primera parte del reproductor web (prestado de las DevTools del navegador) sí puede obtenerlas, y los nombres de carpeta se convierten en prefijos como `T0P / rap`.
- Navidrome lee el nombre `#PLAYLIST:` de una playlist **solo en la primera importación**, y **no** poda una playlist cuando su fichero `.m3u` desaparece - renombrar o eliminar una correctamente implica una poda manual en la base de datos.
- `spotdl sync` (el modo continuo, frente al backfill) es un *espejo de verdad*: borra los ficheros locales cuyas canciones se quitaron de la playlist de origen. Convence saberlo antes de apuntarlo a una carpeta que te importe.

## ¿Mereció la pena?

Completamente. El timer nocturno mantiene el espejo fresco, las playlists se rellenan solas según se reintentan los rezagados, y mi móvil reproduce mi propia biblioteca desde mi propio hardware a través de mi propio túnel - con Spotify reducido al papel que de verdad borda: saber qué música me gusta.

*Siguiente en la serie: [migrar Immich y las lecciones de almacenamiento de Nextcloud que lo precedieron](/es/blog/migracion-immich-y-lecciones-de-almacenamiento-nextcloud/).*
