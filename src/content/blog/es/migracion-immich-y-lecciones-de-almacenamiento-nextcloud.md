---
title: "Migrar Immich llevando un disco duro en la mano, y lo que Nextcloud me enseñó sobre almacenamiento"
date: "2026-07-10"
description: "Trasladar una biblioteca de fotos entre CPUs sin convertir Postgres, por qué pinchar la versión salvó la migración, y el desastre de VirtualBox que me enseñó dónde van - y dónde no - los binarios grandes."
tags: ["Self-Hosting", "DevOps", "Linux"]
lang: "es"
translation: "immich-migration-and-nextcloud-storage-lessons"
---

# Migrar Immich llevando un disco duro en la mano, y lo que Nextcloud me enseñó sobre almacenamiento

Forma parte de mi [serie sobre el servidor doméstico](/es/blog/de-puertos-abiertos-a-tuneles-cloudflare/). Son dos relatos distintos que acaban en la misma conclusión: **los binarios voluminosos no encajan en almacenamiento sincronizado y versionado** - una biblioteca de medios quiere un directorio plano atendido por una app hecha para eso. Nextcloud me enseñó la lección a golpe de factura de disco; Immich demostró lo contrario cuando moví la biblioteca de un lado a otro de la habitación.

## Parte 1 - El incidente de VirtualBox

Antes de la Pi, Nextcloud empezó a devorar espacio sin explicación aparente. El origen: ficheros `.vdi` de VirtualBox de varios gigabytes dentro del árbol `files/` que sincronizaba.

Nextcloud hace lo que debe: trata esos ficheros como documentos. Cada arranque o cambio de una VM generaba otra *versión* de un archivo enorme. Cada borrado mandaba una copia a la *papelera*. El resultado fue **cientos de gigabytes de hinchazón que no se veía en la UI**, pero que el backend conservaba religiosamente.

Para salir del pozo tuve que entender cómo guarda Nextcloud de verdad:

- **No existen exclusiones de versionado por carpeta o extensión.** Solo mandos globales en `config.php`: `versions_retention_obligation` y `trashbin_retention_obligation`.
- El `sync-exclude.lst` del cliente es **local** y solo frena subidas *nuevas*. No toca lo que ya vive en el servidor.
- Liberar espacio implica `occ trashbin:cleanup` y `occ versions:cleanup`; si manipulas algo bajo `data/` a mano, hace falta `occ files:scan` para alinear `oc_filecache` con el disco, o la UI y la realidad divergen.
- **Los cron jobs importan más de lo que parecen.** Un contenedor de cron reiniciándose en bucle deja las políticas de retención sin efecto: la configuración luce bien, el disco sigue creciendo.

La solución no fue comprar más TB. Fue una regla de diseño: Nextcloud para documentos; música, fotos e imágenes de VM en directorios normales, gestionados por herramientas adecuadas. Eso preparó el terreno para lo que vino después.

## Parte 2 - Immich se muda de casa

La biblioteca corría en [Immich](https://immich.app/) sobre un portátil viejo, con los medios en un HDD externo de 4,5 TB. Llevarla a la Pi fue, en lo físico, caminar con el disco al otro lado de la habitación. Lo interesante es que el software casi no protestó.

### Fija la versión que nombra la copia de seguridad

Immich genera backups automáticos de la base de datos, y el nombre del fichero incluye la release exacta - por ejemplo `immich-db-backup-...-v2.7.5-pg14.18.sql.gz`. Ese nombre es el contrato: en la máquina nueva, `IMMICH_VERSION` debe coincidir con esa release. No migres con `:release` - si upstream publicó algo más nuevo entre el backup y la restauración, la app intentará migrar una base que no le corresponde.

### La base de datos cruzó arquitecturas de CPU sin conversión

El matiz: portátil x86-64, Pi ARM64, y el **directorio de datos de Postgres se copió tal cual** - sin dump/restore. Funciona por compatibilidad, no por casualidad: little-endian LP64 en ambos lados, imagen Postgres de Immich fijada y multi-arch con Postgres + glibc idénticos. Mismo formato en disco en origen y destino: los ficheros arrancan.

Aun así lo traté como el paso peligroso: el directorio original quedó intacto en el HDD como rollback inmediato; la instancia viva corre desde el SSD - Postgres y discos mecánicos no son amigos.

### Detalles que se ganaron el sueldo

- **Medios en HDD, base de datos en SSD** - bytes fríos en almacenamiento barato, E/S aleatoria caliente en disco rápido.
- Immich deja **marcadores** `.immich` en sus carpetas de medios y no arranca si faltan. Parece capricho, pero evita que, con el HDD desmontado, las subidas se dispersen en un punto de montaje vacío del SSD.
- Herencia de la [arquitectura del túnel](/es/blog/de-puertos-abiertos-a-tuneles-cloudflare/): el plan gratuito de Cloudflare limita cuerpos de petición a ~100 MB; vídeos largos del móvil no pasan por el túnel - van por LAN o VPN.

### El compose, sin ceremonia

```yaml
services:
  immich-server:
    image: ghcr.io/immich-app/immich-server:${IMMICH_VERSION}  # ¡fijada!
    volumes:
      - /mnt/hdd/immich-data/upload:/data     # medios: HDD
    networks: [proxy, default]                # sin puertos publicados

  database:
    image: ghcr.io/immich-app/postgres:14-vectorchord0.4.3-pgvectors0.2.0
    volumes:
      - ./postgres:/var/lib/postgresql/data   # BD: SSD
```

Sin puertos publicados: la entrada es la regla de ingress del túnel para `photos.example.com`. El sidecar de ML (búsqueda inteligente, reconocimiento facial - todo local) no sale de la red interna.

## El principio, reformulado

Dos sistemas, una lección. Nextcloud se deformó cuando metí binarios grandes en almacenamiento gestionado y versionado. Immich funcionó porque esos bytes vivían en una carpeta que podía *cargar al hombro y cruzar la habitación*, mientras el estado caliente (Postgres) era portable por disciplina: versiones fijadas, formatos alineados, copia de respaldo intacta hasta confiar en la nueva.

Los motores de sincronización sirven para documentos. Las bibliotecas de medios son directorios. Las bases de datos exigen pedigrí: sabe qué versión llevas, y guarda la copia vieja hasta que la nueva demuestre que merece quedarse.

*Con esto cierra la serie actual del servidor doméstico: [la arquitectura](/es/blog/de-puertos-abiertos-a-tuneles-cloudflare/) · [el pipeline de música](/es/blog/spotify-autoalojado-con-navidrome/).*
