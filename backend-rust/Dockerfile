# Use Rust on Alpine as builder
FROM rust:1.86-alpine AS builder

# Accept target triple as build argument
ARG TARGET=aarch64-unknown-linux-musl

# Make TARGET available for later RUN steps
ENV TARGET=${TARGET}

# Install required build tools
RUN apk add --no-cache libc-dev musl-dev build-base

# Add the musl target
RUN rustup target add ${TARGET}

WORKDIR /app

# Copy manifest files for caching deps
COPY Cargo.toml Cargo.lock ./

# Cache dependencies
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release --locked --target ${TARGET}

# Copy actual source
COPY src ./src

# Build final binary
RUN rm -f target/${TARGET}/release/deps/app* && \
    cargo build --release --locked --target ${TARGET} --bin userapi


# -- Final stage: minimal image --
FROM gcr.io/distroless/static-debian12:nonroot AS final

# Accept target triple as build argument
ARG TARGET=aarch64-unknown-linux-musl
ENV TARGET=${TARGET}

# Set non-root user (inherited from distroless)
USER nonroot:nonroot
WORKDIR /app

# Copy built binary
COPY --from=builder --chown=nonroot:nonroot /app/target/${TARGET}/release/userapi .

# Optional runtime assets
# COPY --from=builder --chown=nonroot:nonroot /app/docs ./docs

ENV PORT=8080
EXPOSE $PORT

CMD ["./userapi", "-vvv"]
