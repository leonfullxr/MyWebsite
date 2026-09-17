---
title: "Montando Nextcloud en una Raspberry Pi: Docker Compose, PostgreSQL, Traefik y notificaciones push"
date: "2024-07-24"
description: "Mi primer servicio autoalojado de verdad: Nextcloud en Raspberry Pi con Docker Compose, PostgreSQL, Redis, Traefik y Let's Encrypt, previsualizaciones con imaginary y push en tiempo real con notify_push."
tags: ["DevOps", "Self-Hosting", "Linux"]
lang: "es"
translation: "nextcloud-raspberry-pi-docker-setup"
---

# Montando Nextcloud en una Raspberry Pi: Docker Compose, PostgreSQL, Traefik y notificaciones push

> **Actualización (julio 2026):** dos años después este stack es bastante distinto - el borde con Traefik y puertos redirigidos que se describe aquí acabó sustituido por un túnel de Cloudflare con cero puertos abiertos. Este post se queda como registro de la construcción original; la continuación es [De abrir puertos a túneles de Cloudflare](/es/blog/de-puertos-abiertos-a-tuneles-cloudflare/).

Tras escribir sobre [por qué montar un servidor doméstico](/es/blog/creando-servidor-domestico/), aquí va la primera pieza concreta de mi montaje: **Nextcloud en una Raspberry Pi, todo en contenedores**, con base de datos en serio, caché, TLS que se renueva solo y algo que casi nadie documenta bien en Docker: notificaciones push que de verdad funcionan en los clientes.

