import React from "react";
import type { NewsBlock } from "../../../types";
import {
  absoluteAssetUrl,
} from "../../utils/utils";
import {
  richValueOrPlain,
  sanitizeNewsInlineHtml,
  sanitizeNewsRichHtml,
} from "../../utils/newsRichText";

const youtubeEmbed = (
  url: string
) => {
  try {
    const parsed =
      new URL(url);

    if (
      parsed.hostname.includes(
        "youtu.be"
      )
    ) {
      return `https://www.youtube.com/embed/${parsed.pathname.slice(
        1
      )}`;
    }

    const id =
      parsed.searchParams.get(
        "v"
      );

    if (id) {
      return `https://www.youtube.com/embed/${id}`;
    }

    return parsed.pathname.includes(
      "/embed/"
    )
      ? url
      : "";
  } catch {
    return "";
  }
};

const renderRichHtml = (
  richValue: unknown,
  plainValue: unknown
) => ({
  __html:
    sanitizeNewsRichHtml(
      richValueOrPlain(
        richValue,
        plainValue
      )
    ),
});

const renderInlineRichHtml = (
  richValue: unknown,
  plainValue: unknown
) => ({
  __html:
    sanitizeNewsInlineHtml(
      richValueOrPlain(
        richValue,
        plainValue
      )
    ),
});

