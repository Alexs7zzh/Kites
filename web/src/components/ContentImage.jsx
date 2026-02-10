import React from "react";

function toDimension(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return Math.round(value);
}

function normalizeSource(source) {
  if (!source || typeof source !== "object") {
    return null;
  }

  if (typeof source.srcSet !== "string" || source.srcSet === "") {
    return null;
  }

  const type =
    source.type === "image/avif" || source.type === "image/webp"
      ? source.type
      : undefined;

  return {
    srcSet: source.srcSet,
    type,
  };
}

function normalizeImagePayload(image) {
  if (!image || typeof image !== "object") {
    return null;
  }

  const fallbackSrc =
    typeof image.fallbackSrc === "string" ? image.fallbackSrc : "";
  if (!fallbackSrc) {
    return null;
  }

  const sources = Array.isArray(image.sources)
    ? image.sources.map(normalizeSource).filter(Boolean)
    : [];
  const width = toDimension(image.width);
  const height = toDimension(image.height);
  const hasIntrinsicSize = width !== undefined && height !== undefined;

  return {
    fallbackSrc,
    alt: typeof image.alt === "string" ? image.alt : "",
    sizes: typeof image.sizes === "string" ? image.sizes : undefined,
    width: hasIntrinsicSize ? width : undefined,
    height: hasIntrinsicSize ? height : undefined,
    loading: image.loading === "eager" ? "eager" : "lazy",
    decoding: image.decoding === "sync" ? "sync" : "async",
    fetchPriority: image.fetchPriority === "high" ? "high" : "auto",
    sources,
  };
}

export default function ContentImage({ image, className, style }) {
  const normalizedImage = normalizeImagePayload(image);
  if (!normalizedImage) {
    return null;
  }

  const wrapperStyle = {
    display: "block",
    ...(style || {}),
  };

  return (
    <picture className={className} style={wrapperStyle}>
      {normalizedImage.sources.map((source, index) => (
        <source
          key={`${source.type ?? "source"}-${index}`}
          srcSet={source.srcSet}
          type={source.type}
          sizes={normalizedImage.sizes}
        />
      ))}
      <img
        src={normalizedImage.fallbackSrc}
        alt={normalizedImage.alt}
        width={normalizedImage.width}
        height={normalizedImage.height}
        loading={normalizedImage.loading}
        decoding={normalizedImage.decoding}
        fetchPriority={normalizedImage.fetchPriority}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </picture>
  );
}
