# Installing XScreenSavers on NixOS

Applies to: **NixOS (channels 23.11, 24.05, unstable)** and **Nix Flakes**.

---

## 1. System Configuration

Add `xscreensaver` and virtual streaming tools to your system packages in `/etc/nixos/configuration.nix`:

```nix
{ pkgs, ... }:

{
  environment.systemPackages = with pkgs; [
    # WScreenSavers flake or package
    wscreensavers

    # Full XScreenSaver hack collection
    xscreensaver

    # Required streaming backend
    xorg.xorgserver   # provides Xvfb
    ffmpeg
  ];
}
```

Rebuild your system:
```bash
sudo nixos-rebuild switch
```

---

## 2. Using the WScreenSavers Flake

If using Nix Flakes, WScreenSavers provides a flake input directly:

```nix
# flake.nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    wscreensavers.url = "github:chrisfair/wscreensavers";
  };

  outputs = { self, nixpkgs, wscreensavers }: {
    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
      modules = [
        wscreensavers.nixosModules.default
        {
          services.wscreensavers.enable = true;
          environment.systemPackages = [ pkgs.xscreensaver ];
        }
      ];
    };
  };
}
```

---

## 3. Enabling in WScreenSavers

```bash
wscreensavers ctl status
wscreensavers ctl pool all
wscreensavers ctl launch xss_anemone
```
