{
  description = "Chironium — development environment and production build.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    devenv.url = "github:cachix/devenv";
  };

  nixConfig = {
    extra-trusted-public-keys = "devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw=";
    extra-substituters = "https://devenv.cachix.org";
  };

  outputs =
    {
      self,
      nixpkgs,
      devenv,
      ...
    }@inputs:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;

      # Shared BEAM / Node.js toolchain definition.
      toolchain = system: rec {
        pkgs = nixpkgs.legacyPackages.${system};
        beamPkgs = pkgs.beam.packages.erlang_28;
        erlang = beamPkgs.erlang;
        elixir = beamPkgs.elixir_1_19;
        nodejs = pkgs.nodejs_24;
        pnpm = pkgs.pnpm_10;
      };
    in
    {
      # ── Packages ──────────────────────────────────────────────────────
      packages = forAllSystems (
        system:
        let
          tc = toolchain system;
          inherit (tc) pkgs beamPkgs elixir erlang nodejs pnpm;
          lib = pkgs.lib;

          pname = "chironium";
          version = "0.1.0";

          src = lib.cleanSourceWith {
            src = ./.;
            filter =
              path: type:
              let
                baseName = baseNameOf path;
                relPath = lib.removePrefix (toString ./. + "/") (toString path);
              in
              # Exclude dev/build artifacts that must not leak into the store.
              !(builtins.elem baseName [
                "_build"
                "deps"
                "node_modules"
                ".devenv"
                ".direnv"
                ".nix-mix"
                ".nix-hex"
                ".nix-corepack"
                ".elixir_ls"
                ".git"
                "result"
              ])
              && !(lib.hasPrefix "priv/static/" relPath)
              && !(lib.hasPrefix "priv/plts/" relPath);
          };

          # Fixed-output derivation that runs `mix deps.get`.
          # Handles both Hex and git dependencies automatically.
          mixFodDeps = beamPkgs.fetchMixDeps {
            pname = "mix-deps-${pname}";
            inherit src version;
            hash = lib.fakeHash;
          };

          # Stub package.json files for the pnpm workspace members that live
          # under deps/ (phoenix, phoenix_html, phoenix_live_view). These Hex
          # packages ship JS code consumed via `file:../deps/...` links in the
          # assets workspace. During fetchPnpmDeps the real deps aren't
          # available, so we create minimal stubs that satisfy pnpm's workspace
          # resolution. At build time, mixRelease symlinks the real deps.
          phoenixStubs = ''
            mkdir -p deps/phoenix deps/phoenix_html deps/phoenix_live_view
            echo '{"name":"phoenix","version":"0.0.0"}' > deps/phoenix/package.json
            echo '{"name":"phoenix_html","version":"0.0.0"}' > deps/phoenix_html/package.json
            echo '{"name":"phoenix_live_view","version":"0.0.0"}' > deps/phoenix_live_view/package.json
          '';

          # Fixed-output derivation that fetches pnpm dependencies.
          pnpmDeps = pkgs.fetchPnpmDeps {
            inherit pname version src;
            pnpm = pnpm;
            fetcherVersion = 3;
            # The workspace references deps/phoenix* which aren't in src.
            # Create stubs so pnpm install can resolve the workspace layout.
            postPatch = phoenixStubs;
            hash = lib.fakeHash;
          };
        in
        {
          default = beamPkgs.mixRelease {
            inherit
              pname
              version
              src
              mixFodDeps
              ;

            inherit elixir erlang;

            nativeBuildInputs = [
              # Asset pipeline.
              nodejs
              pnpm
              pkgs.pnpmConfigHook

              # Native compilation for picosat_elixir, bcrypt, etc.
              pkgs.gcc
              pkgs.gnumake
              pkgs.cmake
              pkgs.pkg-config

              # fetchMixDeps needs git to clone git dependencies.
              pkgs.git
            ];

            inherit pnpmDeps;
            pnpmRoot = ".";

            # Create phoenix stubs before pnpmConfigHook runs in postConfigure.
            # mixRelease's configure phase symlinks deps, but it may not have
            # the package.json files pnpm expects at the workspace root level.
            postPatch = phoenixStubs;

            # Runs AFTER deps.compile, BEFORE mix compile.
            preBuild = ''
              # Link the real mix deps over the stubs so pnpm workspace
              # members point to actual Phoenix JS sources during the build.
              rm -rf deps
              ln -sf "$MIX_DEPS_PATH" deps
            '';

            # Runs AFTER mix compile, BEFORE mix release.
            postBuild = ''
              # Generate gql.tada introspection types from the GraphQL schema.
              pnpm --dir assets gql:generate || true

              # Build frontend assets (paraglide + tsc + vite build).
              # Output lands in priv/static/ per vite.config.mts.
              pnpm --dir assets build

              # Digest static files for Phoenix cache-busting.
              mix do deps.loadpaths --no-deps-check, phx.digest priv/static
            '';

            # Remove the Erlang cookie from the release for security.
            # Set RELEASE_COOKIE at runtime instead.
            removeCookie = true;
          };

          # OCI container image wrapping the release.
          docker = pkgs.dockerTools.buildLayeredImage {
            name = "chironium";
            tag = version;

            contents = [
              pkgs.cacert # TLS certificates for outbound HTTPS.
              pkgs.busybox # Minimal shell for debugging.
            ];

            config = {
              Entrypoint = [ "${self.packages.${system}.default}/bin/server" ];
              Env = [
                "LANG=en_US.UTF-8"
                "LC_ALL=en_US.UTF-8"
                "RELEASE_TMP=/tmp/chironium"
                "PHX_SERVER=true"
              ];
              ExposedPorts = {
                "4000/tcp" = { };
              };
            };
          };
        }
      );

      # ── Dev Shell ─────────────────────────────────────────────────────
      devShells = forAllSystems (
        system:
        let
          tc = toolchain system;
          inherit (tc) pkgs erlang elixir;
        in
        {
          default = devenv.lib.mkShell {
            inherit inputs pkgs;
            modules = [
              {
                packages = [
                  # BEAM toolchain.
                  erlang
                  elixir

                  # Node.js 24 with corepack for pnpm version management.
                  # The exact pnpm version is pinned via `packageManager` in package.json.
                  pkgs.nodejs_24
                  pkgs.corepack_24

                  # Native dependencies for Hex packages (picosat_elixir, etc.).
                  pkgs.gcc
                  pkgs.gnumake
                  pkgs.cmake

                  # File-system watcher for Phoenix live reload.
                  pkgs.inotify-tools

                  # Useful CLI tools.
                  pkgs.git
                ];

                # Project-local PostgreSQL managed by devenv.
                services.postgres = {
                  enable = true;
                  package = pkgs.postgresql_18;
                  listen_addresses = "127.0.0.1";
                  port = 5432;
                  initialDatabases = [
                    {
                      name = "chironium_dev";
                      user = "postgres";
                      pass = "postgres";
                    }
                    {
                      name = "chironium_test";
                      user = "postgres";
                      pass = "postgres";
                    }
                  ];
                  # The user/pass on initialDatabases creates the role, but we
                  # also need SUPERUSER for Ecto migrations and extensions.
                  initialScript = ''
                    ALTER ROLE postgres WITH SUPERUSER;
                  '';
                };

                enterShell = ''
                  # Keep Mix artifacts inside the project (avoids polluting ~/.mix).
                  export MIX_HOME="$PWD/.nix-mix"
                  export HEX_HOME="$PWD/.nix-hex"
                  export PATH="$MIX_HOME/bin:$MIX_HOME/escripts:$HEX_HOME/bin:$PATH"

                  # Erlang history for iex sessions.
                  export ERL_AFLAGS="-kernel shell_history enabled"

                  echo "Chironium dev shell ready — Elixir $(elixir --short-version), OTP $(erl -noshell -eval 'io:format("~s", [erlang:system_info(otp_release)]), halt().')"
                '';
              }
            ];
          };
        }
      );
    };
}
