---
title: "Cambiando tu Dirección MAC en Linux"
date: "2024-02-08"
description: "Entiende qué es una dirección MAC, por qué podrías querer cambiarla, e instrucciones paso a paso para Linux."
tags: ["Networking", "Ciberseguridad", "Linux"]
lang: "es"
---

# Cambiando tu Dirección MAC

## ¿Qué es una Dirección MAC?

Una dirección MAC (Media Access Control) es un identificador único asignado a las interfaces de red para la comunicación en una red. Es específica del hardware y normalmente la proporciona el fabricante del dispositivo. Sin embargo, hay ocasiones en las que puede ser necesario cambiarla.

## ¿Por qué Cambiar tu Dirección MAC?

- **Evitar restricciones de red:** Algunas redes pueden bloquear direcciones MAC específicas.
- **Mejorar la privacidad:** Cambiar tu MAC dificulta el rastreo de tu dispositivo en una red.
- **Probar configuraciones de red:** Desarrolladores y administradores pueden simular diferentes dispositivos.

## Ver tu Dirección MAC en Linux

Para ver tu dirección MAC actual, usa el comando `ip`:

```bash
ip link show
```

Busca la línea `link/ether`. Por ejemplo:

```
3: enp0s3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    link/ether 08:00:27:1a:2b:3c brd ff:ff:ff:ff:ff:ff
```

## Cómo Cambiar tu Dirección MAC

**1. Desactiva la interfaz de red:**

```bash
sudo ip link set enp0s3 down
```

**2. Cambia la dirección MAC:**

```bash
sudo ip link set enp0s3 address 12:34:56:78:9a:bc
```

**3. Reactiva la interfaz:**

```bash
sudo ip link set enp0s3 up
```

Verifica el cambio ejecutando `ip link show` de nuevo.

## Hacer el Cambio Permanente

Para hacer permanente el cambio, edita el archivo de configuración de red. En sistemas basados en Debian, modifica `/etc/network/interfaces`:

```
iface enp0s3 inet dhcp
    hwaddress ether 12:34:56:78:9a:bc
```

O en sistemas con NetworkManager, actualiza la dirección MAC en los ajustes de conexión correspondientes.

## Conclusión

Cambiar tu dirección MAC puede ser útil por muchas razones, desde mejorar tu privacidad hasta evitar restricciones de red. Siguiendo los pasos anteriores, puedes cambiar y gestionar fácilmente tu dirección MAC en Linux.