const NewsBlockRenderer: React.FC<{
  block: NewsBlock;
  device?: "desktop" | "mobile";
}> = ({
  block,
  device = "desktop",
}) => {
  if (
    (
      device === "desktop" &&
      block.responsive
        .hideOnDesktop
    ) ||
    (
      device === "mobile" &&
      block.responsive
        .hideOnMobile
    )
  ) {
    return null;
  }

  const style:
    React.CSSProperties = {
    textAlign:
      (
        block.settings
          .textAlign as
          React.CSSProperties["textAlign"]
      ) || "left",
    background:
      String(
        block.settings
          .backgroundColor ||
          ""
      ) || undefined,
    padding:
      Number(
        block.settings
          .padding || 0
      ) || undefined,
    borderRadius:
      Number(
        block.settings
          .borderRadius ||
          0
      ) || undefined,
  };

  if (
    block.type ===
    "Heading"
  ) {
    const html =
      renderInlineRichHtml(
        block.content
          .textHtml,
        block.content
          .text
      );

    const level =
      Math.min(
        5,
        Math.max(
          2,
          Number(
            block.content
              .level || 2
          )
        )
      );

    if (
      level === 3
    ) {
      return (
        <h3
          className="news-render-heading news-rich-html"
          style={style}
          dangerouslySetInnerHTML={
            html
          }
        />
      );
    }

    if (
      level === 4
    ) {
      return (
        <h4
          className="news-render-heading news-rich-html"
          style={style}
          dangerouslySetInnerHTML={
            html
          }
        />
      );
    }

    if (
      level === 5
    ) {
      return (
        <h5
          className="news-render-heading news-rich-html"
          style={style}
          dangerouslySetInnerHTML={
            html
          }
        />
      );
    }

    return (
      <h2
        className="news-render-heading news-rich-html"
        style={style}
        dangerouslySetInnerHTML={
          html
        }
      />
    );
  }

  if (
    block.type ===
    "Text"
  ) {
    return (
      <div
        className="news-render-richtext news-rich-html"
        style={style}
        dangerouslySetInnerHTML={{
          __html:
            sanitizeNewsRichHtml(
              String(
                block.content
                  .html || ""
              )
            ),
        }}
      />
    );
  }

  if (
    block.type ===
    "Image"
  ) {
    const src =
      absoluteAssetUrl(
        String(
          block.content
            .imageUrl || ""
        )
      );

    if (!src) {
      return null;
    }

    const captionHtml =
      richValueOrPlain(
        block.content
          .captionHtml,
        block.content
          .caption
      );

    return (
      <figure
        className="news-render-image"
        style={style}
      >
        <img
          src={src}
          alt={String(
            block.content
              .alt || ""
          )}
          title={
            String(
              block.content
                .imageTitle || ""
            ) || undefined
          }
        />

        {captionHtml ? (
          <figcaption
            className="news-rich-html"
            dangerouslySetInnerHTML={{
              __html:
                sanitizeNewsRichHtml(
                  captionHtml
                ),
            }}
          />
        ) : null}

        {block.content.imageDescription ? (
          <p className="news-image-seo-description">
            {String(
              block.content.imageDescription
            )}
          </p>
        ) : null}
      </figure>
    );
  }

  if (
    block.type ===
    "ImageText"
  ) {
    const src =
      absoluteAssetUrl(
        String(
          block.content
            .imageUrl || ""
        )
      );

    const right =
      String(
        block.content
          .imagePosition ||
          "left"
      ) === "right";

    return (
      <section
        className={`news-render-image-text ${
          right
            ? "image-right"
            : ""
        }`}
        style={style}
      >
        <div className="news-render-image-text-media">
          {src ? (
            <img
              src={src}
              alt={String(
                block.content
                  .alt || ""
              )}
              title={
                String(
                  block.content
                    .imageTitle || ""
                ) || undefined
              }
            />
          ) : (
            <span>KJ</span>
          )}
          {block.content.caption ||
          block.content.captionHtml ||
          block.content.imageDescription ? (
            <div className="news-image-text-seo-meta">
              {block.content.caption ||
              block.content.captionHtml ? (
                <div
                  className="news-rich-html news-image-text-caption"
                  dangerouslySetInnerHTML={{
                    __html:
                      sanitizeNewsRichHtml(
                        richValueOrPlain(
                          block.content
                            .captionHtml,
                          block.content
                            .caption
                        )
                      ),
                  }}
                />
              ) : null}

              {block.content
                .imageDescription ? (
                <p className="news-image-seo-description">
                  {String(
                    block.content
                      .imageDescription
                  )}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="news-render-image-text-copy">
          <h3
            className="news-rich-html"
            dangerouslySetInnerHTML={
              renderInlineRichHtml(
                block.content
                  .titleHtml,
                block.content
                  .title
              )
            }
          />

          <div
            className="news-rich-html news-render-image-text-description"
            dangerouslySetInnerHTML={
              renderRichHtml(
                block.content
                  .descriptionHtml,
                block.content
                  .description
              )
            }
          />
        </div>
      </section>
    );
  }

  if (
    block.type ===
    "Quote"
  ) {
    return (
      <blockquote
        className="news-render-quote"
        style={style}
      >
        <div className="news-render-quote-text">
          <span
            aria-hidden="true"
            className="news-render-quote-mark"
          >
            “
          </span>

          <div
            className="news-rich-html"
            dangerouslySetInnerHTML={
              renderRichHtml(
                block.content
                  .quoteHtml,
                block.content
                  .quote
              )
            }
          />

          <span
            aria-hidden="true"
            className="news-render-quote-mark"
          >
            ”
          </span>
        </div>

        {block.content
          .author ? (
          <cite>
            {String(
              block.content
                .author
            )}
          </cite>
        ) : null}
      </blockquote>
    );
  }

  if (
    block.type ===
    "Callout"
  ) {
    return (
      <aside
        className={`news-render-callout tone-${String(
          block.content
            .tone || "info"
        )}`}
        style={style}
      >
        <strong
          className="news-rich-html"
          dangerouslySetInnerHTML={
            renderInlineRichHtml(
              block.content
                .titleHtml,
              block.content
                .title
            )
          }
        />

        <div
          className="news-rich-html news-render-callout-text"
          dangerouslySetInnerHTML={
            renderRichHtml(
              block.content
                .textHtml,
              block.content
                .text
            )
          }
        />
      </aside>
    );
  }

  if (
    block.type ===
    "Button"
  ) {
    const newTab =
      Boolean(
        block.content
          .openInNewTab
      );

    return (
      <div
        className="news-render-button-wrap"
        style={style}
      >
        <a
          className="news-render-button news-rich-html"
          href={String(
            block.content
              .url || "#"
          )}
          target={
            newTab
              ? "_blank"
              : undefined
          }
          rel={
            newTab
              ? "noopener noreferrer"
              : undefined
          }
          dangerouslySetInnerHTML={
            renderInlineRichHtml(
              block.content
                .textHtml,
              block.content
                .text ||
                "Xem thêm"
            )
          }
        />
      </div>
    );
  }

  if (
    block.type ===
    "Video"
  ) {
    const src =
      youtubeEmbed(
        String(
          block.content
            .url || ""
        )
      );

    return src ? (
      <div
        className="news-render-video"
        style={style}
      >
        <iframe
          src={src}
          title={String(
            block.content
              .title ||
              "Video"
          )}
          allowFullScreen
        />
      </div>
    ) : null;
  }

  if (
    block.type ===
    "Divider"
  ) {
    return (
      <hr className="news-render-divider" />
    );
  }

  return null;
};

export default NewsBlockRenderer;
