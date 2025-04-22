#syntax=docker/dockerfile:1.13
FROM node:22-alpine
ARG COLIBRI_VERSION=""
ENV COLIBRI_VERSION="${COLIBRI_VERSION:-}"
ARG NODE_ENV="production"
ENV NODE_ENV="${NODE_ENV}"

RUN <<EOF
  set -eux

  # Install Colibri CLI
  npm install --global "@colibri-hq/colibri-cli${COLIBRI_VERSION:+@${COLIBRI_VERSION}}" \
    --prefer-offline \
    --unsafe-perm \
    --no-audit

  # Create a non-root user
  addgroup --system colibri
  adduser \
      --home /home/colibri \
      --ingroup colibri \
      --system \
    colibri
  mkdir -p /home/colibri/.config/colibri
  chown -R colibri:colibri /home/colibri/.config/colibri
  chmod -R 700 /home/colibri/.config/colibri

  # Clean up
  rm -rf /tmp/*
EOF

USER colibri:colibri
WORKDIR /home/colibri
VOLUME [ "/home/colibri/.config/colibri" ]
ENTRYPOINT [ "colibri" ]
CMD [ "--help" ]