Dos guías de la comunidad marcaron el camino: [esta del foro de Nextcloud para Raspberry Pi](https://help.nextcloud.com/t/guide-setting-up-nextcloud-on-raspberry-pi-ssl-advanced-app-support-high-performance-postgresql-and-cloudflare-zero-trust-integration/185757) y el muy útil [docker compose con notify_push](https://help.nextcloud.com/t/how-to-docker-compose-with-notify-push-2024/186721) de wwe. Lo de abajo es mi adaptación para Pi ARM64, más los detalles que me costaron varias tardes descubrir.

## El stack de un vistazo

Un proyecto Compose, seis contenedores, cada uno con una función clara:

[![El stack de Nextcloud (2024)](/images/blog/nextcloud-2024-stack.svg)](/images/blog/nextcloud-2024-stack.svg)

| Contenedor | Función |
|---|---|
| `app` | Nextcloud en la imagen Apache: PHP, WebDAV y el resto |
| `cron` | La misma imagen, otro entrypoint: tareas de fondo cada 5 minutos |
| `notify_push` | Demonio Client Push: sincronización en tiempo real sin polling |
| `db` | PostgreSQL 15 - en mis pruebas más rápido que MariaDB y con actualizaciones más limpias |
| `redis` | Bloqueo de ficheros, caché y sesiones PHP |
| `imaginary` | Previsualizaciones, para que PHP no se ahogue con las fotos |

Delante va **Traefik v3**, terminando TLS con certificados Let's Encrypt. El router redirige 80 y 443 hacia la Pi; un registro `A` en Cloudflare apunta el dominio a mi IP doméstica (dinámica, por desgracia).

## Las partes interesantes del Compose

El fichero completo es largo; aquí van las piezas que sostienen el diseño. Postgres y la cuenta de administrador reciben credenciales vía **secrets de Docker** - ficheros `chmod 600` en disco, nunca variables de entorno:

```yaml
  db:
    image: postgres:15
    restart: unless-stopped
    volumes:
      - ./db:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB_FILE=/run/secrets/postgres_db
      - POSTGRES_USER_FILE=/run/secrets/postgres_user
      - POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -d $(cat /run/secrets/postgres_db) -U $(cat /run/secrets/postgres_user)"]
      start_period: 15s
      interval: 30s
    secrets:
      - postgres_db
      - postgres_password
      - postgres_user
```

Los healthchecks no son adorno: `app` declara `depends_on` con `condition: service_healthy`, así Nextcloud no arranca contra una base que aún no acepta conexiones. Esa línea evita el clásico "Internal Server Error en el primer arranque" de los hilos del foro.

Los contenedores `app` y `cron` comparten los mismos bind mounts (`./nextcloud`, `./config`, `./apps`, `./data`), de modo que una actualización de imagen mueve a los dos a la vez.

## notify_push, la parte que vale la pena copiar

Sin Client Push, cada cliente consulta el servidor con un temporizador: lento y derrochador en una Pi. La app `notify_push` trae un demonio en Rust que mantiene un websocket con cada cliente y avisa en cuanto algo cambia. Hacerlo funcionar en Compose es lo que casi todas las guías omiten, y es justo lo que resuelve el hilo de wwe:

```yaml
  notify_push:
    image: nextcloud:${NEXTCLOUD_VERSION}
    restart: unless-stopped
    depends_on:
      - app
    environment:
      - PORT=7070
      - NEXTCLOUD_URL=http://app   # hablar con Nextcloud directamente, sin pasar por el proxy
    entrypoint: /var/www/html/custom_apps/notify_push/bin/aarch64/notify_push /var/www/html/config/config.php
    volumes:
      - ./apps:/var/www/html/custom_apps
      - ./config:/var/www/html/config
```

Tres detalles importan aquí:

- **La ruta del binario depende de la arquitectura.** La app trae binarios precompilados; en Pi es `bin/aarch64/notify_push` - la ruta `x86_64` de la mayoría de ejemplos falla con un críptico "no such file" dentro de un contenedor que claramente tiene ficheros.
- **`NEXTCLOUD_URL=http://app`** apunta el demonio al contenedor de la app por la red Docker. Mandarlo por la URL pública añadiría TLS y saltos de proxy a una conversación de loopback.
- **Se reiniciará en bucle al principio, y no pasa nada.** El binario no existe hasta instalar la app dentro de Nextcloud. La secuencia: levantar el stack, instalar la app, reiniciar el servicio y conectarlo:

```bash
docker compose exec app php occ app:install notify_push
docker compose up -d notify_push
docker compose exec app php occ notify_push:setup https://nextcloud.example.com/push
```

El enrutado es lo sutil: los clientes llegan al demonio por el *mismo dominio* que Nextcloud, bajo `/push`. Traefik casa `PathPrefix(/push)` con **prioridad de router más alta** que el comodín principal, recorta el prefijo con un middleware y reenvía al puerto 7070. Si la prioridad falla, el router principal se traga `/push` - sin error visible, el push simplemente no funciona:

```yaml
# configuracion dinamica de traefik
http:
  middlewares:
    nextcloud-redirect:
      redirectScheme:
        scheme: https
        permanent: true
    secHeaders:
      headers:
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true
    nextcloud_striprefix_push:
      stripPrefix:
        prefixes: ["/push"]
```

`occ notify_push:self-test` confirma la cadena completa; todos los checks en verde.

## Ficheros pequeños, horas grandes de depuración

- **Las sesiones PHP van en Redis.** La imagen oficial guarda sesiones en disco, lo que choca con varios contenedores compartiendo el volumen. Un arreglo de un fichero montado en el directorio de configuración de PHP ([contexto](https://github.com/nextcloud/docker/issues/182)) apunta el almacenamiento de sesiones al servicio `redis` - y los logins dejan de caducar misteriosamente.
- **A Apache hay que contarle lo del proxy con `remoteip`.** Detrás de Traefik, todas las peticiones parecen venir del bridge de Docker. Un pequeño `remoteip.conf` montado en el contenedor recupera las IP reales de los clientes - sin él, la protección anti fuerza bruta estrangula *al proxy* en lugar de al atacante.
- **HSTS y la redirección a https viven en Traefik**, no en Nextcloud - los middlewares `secHeaders` y `redirectScheme` de arriba. El escáner de seguridad del propio Nextcloud se pone en verde con eso.
- **El primer arranque tarda minutos.** El contenedor dice "started" mucho antes de terminar la inicialización. La paciencia gana a recrear el stack porque la página de login no aparece a los treinta segundos.

## El problema de la IP dinámica (un adelanto)

La verruga de este montaje: mi operadora rota la IP pública, y el registro `A` de Cloudflare tiene que seguirla. De momento, un script en un timer de systemd comprueba la IP pública a diario, actualiza el registro DNS por la API de Cloudflare cuando cambia, y resetea el almacén ACME de Traefik para emitir un certificado nuevo. Funciona, pero es la parte de la arquitectura en la que menos confío - la guía original insinúa una integración con Cloudflare Zero Trust, y sospecho que ahí acabará este servidor.

Mientras tanto: los ficheros se sincronizan, los calendarios se comparten, las fotos suben desde el móvil, las previsualizaciones vuelan gracias a imaginary, y el cliente de escritorio se actualiza en cuanto un fichero cambia en cualquier sitio. Para un ordenador del tamaño de una tarjeta de crédito metido en un cajón, es una nube personal muy completa.
