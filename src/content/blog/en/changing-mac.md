---
title: "Changing Your MAC Address in Linux"
date: "2024-02-08"
description: "Understand what a MAC address is, why you might want to change it, and step-by-step instructions for Linux."
tags: ["Networking", "Cybersecurity", "Linux"]
lang: "en"
translation: "cambiando-mac"
---

# Changing Your MAC Address

## What is a MAC Address?

A MAC (Media Access Control) address is a unique identifier assigned to network interfaces for communication on a network. It is hardware-specific and usually provided by the device manufacturer. However, there are times when you may want or need to change your MAC address.

## Why Change Your MAC Address?

- **Bypass network restrictions:** Some networks may block specific MAC addresses, and changing yours can help you regain access.
- **Enhance privacy:** Changing your MAC address makes it harder to track your device on a network.
- **Test network setups:** Developers and network administrators might change MAC addresses to simulate different devices.

## Viewing Your MAC Address in Linux

To see your current MAC address, use the `ip` or `ifconfig` command:

```bash
ip link show
```

Look for the line labeled `link/ether`. For example:

```
3: enp0s3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    link/ether 08:00:27:1a:2b:3c brd ff:ff:ff:ff:ff:ff
```

## How to Change Your MAC Address in Linux

Follow these steps to temporarily change your MAC address:

**1. Bring the network interface down:**

```bash
sudo ip link set enp0s3 down
```

**2. Change the MAC address:**

```bash
sudo ip link set enp0s3 address 12:34:56:78:9a:bc
```

**3. Bring the network interface back up:**

```bash
sudo ip link set enp0s3 up
```

You can verify the change by running `ip link show` again.

## Making the Change Permanent

To make the MAC address change permanent, you can edit the network configuration file for your distribution. For example, on Debian-based systems, modify `/etc/network/interfaces`:

```
iface enp0s3 inet dhcp
    hwaddress ether 12:34:56:78:9a:bc
```

Or, on systems using NetworkManager, update the MAC address in the appropriate connection settings.

## Conclusion

Changing your MAC address can be useful for many reasons, from enhancing privacy to bypassing network restrictions. By following the steps outlined above, you can easily change and manage your MAC address in Linux.
