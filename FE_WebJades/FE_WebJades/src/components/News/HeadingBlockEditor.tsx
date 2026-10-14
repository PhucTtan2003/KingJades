import React from "react";
import type { NewsBlock } from "../../../types";

type MoveDirection = -1 | 1;

type Props = {
  block: NewsBlock;
  index: number;
  total: number;
  onChange: (next: NewsBlock) => void;
  onMove: (direction: MoveDirection) => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

const HEADING_LEVELS = [
  {
    level: 2,
    label: "Header 1",
    hint: "Mục lớn: 1, 2, 3...",
  },
  {
    level: 3,
    label: "Header 2",
    hint: "Mục con: 1.1, 1.2...",
  },
  {
    level: 4,
    label: "Header 3",
    hint: "Mục con: 1.1.1...",
  },
  {
    level: 5,
    label: "Header 4",
    hint: "Mục sâu: 1.1.1.1...",
  },
] as const;

const HeadingBlockEditor: React.FC<Props> = ({
  block,
  index,
  total,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}) => {
  const content =
    block.content as Record<
      string,
      unknown
    >;

  const text = String(
    content?.text || ""
  );

  const rawLevel =
    Number(content?.level) || 2;

  const level = Math.min(
    5,
    Math.max(2, rawLevel)
  );

  const updateContent = (
    patch: Record<string, unknown>
  ) => {
    onChange({
      ...block,
      content: {
        ...block.content,
        ...patch,
      },
    });
  };

  const updateResponsive = (
    key:
      | "hideOnDesktop"
      | "hideOnTablet"
      | "hideOnMobile",
    value: boolean
  ) => {
    onChange({
      ...block,
      responsive: {
        ...block.responsive,
        [key]: value,
      },
    });
  };

  return (
    <article className="news-block-editor news-heading-block-editor">
      <header>
        <div>
          <small>
            HEADING {index + 1}
          </small>

          <strong>
            Tiêu đề & mục lục
          </strong>
        </div>

        <div className="news-block-actions">
          <button
            type="button"
            title="Di chuyển lên"
            disabled={index === 0}
            onClick={() =>
              onMove(-1)
            }
          >
            ↑
          </button>

          <button
            type="button"
            title="Di chuyển xuống"
            disabled={
              index === total - 1
            }
            onClick={() =>
              onMove(1)
            }
          >
            ↓
          </button>

          <button
            type="button"
            title="Nhân bản"
            onClick={onDuplicate}
          >
            ⧉
          </button>

          <button
            type="button"
            title="Xóa"
            className="danger"
            onClick={onRemove}
          >
            ×
          </button>
        </div>
      </header>

      <div className="news-block-body">
        <div className="news-heading-level-picker">
          {HEADING_LEVELS.map(
            (item) => (
              <button
                key={item.level}
                type="button"
                className={
                  level === item.level
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  updateContent({
                    level:
                      item.level,
                  })
                }
              >
                <b>
                  {item.label}
                </b>

                <small>
                  H{item.level}
                </small>
              </button>
            )
          )}
        </div>

        <div className="news-heading-level-note">
          {
            HEADING_LEVELS.find(
              (item) =>
                item.level === level
            )?.hint
          }
        </div>

        <label className="news-heading-input">
          Nội dung Header

          <input
            value={text}
            onChange={(event) =>
              updateContent({
                text:
                  event.target.value,
              })
            }
            placeholder="Ví dụ: Ứng dụng của ngọc Phỉ Thúy"
          />
        </label>

        <div className="news-heading-toc-preview">
          <span>
            MỤC LỤC
          </span>

          <p>
            Header này sẽ tự xuất hiện
            trong mục lục ngoài website.
            Người đọc click vào mục tương
            ứng sẽ cuộn xuống đúng phần này.
          </p>
        </div>

        <details>
          <summary>
            Hiển thị theo thiết bị
          </summary>

          <div className="news-word-responsive__grid">
            <label>
              <input
                type="checkbox"
                checked={
                  Boolean(
                    block.responsive
                      ?.hideOnDesktop
                  )
                }
                onChange={(event) =>
                  updateResponsive(
                    "hideOnDesktop",
                    event.target.checked
                  )
                }
              />
              Ẩn Desktop
            </label>

            <label>
              <input
                type="checkbox"
                checked={
                  Boolean(
                    block.responsive
                      ?.hideOnTablet
                  )
                }
                onChange={(event) =>
                  updateResponsive(
                    "hideOnTablet",
                    event.target.checked
                  )
                }
              />
              Ẩn Tablet
            </label>

            <label>
              <input
                type="checkbox"
                checked={
                  Boolean(
                    block.responsive
                      ?.hideOnMobile
                  )
                }
                onChange={(event) =>
                  updateResponsive(
                    "hideOnMobile",
                    event.target.checked
                  )
                }
              />
              Ẩn Mobile
            </label>
          </div>
        </details>
      </div>
    </article>
  );
};

export default HeadingBlockEditor;
