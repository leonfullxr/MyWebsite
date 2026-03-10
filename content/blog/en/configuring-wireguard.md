---
title: "Configuring Wireguard: Admin Scripts for Your VPN"
date: "2025-01-21"
description: "Learn how to set up and manage Wireguard, a powerful VPN solution, with easy-to-follow admin scripts."
tags: ["Networking", "Cybersecurity", "Linux"]
lang: "en"
---

# Wireguard Admin Scripts

> Both of the scripts are copied and developed from [David Gross](https://github.com/davidgross/) — all credits to him!

Scripts to provision Wireguard clients. Written to run on the same Linux computer as the Wireguard server. Focus is on daily use of the basics — add and delete peers/clients.

There are mainly 1 bash script and 2 template scripts to help you administer your wireguard instance:

- **make_install.sh** — lets user configure with their own IPs, file paths and more
- **add-client-template.sh**
- **delete-client-template.sh**

The `make_install.sh` generates two scripts based on user input and template scripts:

- **add-client.sh**
- **delete-client.sh**

And last but not least, a directory called `clients` containing:

- **last-ip.txt** — keeps state of last used wireguard peer's IP
- **wg0-template.conf** — template to generate a basic peer's wg0.conf
- **wg0-template-prekey.conf** — template to generate a peer's wg0.conf with a preshared key

## Considerations

I've had BIG headaches trying to configure a self-hosted VPN server, and I've had many errors in the process. To help out, here are some things to take into consideration:

- Don't use a VPN while configuring Wireguard — it just makes things harder and can trigger bad configs.
- Check that your **server ports** are **enabled and configured** (mostly 51820 by default).
- Check that you have a **static DNS IP address** or a **static IP address**. This can be configured by your ISP by calling them. Make sure you have a DDNS config for updating your IP in case it changes.
- To check if you have a CGNET IP, look at the WAN IP on your Unifi dashboard. If it falls between `100.64.0.0` and `100.127.255.255`, you have a CGNET address.
- Be sure to **adjust your DNS** from your server. If you've changed it (e.g. to Cloudflare: `1.1.1.1`, `1.0.0.1`), add that to the config file. Otherwise, just put `auto`.

## Pre-requirements

1. Wireguard installed on server and basic wg0 configured ([wireguard.com/install](https://www.wireguard.com/install/))
2. qrencode for easy setup on mobile: `apt install qrencode`

## add-client

Script to generate client keys and config files as well as set it up on the wireguard server. It also checks if your client name is already in use, generates a QR code in the terminal for easy setup on mobile, and saves a QR PNG for portable use.

Supports:
- Check if client/peer name already exists
- Tunnel split (LAN) or route all traffic
- Use preshared key or not

### Variable Examples

```bash
WG_DIR='/etc/wireguard'
SERVER_ADDRESS='public ip'
SERVER_PORT='51820'
SERVER_WG_IF='wg0'
SERVER_PUBLIC_KEY='server_public.key'
CLIENT_WG_IF='wg0'
CLIENT_DIR='/etc/wireguard/clients'
CLIENT_IP='192.168.5.'
WG_REREAD='YES'
WG_PREKEY='YES'
```

## delete-client

Script to delete a client from the wireguard server. It also deletes any previously generated configuration files such as public/private key and wg0.conf.

### Variable Examples

```bash
WG_DIR='/etc/wireguard'
CLIENT_DIR='/etc/wireguard/clients'
SERVER_WG_CONF='wg0.conf'
SERVER_WG_IF='wg0'
```

## Contributing

I'm open for any feedback. If you have any questions — don't hesitate to ask!
