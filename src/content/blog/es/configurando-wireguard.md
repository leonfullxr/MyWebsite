---
title: "Configurando Wireguard: Scripts de Administración para tu VPN"
date: "2025-01-21"
description: "Aprende a configurar y gestionar Wireguard, una potente solución VPN, con scripts de administración fáciles de seguir."
tags: ["Networking", "Ciberseguridad", "Linux"]
lang: "es"
translation: "configuring-wireguard"
---

# Scripts de Administración de Wireguard

> Ambos scripts están copiados y desarrollados a partir de [David Gross](https://github.com/davidgross/) — ¡todos los créditos para él!

Scripts para aprovisionar clientes de Wireguard. Escritos para ejecutarse en el mismo equipo Linux que el servidor Wireguard. El enfoque está en el uso diario de lo básico: añadir y eliminar peers/clientes.

Hay principalmente 1 script bash y 2 scripts de plantilla:

- **make_install.sh** — permite al usuario configurar con sus propias IPs, rutas de archivos y más
- **add-client-template.sh**
- **delete-client-template.sh**

El `make_install.sh` genera dos scripts basados en la entrada del usuario:

- **add-client.sh**
- **delete-client.sh**

Y un directorio llamado `clients` que contiene:

- **last-ip.txt** — mantiene el estado de la última IP usada
- **wg0-template.conf** — plantilla para generar la configuración básica del peer
- **wg0-template-prekey.conf** — plantilla con clave precompartida

## Consideraciones

He tenido GRANDES dolores de cabeza intentando configurar un servidor VPN autoalojado. Para ayudar, aquí van algunos consejos:

- No uses una VPN mientras configuras Wireguard — solo complica las cosas.
- Comprueba que tus **puertos del servidor** están **habilitados y configurados** (generalmente 51820 por defecto).
- Comprueba que tienes una **dirección IP estática** o un **DNS estático**. Esto se puede configurar con tu ISP.
- Para comprobar si tienes una IP CGNET, mira la IP WAN en tu dashboard de Unifi. Si está entre `100.64.0.0` y `100.127.255.255`, tienes una dirección CGNET.
- Asegúrate de **ajustar tu DNS** del servidor. Si lo has cambiado (ej. Cloudflare: `1.1.1.1`, `1.0.0.1`), añádelo al archivo de configuración.

## Pre-requisitos

1. Wireguard instalado en el servidor con wg0 básico configurado
2. qrencode para configuración fácil en móvil: `apt install qrencode`

## add-client

Script para generar claves de cliente, archivos de configuración y configurarlo en el servidor Wireguard. Genera un código QR en la terminal para configuración fácil en móvil.

```bash
WG_DIR='/etc/wireguard'
SERVER_ADDRESS='ip pública'
SERVER_PORT='51820'
SERVER_WG_IF='wg0'
CLIENT_DIR='/etc/wireguard/clients'
CLIENT_IP='192.168.5.'
```

## delete-client

Script para eliminar un cliente del servidor Wireguard, incluyendo todos los archivos de configuración generados.

## Contribuir

Estoy abierto a cualquier feedback. Si tienes preguntas, ¡no dudes en preguntar!
