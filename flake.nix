{
  description = "WScreenSavers — Native Wayland screensaver and live desktop wallpaper suite";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "wscreensavers";
          version = "1.1.1";
          src = ./.;

          nativeBuildInputs = with pkgs; [
            go
            nodejs
            pkg-config
          ];

          buildInputs = with pkgs; [
            gtk3
            webkitgtk_4_1
            gtk-layer-shell
            pam
          ];

          buildPhase = ''
            export HOME=$TMPDIR
            make build
          '';

          installPhase = ''
            make install DESTDIR=$out PREFIX=""
          '';

          meta = with pkgs.lib; {
            description = "Native Wayland screensaver and live desktop wallpaper suite";
            homepage = "https://github.com/chrisfair/wscreensavers";
            license = licenses.gpl3Plus;
            platforms = platforms.linux;
            mainProgram = "wscreensavers";
          };
        };

        apps.default = flake-utils.lib.mkApp {
          drv = self.packages.${system}.default;
        };

        devShells.default = pkgs.mkShell {
          inputsFrom = [ self.packages.${system}.default ];
          packages = with pkgs; [
            gopls
            go-tools
          ];
        };
      }
    ) // {
      overlays.default = final: prev: {
        wscreensavers = self.packages.${prev.system}.default;
      };

      nixosModules.default = { config, lib, pkgs, ... }: {
        options.services.wscreensavers = {
          enable = lib.mkEnableOption "WScreenSavers idle and live wallpaper daemon";
        };
        config = lib.mkIf config.services.wscreensavers.enable {
          environment.systemPackages = [ self.packages.${pkgs.system}.default ];
          systemd.user.services.wscreensavers = {
            description = "WScreenSavers Wayland screensaver & wallpaper daemon";
            wantedBy = [ "graphical-session.target" ];
            partOf = [ "graphical-session.target" ];
            serviceConfig = {
              ExecStart = "${self.packages.${pkgs.system}.default}/bin/wscreensavers --daemon";
              Restart = "on-failure";
              RestartSec = "3s";
            };
          };
        };
      };
    };
}
