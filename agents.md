
# 🧠 Agents for prosjektet `b22`

Dette dokumentet beskriver tilkoblinger og git-agenter som brukes i utvikling og produksjon for `b22`-prosjektet.

---

## 💻 Lokal utvikling / Codespaces

- **Plattform**: GitHub Codespaces
- **Git branch**: `main`
- **SSH-nøkkel**: `~/.ssh/id_ed25519_verpex`
- **SSH config alias**: `s3146`
- **Git remote for produksjon**:
  ```bash
  ssh://s3146/home/terapisomvirker/public_html/b22/.git
  ```

---

## 🌐 Produksjonsserver

- **Host**: `s3146.fra1.stableserver.net`
- **SSH-bruker**: `terapisomvirker`
- **Produksjonsmappe**: `/home/terapisomvirker/public_html/b22/`
- **Git-repo**: Inneholder `.git` (fullverdig repo)
- **SSH-port**: 22
- **Mottar deploy via**: `deploy_to_web.sh`

---

## 🔄 Synk fra produksjon

For å hente siste produksjonsversjon inn i Codespaces:

```bash
./sync_from_web.sh
```

Dette gjør:
- `git fetch web`
- `git checkout web/main -- .`

---

## 🚀 Deploy til produksjon

Du bruker et eget `deploy_to_web.sh`-script for å sende endringer tilbake til serveren.

---

## 🧰 SSH-forbindelse

SSH config i `~/.ssh/config`:

```ssh
Host s3146
  HostName s3146.fra1.stableserver.net
  User terapisomvirker
  Port 22
  IdentityFile ~/.ssh/id_ed25519_verpex
```

---

Sist oppdatert av ChatGPT – Codex agent.
