---
title: "Migrating Immich by Carrying a Hard Drive, and What Nextcloud Taught Me About Storage"
date: "2026-07-10"
description: "Moving a photo library across CPU architectures without converting the database, why version pinning saved the migration, and the VirtualBox incident that taught me where bulk data does - and doesn't - belong."
tags: ["Self-Hosting", "DevOps", "Linux"]
lang: "en"
translation: "migracion-immich-y-lecciones-de-almacenamiento-nextcloud"
---

# Migrating Immich by Carrying a Hard Drive, and What Nextcloud Taught Me About Storage

This is part of my [home server series](/en/blog/from-port-forwarding-to-cloudflare-tunnels/). It's really two stories that converge on one principle: **bulk binary data does not belong in synced storage** - media libraries want plain folders served by purpose-built apps. Here's how I learned that the expensive way with Nextcloud, and how it made the Immich migration almost boringly smooth.

## Part 1 - The VirtualBox incident

Long before the Pi, my Nextcloud instance developed a mysterious appetite for disk space. The culprit: multi-gigabyte VirtualBox `.vdi` disk images living inside Nextcloud's synced `files/`.

Nextcloud, doing exactly what it promises, treated them like documents. Every tweak to a VM created a new *version* of a multi-GB file. Every delete moved one to the *trashbin*. Result: **hundreds of gigabytes of invisible bloat** - none of it visible in the files UI, all of it faithfully preserved.

Digging out taught me Nextcloud's actual storage model:

- There are **no per-path or per-extension version exclusions**. The only knobs are global: `versions_retention_obligation` and `trashbin_retention_obligation` in `config.php`.
- The client-side ignore list (`sync-exclude.lst`) is **local to each client** and only prevents *future* uploads. It does nothing about data already on the server.
- Reclaiming space server-side means `occ trashbin:cleanup` and `occ versions:cleanup` - and after manually touching anything under `data/`, an `occ files:scan` to reconcile the `oc_filecache` table, or Nextcloud's view of reality drifts from the disk's.
- **Background jobs matter more than they seem.** A silently crash-looping cron container means retention policies never prune anything - the setting looks right, the disk keeps filling.

The durable fix wasn't a bigger disk. It was an architectural rule: Nextcloud handles documents; music, photos, and VM images live in plain folders owned by tools built for them. Which set up everything that followed.

## Part 2 - Immich moves house

My photo library ran on [Immich](https://immich.app/) on an old laptop, media on an external 4.5 TB HDD. The migration to the Pi was, physically, one step: carry the drive across the room. The interesting part is why the software side didn't fight back.

### Pin the version the backup names

Immich writes automatic database backups, and the filename encodes the exact version that produced them - something like `immich-db-backup-...-v2.7.5-pg14.18.sql.gz`. That filename is the migration contract: set `IMMICH_VERSION` to exactly that release on the new machine. Never migrate onto `:release` - if upstream published a newer version between your backup and your restore, the app will try to run migrations against a database it doesn't match.

### The database crossed CPU architectures without conversion

The spicy detail: the laptop was x86-64, the Pi is ARM64, and the **Postgres data directory moved between them as-is** - no dump-and-restore. That works because of alignment, not luck: both platforms are little-endian LP64, and the pinned Immich Postgres image is multi-arch, shipping the identical Postgres + glibc versions on both. Same on-disk format on both ends means the files just work.

I still treated it as the risky step: the original data directory stayed untouched on the HDD as an instant rollback, and the live copy runs from the SSD - databases hate spinning disks.

### Details that earned their keep

- **Media stays on the HDD, database on the SSD** - bulk bytes on cheap storage, hot random I/O on fast storage.
- Immich plants `.immich` **marker files** in its media folders and refuses to start if it can't see them. What looks like pedantry is a guard: if the HDD ever fails to mount, Immich stops cold instead of quietly scattering uploads into an empty mountpoint on the SSD.
- One caveat inherited from the [tunnel architecture](/en/blog/from-port-forwarding-to-cloudflare-tunnels/): Cloudflare's free plan caps request bodies at ~100 MB, so long phone videos won't back up through the tunnel - they take a LAN or VPN path instead.

### The compose file, minus ceremony

```yaml
services:
  immich-server:
    image: ghcr.io/immich-app/immich-server:${IMMICH_VERSION}  # pinned!
    volumes:
      - /mnt/hdd/immich-data/upload:/data     # media: HDD
    networks: [proxy, default]                # no published ports

  database:
    image: ghcr.io/immich-app/postgres:14-vectorchord0.4.3-pgvectors0.2.0
    volumes:
      - ./postgres:/var/lib/postgresql/data   # DB: SSD
```

No ports are published anywhere - the only way in is through the tunnel's ingress rule for `photos.leonfuller.com`, and the machine-learning sidecar (smart search, face recognition - all local) never leaves the internal network at all.

## The principle, restated

Two systems, one lesson. Nextcloud went wrong when I put bulk binaries into managed, versioned, synced storage. Immich went right because the bulk bytes lived in a plain folder that could be *carried across a room*, while the small hot state (the database) was portable by discipline: pinned versions, compatible formats, a rollback copy.

Sync engines are for documents. Media libraries are folders. Databases are cattle with pedigrees - know exactly which version, and keep the old copy until the new one has proven itself.

*This wraps the current home server series: [the architecture](/en/blog/from-port-forwarding-to-cloudflare-tunnels/) · [the music pipeline](/en/blog/self-hosted-spotify-with-navidrome/).*
