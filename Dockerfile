# Debian rather than Alpine, whose DNS resolution fails in production. mise
# installs the toolchain of mise.toml. Renovate moves the image digest and
# MISE_VERSION.
ARG IMAGE=debian:13-slim@sha256:8aa5a7bf5a1955bddbe7d74fcdd0b91ab30e74362a8b73af672b0481b35b44a0

FROM ${IMAGE} AS builder

# install build dependencies
RUN apt-get update -y && apt-get install -y --no-install-recommends sudo curl git ca-certificates build-essential libncurses-dev libssl-dev \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

# prepare mise to install node and elixir
# https://mise.jdx.dev/mise-cookbook/docker.html
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
ENV MISE_DATA_DIR="/mise"
ENV MISE_CONFIG_DIR="/mise"
ENV MISE_CACHE_DIR="/mise/cache"
ENV MISE_INSTALL_PATH="/usr/local/bin/mise"
ENV PATH="/mise/shims:$PATH"
# renovate: datasource=github-releases depName=jdx/mise
ENV MISE_VERSION="v2026.11.9"
RUN curl -fsSL https://mise.run | sh

# prepare build dir
WORKDIR /app

# install mise and everything
COPY mise.toml mise.toml
RUN mise trust mise.toml && mise install

# install hex + rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# set build ENV
ENV MIX_ENV="prod"

# install mix dependencies
COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV
RUN mkdir config

# copy compile-time config files before we compile dependencies
# to ensure any relevant config change will trigger the dependencies
# to be re-compiled.
COPY config/config.exs config/${MIX_ENV}.exs config/
RUN mix deps.compile

COPY lib lib
COPY priv priv
RUN mix ash.codegen

# install node deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY assets assets
# Use --frozen-lockfile for reproducible builds. Skip lifecycle scripts: the only one is
# the root `lefthook install`, which fails without a .git directory.
RUN pnpm install --frozen-lockfile --ignore-scripts

# Regenerate gql.tada introspection types from schema
RUN pnpm --dir assets gql:generate

# Compile the release
RUN mix compile

# compile assets
RUN mix assets.build

# Changes to config/runtime.exs don't require recompiling the code
COPY config/runtime.exs config/

COPY rel rel
RUN mix release

# start a new build stage so that the final image will only contain
# the compiled release and other runtime necessities
FROM ${IMAGE}

RUN apt-get update -y && \
  apt-get install -y libstdc++6 openssl libncurses6 locales ca-certificates \
  && apt-get clean && rm -f /var/lib/apt/lists/*_*

# Set the locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

WORKDIR "/app"
RUN chown nobody /app

# set runner ENV
ENV MIX_ENV="prod"

# Only copy the final release from the build stage
COPY --from=builder --chown=nobody:root /app/_build/${MIX_ENV}/rel/chironium ./

USER nobody

# If using an environment that doesn't automatically reap zombie processes, it is
# advised to add an init process such as tini via `apt-get install`
# above and adding an entrypoint. See https://github.com/krallin/tini for details
# ENTRYPOINT ["/tini", "--"]

CMD ["/app/bin/server"]
