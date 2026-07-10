---
title: "Migrar Immich llevando un disco duro en la mano, y lo que Nextcloud me enseñó sobre almacenamiento"
date: "2026-07-10"
description: "Mover una biblioteca de fotos entre arquitecturas de CPU sin convertir la base de datos, por qué fijar versiones salvó la migración, y el incidente de VirtualBox que me enseñó dónde pertenecen - y dónde no - los datos masivos."
tags: ["Self-Hosting", "DevOps", "Linux"]
lang: "es"
translation: "immich-migration-and-nextcloud-storage-lessons"
---

# Migrar Immich llevando un disco duro en la mano, y lo que Nextcloud me enseñó sobre almacenamiento

Este post forma parte de mi [serie sobre el servidor doméstico](/es/blog/de-puertos-abiertos-a-tuneles-cloudflare/). En realidad son dos historias que convergen en un mismo principio: **los datos binarios masivos no pertenecen al almacenamiento sincronizado** - las bibliotecas de medios quieren carpetas normales servidas por aplicaciones hechas para ello. Así aprendí eso por el camino caro con Nextcloud, y así hizo que la migración de Immich fuera casi aburrida de tan suave.

## Parte 1 - El incidente de VirtualBox

Mucho antes de la Pi, mi instancia de Nextcloud desarrolló un apetito misterioso por el espacio en disco. El culpable: imágenes de disco `.vdi` de VirtualBox de varios gigas viviendo dentro del `files/` sincronizado de Nextcloud.

Nextcloud, haciendo exactamente lo que promete, las trataba como documentos. Cada retoque a una VM creaba una nueva *versión* de un fichero de varios GB. Cada borrado movía uno a la *papelera*. Resultado: **cientos de gigas de hinchazón invisible** - nada de ello visible en la interfaz de archivos, todo fielmente conservado.

Salir del agujero me enseñó el modelo de almacenamiento real de Nextcloud:

- **No hay exclusiones de versionado por ruta ni por extensión.** Los únicos mandos son globales: `versions_retention_obligation` y `trashbin_retention_obligation` en `config.php`.
- La lista de exclusión del cliente (`sync-exclude.lst`) es **local a cada cliente** y solo evita subidas *futuras*. No hace nada con los datos que ya están en el servidor.
- Recuperar espacio en el servidor significa `occ trashbin:cleanup` y `occ versions:cleanup` - y tras tocar a mano cualquier cosa bajo `data/`, un `occ files:scan` para reconciliar la tabla `oc_filecache`, o la visión que Nextcloud tiene de la realidad se separa de la del disco.
- **Los trabajos en segundo plano importan más de lo que parece.** Un contenedor de cron reiniciándose en bucle silenciosamente significa que las políticas de retención nunca podan nada - el ajuste parece correcto, el disco se sigue llenando.

El arreglo duradero no fue un disco más grande. Fue una regla de arquitectura: Nextcloud gestiona documentos; la música, las fotos y las imágenes de VM viven en carpetas normales, propiedad de herramientas construidas para ellas. Lo cual preparó todo lo que vino después.

## Parte 2 - Immich se muda de casa

Mi biblioteca de fotos corría en [Immich](https://immich.app/) en un portátil viejo, con los medios en un HDD externo de 4,5 TB. La migración a la Pi fue, físicamente, un solo paso: llevar el disco al otro lado de la habitación. Lo interesante es por qué la parte de software no opuso resistencia.

### Fija la versión que nombra la copia de seguridad

Immich escribe copias de seguridad automáticas de la base de datos, y el nombre del fichero codifica la versión exacta que las produjo - algo como `immich-db-backup-...-v2.7.5-pg14.18.sql.gz`. Ese nombre de fichero es el contrato de la migración: pon `IMMICH_VERSION` exactamente en esa release en la máquina nueva. Nunca migres sobre `:release` - si upstream publicó una versión más nueva entre tu copia y tu restauración, la aplicación intentará ejecutar migraciones contra una base de datos que no le corresponde.

### La base de datos cruzó arquitecturas de CPU sin conversión

El detalle picante: el portátil era x86-64, la Pi es ARM64, y el **directorio de datos de Postgres se movió entre ellos tal cual** - sin dump y restore. Eso funciona por alineación, no por suerte: ambas plataformas son little-endian LP64, y la imagen de Postgres de Immich, fijada por versión, es multi-arch y trae Postgres + glibc idénticos en ambas. El mismo formato en disco en los dos extremos significa que los ficheros simplemente funcionan.

Aun así lo traté como el paso arriesgado: el directorio de datos original se quedó intacto en el HDD como rollback instantáneo, y la copia viva corre desde el SSD - las bases de datos odian los discos mecánicos.

### Detalles que se ganaron el sueldo

- **Los medios se quedan en el HDD, la base de datos en el SSD** - bytes masivos en almacenamiento barato, E/S aleatoria caliente en almacenamiento rápido.
- Immich planta **ficheros marcador** `.immich` en sus carpetas de medios y se niega a arrancar si no los ve. Lo que parece pedantería es una salvaguarda: si el HDD alguna vez no monta, Immich se para en seco en lugar de desperdigar subidas silenciosamente en un punto de montaje vacío del SSD.
- Una advertencia heredada de la [arquitectura del túnel](/es/blog/de-puertos-abiertos-a-tuneles-cloudflare/): el plan gratuito de Cloudflare limita los cuerpos de petición a ~100 MB, así que los vídeos largos del móvil no suben por el túnel - van por LAN o VPN.

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

No hay puertos publicados en ninguna parte - la única entrada es la regla de ingress del túnel para `photos.leonfuller.com`, y el sidecar de machine learning (búsqueda inteligente, reconocimiento facial - todo local) nunca sale de la red interna.

## El principio, reformulado

Dos sistemas, una lección. Nextcloud se torció cuando puse binarios masivos en almacenamiento gestionado, versionado y sincronizado. Immich salió bien porque los bytes masivos vivían en una carpeta normal que se podía *llevar en la mano al otro lado de la habitación*, mientras que el pequeño estado caliente (la base de datos) era portable por disciplina: versiones fijadas, formatos compatibles, una copia de rollback.

Los motores de sincronización son para documentos. Las bibliotecas de medios son carpetas. Las bases de datos son ganado con pedigrí - sabe exactamente qué versión, y guarda la copia vieja hasta que la nueva se haya ganado la confianza.

*Con esto se cierra la serie actual del servidor doméstico: [la arquitectura](/es/blog/de-puertos-abiertos-a-tuneles-cloudflare/) · [el pipeline de música](/es/blog/spotify-autoalojado-con-navidrome/).*
