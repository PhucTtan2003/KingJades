import React from "react";
import type { NewsBlock } from "../../../types";
import { adminNewsApi } from "../../api/newsApi";
import {
  absoluteAssetUrl,
  getErrorMessage,
} from "../../utils/utils";
import WordRichTextField from "./WordRichTextField";

type Props = {
  block: NewsBlock;
  index: number;
  total: number;
  onChange: (block: NewsBlock) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

const NewsBlockEditor: React.FC<Props> = ({
  block,
  index,
  total,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}) => {
  const [
    uploading,
    setUploading,
  ] =
    React.useState(false);

  const [
    error,
    setError,
  ] =
    React.useState("");

  const setContent = (
    key: string,
    value: unknown
  ) =>
    onChange({
      ...block,
      content: {
        ...block.content,
        [key]: value,
      },
    });

  const setRichContent = (
    htmlKey: string,
    plainKey: string | null,
    html: string,
    plainText: string
  ) =>
    onChange({
      ...block,
      content: {
        ...block.content,
        [htmlKey]: html,
        ...(plainKey
          ? {
              [plainKey]:
                plainText,
            }
          : {}),
      },
    });

  const setSettings = (
    key: string,
    value: unknown
  ) =>
    onChange({
      ...block,
      settings: {
        ...block.settings,
        [key]: value,
      },
    });

  const upload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    setUploading(true);
    setError("");

    try {
      setContent(
        "imageUrl",
        await adminNewsApi.uploadImage(
          file
        )
      );
    } catch (uploadError) {
      setError(
        getErrorMessage(
          uploadError,
          "Upload ảnh thất bại."
        )
      );
    } finally {
      setUploading(false);
    }
  };

  const getImageSeoScore = () => {
    const values = [
      String(
        block.content.alt || ""
      ).trim(),
      String(
        block.content.imageTitle || ""
      ).trim(),
      String(
        block.content.imageDescription || ""
      ).trim(),
      String(
        block.content.caption || ""
      ).trim(),
    ];

    return values.filter(Boolean).length;
  };

  const copyAltToImageSeo = () => {
    const alt = String(
      block.content.alt || ""
    ).trim();

    if (!alt) {
      setError(
        "Hãy nhập Alt Text trước để tạo nhanh metadata ảnh."
      );

      return;
    }

    onChange({
      ...block,
      content: {
        ...block.content,
        imageTitle:
          String(
            block.content.imageTitle || ""
          ).trim() || alt,
        imageDescription:
          String(
            block.content.imageDescription || ""
          ).trim() ||
          `Hình ảnh ${alt} tại King Jades.`,
        caption:
          String(
            block.content.caption || ""
          ).trim() || alt,
      },
    });

    setError("");
  };

  const richValue = (
    htmlKey: string,
    plainKey: string
  ) => {
    const html = String(
      block.content[
        htmlKey
      ] || ""
    ).trim();

    if (html) {
      return html;
    }

    return String(
      block.content[
        plainKey
      ] || ""
    );
  };

  const fields = () => {
    if (
      block.type ===
      "Heading"
    ) {
      return (
        <div className="news-form-stack">
          <div className="news-form-grid two">
            <label>
              Cấp Header
              <select
                value={Number(
                  block.content
                    .level || 2
                )}
                onChange={(
                  event
                ) =>
                  setContent(
                    "level",
                    Number(
                      event.target
                        .value
                    )
                  )
                }
              >
                <option value={2}>
                  Header 1 · H2
                </option>

                <option value={3}>
                  Header 2 · H3
                </option>

                <option value={4}>
                  Header 3 · H4
                </option>

                <option value={5}>
                  Header 4 · H5
                </option>
              </select>
            </label>

            <div className="news-heading-toc-preview">
              <span>
                MỤC LỤC
              </span>

              <p>
                Header sẽ tự xuất hiện trong mục lục.
                Click mục lục ngoài website sẽ nhảy
                xuống đúng Header này.
              </p>
            </div>
          </div>

          <WordRichTextField
            label="Nội dung Header"
            value={richValue(
              "textHtml",
              "text"
            )}
            compact
            minHeight={72}
            allowLists={false}
            onChange={(
              html,
              plainText
            ) =>
              setRichContent(
                "textHtml",
                "text",
                html,
                plainText
              )
            }
            placeholder="Nhập tiêu đề mục..."
          />
        </div>
      );
    }

    if (
      block.type ===
      "Text"
    ) {
      return (
        <WordRichTextField
          label="Nội dung"
          value={String(
            block.content
              .html || ""
          )}
          minHeight={220}
          onChange={(
            html
          ) =>
            setRichContent(
              "html",
              null,
              html,
              ""
            )
          }
          placeholder="Nhập nội dung bài viết..."
        />
      );
    }

    if (
      block.type ===
      "Image"
    ) {
      return (
        <div className="news-form-stack">
          <div className="news-form-grid two">
            <label>
              URL ảnh
              <input
                value={String(
                  block.content
                    .imageUrl || ""
                )}
                onChange={(
                  event
                ) =>
                  setContent(
                    "imageUrl",
                    event.target
                      .value
                  )
                }
              />
            </label>

            <label className="news-upload">
              Upload
              <input
                type="file"
                accept="image/*"
                onChange={upload}
              />

              <span>
                {uploading
                  ? "Đang tải..."
                  : "Chọn ảnh"}
              </span>
            </label>
          </div>

          {block.content
            .imageUrl ? (
            <img
              className="news-block-thumb"
              src={absoluteAssetUrl(
                String(
                  block.content
                    .imageUrl
                )
              )}
              alt=""
            />
          ) : null}

          <section className="news-image-seo-card">
            <div className="news-image-seo-card__head">
              <div>
                <span>SEO HÌNH ẢNH</span>
                <strong>
                  Thông tin ảnh
                </strong>
              </div>

              <div className="news-image-seo-card__actions">
                <em>
                  {getImageSeoScore()}/4
                </em>

                <button
                  type="button"
                  onClick={copyAltToImageSeo}
                >
                  Tạo nhanh từ Alt
                </button>
              </div>
            </div>

            <div className="news-form-grid two">
              <label>
                Alt Text
                <input
                  value={String(
                    block.content.alt || ""
                  )}
                  onChange={(event) =>
                    setContent(
                      "alt",
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Vòng Phỉ Thúy King Jades"
                />
                <small>
                  Mô tả nội dung ảnh cho Google và accessibility.
                </small>
              </label>

              <label>
                Image Title
                <input
                  value={String(
                    block.content.imageTitle || ""
                  )}
                  onChange={(event) =>
                    setContent(
                      "imageTitle",
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Vòng Phỉ Thúy"
                />
                <small>
                  Dùng làm thuộc tính title của ảnh.
                </small>
              </label>
            </div>

            <label>
              Image Description
              <textarea
                rows={4}
                value={String(
                  block.content.imageDescription || ""
                )}
                onChange={(event) =>
                  setContent(
                    "imageDescription",
                    event.target.value
                  )
                }
                placeholder="Mô tả rõ ảnh, sản phẩm hoặc bối cảnh xuất hiện trong bài viết."
              />
              <small>
                Description được render dưới ảnh để Google có thêm ngữ cảnh.
              </small>
            </label>

            <WordRichTextField
              label="Caption"
              value={richValue(
                "captionHtml",
                "caption"
              )}
              compact
              minHeight={82}
              onChange={(
                html,
                plainText
              ) =>
                setRichContent(
                  "captionHtml",
                  "caption",
                  html,
                  plainText
                )
              }
              placeholder="Nhập chú thích ảnh..."
            />
          </section>
        </div>
      );
    }

    if (
      block.type ===
      "ImageText"
    ) {
      return (
        <div className="news-form-stack">
          <div className="news-form-grid two">
            <label>
              URL ảnh
              <input
                value={String(
                  block.content
                    .imageUrl || ""
                )}
                onChange={(
                  event
                ) =>
                  setContent(
                    "imageUrl",
                    event.target
                      .value
                  )
                }
              />
            </label>

            <label className="news-upload">
              Upload
              <input
                type="file"
                accept="image/*"
                onChange={upload}
              />

              <span>
                {uploading
                  ? "Đang tải..."
                  : "Chọn ảnh"}
              </span>
            </label>
          </div>

          {block.content
            .imageUrl ? (
            <img
              className="news-block-thumb"
              src={absoluteAssetUrl(
                String(
                  block.content
                    .imageUrl
                )
              )}
              alt=""
            />
          ) : null}

          <label>
            Vị trí ảnh
            <select
              value={String(
                block.content
                  .imagePosition ||
                  "left"
              )}
              onChange={(
                event
              ) =>
                setContent(
                  "imagePosition",
                  event.target
                    .value
                )
              }
            >
              <option value="left">
                Trái
              </option>

              <option value="right">
                Phải
              </option>
            </select>
          </label>

          <section className="news-image-seo-card">
            <div className="news-image-seo-card__head">
              <div>
                <span>SEO HÌNH ẢNH</span>
                <strong>
                  Thông tin ảnh
                </strong>
              </div>

              <div className="news-image-seo-card__actions">
                <em>
                  {getImageSeoScore()}/4
                </em>

                <button
                  type="button"
                  onClick={copyAltToImageSeo}
                >
                  Tạo nhanh từ Alt
                </button>
              </div>
            </div>

            <div className="news-form-grid two">
              <label>
                Alt Text
                <input
                  value={String(
                    block.content.alt || ""
                  )}
                  onChange={(event) =>
                    setContent(
                      "alt",
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Vòng Phỉ Thúy King Jades"
                />
                <small>
                  Mô tả nội dung ảnh cho Google và accessibility.
                </small>
              </label>

              <label>
                Image Title
                <input
                  value={String(
                    block.content.imageTitle || ""
                  )}
                  onChange={(event) =>
                    setContent(
                      "imageTitle",
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Vòng Phỉ Thúy"
                />
                <small>
                  Dùng làm thuộc tính title của ảnh.
                </small>
              </label>
            </div>

            <label>
              Image Description
              <textarea
                rows={4}
                value={String(
                  block.content.imageDescription || ""
                )}
                onChange={(event) =>
                  setContent(
                    "imageDescription",
                    event.target.value
                  )
                }
                placeholder="Mô tả rõ ảnh, sản phẩm hoặc bối cảnh xuất hiện trong bài viết."
              />
              <small>
                Description được render dưới ảnh để Google có thêm ngữ cảnh.
              </small>
            </label>

            <WordRichTextField
              label="Caption"
              value={richValue(
                "captionHtml",
                "caption"
              )}
              compact
              minHeight={82}
              onChange={(
                html,
                plainText
              ) =>
                setRichContent(
                  "captionHtml",
                  "caption",
                  html,
                  plainText
                )
              }
              placeholder="Nhập chú thích ảnh..."
            />
          </section>

          <WordRichTextField
            label="Tiêu đề"
            value={richValue(
              "titleHtml",
              "title"
            )}
            compact
            minHeight={72}
            allowLists={false}
            onChange={(
              html,
              plainText
            ) =>
              setRichContent(
                "titleHtml",
                "title",
                html,
                plainText
              )
            }
            placeholder="Nhập tiêu đề..."
          />

          <WordRichTextField
            label="Mô tả"
            value={richValue(
              "descriptionHtml",
              "description"
            )}
            minHeight={150}
            onChange={(
              html,
              plainText
            ) =>
              setRichContent(
                "descriptionHtml",
                "description",
                html,
                plainText
              )
            }
            placeholder="Nhập mô tả..."
          />
        </div>
      );
    }

    if (
      block.type ===
      "Quote"
    ) {
      return (
        <div className="news-form-stack">
          <WordRichTextField
            label="Trích dẫn"
            value={richValue(
              "quoteHtml",
              "quote"
            )}
            minHeight={130}
            onChange={(
              html,
              plainText
            ) =>
              setRichContent(
                "quoteHtml",
                "quote",
                html,
                plainText
              )
            }
            placeholder="Nhập nội dung trích dẫn..."
          />

          <label>
            Tác giả
            <input
              value={String(
                block.content
                  .author || ""
              )}
              onChange={(
                event
              ) =>
                setContent(
                  "author",
                  event.target
                    .value
                )
              }
            />
          </label>
        </div>
      );
    }

    if (
      block.type ===
      "Callout"
    ) {
      return (
        <div className="news-form-stack">
          <label>
            Kiểu
            <select
              value={String(
                block.content
                  .tone || "info"
              )}
              onChange={(
                event
              ) =>
                setContent(
                  "tone",
                  event.target
                    .value
                )
              }
            >
              <option value="info">
                Thông tin
              </option>

              <option value="success">
                Tích cực
              </option>

              <option value="warning">
                Lưu ý
              </option>
            </select>
          </label>

          <WordRichTextField
            label="Tiêu đề"
            value={richValue(
              "titleHtml",
              "title"
            )}
            compact
            minHeight={72}
            allowLists={false}
            onChange={(
              html,
              plainText
            ) =>
              setRichContent(
                "titleHtml",
                "title",
                html,
                plainText
              )
            }
            placeholder="Nhập tiêu đề nổi bật..."
          />

          <WordRichTextField
            label="Nội dung"
            value={richValue(
              "textHtml",
              "text"
            )}
            minHeight={140}
            onChange={(
              html,
              plainText
            ) =>
              setRichContent(
                "textHtml",
                "text",
                html,
                plainText
              )
            }
            placeholder="Nhập nội dung callout..."
          />
        </div>
      );
    }

    if (
      block.type ===
      "Button"
    ) {
      return (
        <div className="news-form-stack">
          <WordRichTextField
            label="Nội dung nút"
            value={richValue(
              "textHtml",
              "text"
            )}
            compact
            minHeight={68}
            allowLists={false}
            allowLinks={false}
            allowAlignment={false}
            onChange={(
              html,
              plainText
            ) =>
              setRichContent(
                "textHtml",
                "text",
                html,
                plainText
              )
            }
            placeholder="Ví dụ: Xem bộ sưu tập"
          />

          <div className="news-form-grid two">
            <label>
              Liên kết
              <input
                value={String(
                  block.content
                    .url || ""
                )}
                onChange={(
                  event
                ) =>
                  setContent(
                    "url",
                    event.target
                      .value
                  )
                }
              />
            </label>

            <label className="news-inline-checkbox">
              <input
                type="checkbox"
                checked={Boolean(
                  block.content
                    .openInNewTab
                )}
                onChange={(
                  event
                ) =>
                  setContent(
                    "openInNewTab",
                    event.target
                      .checked
                  )
                }
              />
              Mở tab mới
            </label>
          </div>
        </div>
      );
    }

    if (
      block.type ===
      "Video"
    ) {
      return (
        <div className="news-form-grid two">
          <label>
            URL YouTube
            <input
              value={String(
                block.content
                  .url || ""
              )}
              onChange={(
                event
              ) =>
                setContent(
                  "url",
                  event.target
                    .value
                )
              }
            />
          </label>

          <label>
            Tiêu đề video
            <input
              value={String(
                block.content
                  .title || ""
              )}
              onChange={(
                event
              ) =>
                setContent(
                  "title",
                  event.target
                    .value
                )
              }
              placeholder="Dùng cho accessibility của iframe"
            />
          </label>
        </div>
      );
    }

    return (
      <p className="news-muted">
        Đường phân cách không cần
        nội dung.
      </p>
    );
  };

  return (
    <article className="news-block-editor">
      <header>
        <div>
          <small>
            BLOCK{" "}
            {String(
              index + 1
            ).padStart(
              2,
              "0"
            )}
          </small>

          <strong>
            {block.type}
          </strong>
        </div>

        <div className="news-block-actions">
          <button
            type="button"
            disabled={
              index === 0
            }
            onClick={() =>
              onMove(-1)
            }
          >
            ↑
          </button>

          <button
            type="button"
            disabled={
              index ===
              total - 1
            }
            onClick={() =>
              onMove(1)
            }
          >
            ↓
          </button>

          <button
            type="button"
            onClick={
              onDuplicate
            }
          >
            ⧉
          </button>

          <button
            type="button"
            className="danger"
            onClick={onRemove}
          >
            ×
          </button>
        </div>
      </header>

      <div className="news-block-body">
        {fields()}

        {error ? (
          <div className="news-alert error">
            {error}
          </div>
        ) : null}

        <details>
          <summary>
            Giao diện block
          </summary>

          <div className="news-form-grid four">
            <label>
              Căn
              <select
                value={String(
                  block.settings
                    .textAlign ||
                    "left"
                )}
                onChange={(
                  event
                ) =>
                  setSettings(
                    "textAlign",
                    event.target
                      .value
                  )
                }
              >
                <option value="left">
                  Trái
                </option>

                <option value="center">
                  Giữa
                </option>

                <option value="right">
                  Phải
                </option>

                <option value="justify">
                  Căn đều
                </option>
              </select>
            </label>

            <label>
              Màu nền
              <input
                type="color"
                value={String(
                  block.settings
                    .backgroundColor ||
                    "#ffffff"
                )}
                onChange={(
                  event
                ) =>
                  setSettings(
                    "backgroundColor",
                    event.target
                      .value
                  )
                }
              />
            </label>

            <label>
              Padding
              <input
                type="number"
                min={0}
                max={80}
                value={Number(
                  block.settings
                    .padding || 0
                )}
                onChange={(
                  event
                ) =>
                  setSettings(
                    "padding",
                    Number(
                      event.target
                        .value
                    )
                  )
                }
              />
            </label>

            <label>
              Bo góc
              <input
                type="number"
                min={0}
                max={48}
                value={Number(
                  block.settings
                    .borderRadius ||
                    0
                )}
                onChange={(
                  event
                ) =>
                  setSettings(
                    "borderRadius",
                    Number(
                      event.target
                        .value
                    )
                  )
                }
              />
            </label>
          </div>
        </details>
      </div>
    </article>
  );
};

export default NewsBlockEditor;
