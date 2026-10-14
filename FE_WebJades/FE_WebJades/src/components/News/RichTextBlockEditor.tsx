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

type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
};

const ALLOWED_TAGS = new Set([
  "P",
  "DIV",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "S",
  "STRIKE",
  "A",
  "UL",
  "OL",
  "LI",
  "SPAN",
  "BLOCKQUOTE",
  "FONT",
]);

const ALLOWED_STYLE_PROPERTIES = new Set([
  "text-align",
  "font-weight",
  "font-style",
  "text-decoration",
  "color",
  "background-color",
]);

const normalizeUrl = (raw: string) => {
  const value = raw.trim();

  if (!value) {
    return "";
  }

  if (
    value.startsWith("/") ||
    value.startsWith("#") ||
    /^https?:\/\//i.test(value) ||
    /^mailto:/i.test(value) ||
    /^tel:/i.test(value)
  ) {
    return value;
  }

  return `https://${value}`;
};

const sanitizeStyle = (raw: string) =>
  raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf(":");

      if (separator < 1) {
        return "";
      }

      const property = part
        .slice(0, separator)
        .trim()
        .toLowerCase();

      const value = part
        .slice(separator + 1)
        .trim();

      if (
        !ALLOWED_STYLE_PROPERTIES.has(
          property
        )
      ) {
        return "";
      }

      if (
        /url\s*\(|expression\s*\(|javascript:/i.test(
          value
        )
      ) {
        return "";
      }

      return `${property}: ${value}`;
    })
    .filter(Boolean)
    .join("; ");

const sanitizeRichHtml = (html: string) => {
  if (
    typeof window === "undefined" ||
    typeof DOMParser === "undefined"
  ) {
    return html;
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(
    `<div id="root">${html}</div>`,
    "text/html"
  );

  const root =
    documentNode.getElementById("root");

  if (!root) {
    return "";
  }

  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach(
      (child) => {
        if (
          child.nodeType ===
          Node.ELEMENT_NODE
        ) {
          const element =
            child as HTMLElement;

          if (
            !ALLOWED_TAGS.has(
              element.tagName
            )
          ) {
            const fragment =
              documentNode.createDocumentFragment();

            while (element.firstChild) {
              fragment.appendChild(
                element.firstChild
              );
            }

            element.replaceWith(fragment);
            walk(node);
            return;
          }

          Array.from(
            element.attributes
          ).forEach((attribute) => {
            const name =
              attribute.name.toLowerCase();

            if (
              name.startsWith("on")
            ) {
              element.removeAttribute(
                attribute.name
              );
              return;
            }

            if (
              element.tagName === "A"
            ) {
              if (
                ![
                  "href",
                  "target",
                  "rel",
                  "title",
                ].includes(name)
              ) {
                element.removeAttribute(
                  attribute.name
                );
              }

              return;
            }

            if (
              element.tagName === "FONT"
            ) {
              if (
                ![
                  "color",
                  "style",
                ].includes(name)
              ) {
                element.removeAttribute(
                  attribute.name
                );
              }

              return;
            }

            if (name === "style") {
              const safeStyle =
                sanitizeStyle(
                  attribute.value
                );

              if (safeStyle) {
                element.setAttribute(
                  "style",
                  safeStyle
                );
              } else {
                element.removeAttribute(
                  "style"
                );
              }

              return;
            }

            element.removeAttribute(
              attribute.name
            );
          });

          if (
            element.tagName === "A"
          ) {
            const href =
              element.getAttribute(
                "href"
              ) || "";

            const normalized =
              normalizeUrl(href);

            if (!normalized) {
              element.removeAttribute(
                "href"
              );
            } else {
              element.setAttribute(
                "href",
                normalized
              );

              if (
                /^https?:\/\//i.test(
                  normalized
                )
              ) {
                element.setAttribute(
                  "target",
                  "_blank"
                );
                element.setAttribute(
                  "rel",
                  "noopener noreferrer"
                );
              }
            }
          }

          walk(element);
        }
      }
    );
  };

  walk(root);

  return root.innerHTML;
};

const RichTextBlockEditor: React.FC<Props> = ({
  block,
  index,
  total,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}) => {
  const editorRef =
    React.useRef<HTMLDivElement | null>(
      null
    );

  const savedRangeRef =
    React.useRef<Range | null>(null);

  const [
    contextMenu,
    setContextMenu,
  ] =
    React.useState<ContextMenuState>({
      visible: false,
      x: 0,
      y: 0,
    });

  const html = String(
    (
      block.content as Record<
        string,
        unknown
      >
    )?.html || ""
  );

  const changeHtml = React.useCallback(
    (nextHtml: string) => {
      onChange({
        ...block,
        content: {
          ...block.content,
          html: nextHtml,
        },
      });
    },
    [block, onChange]
  );

  React.useEffect(() => {
    const editor =
      editorRef.current;

    if (!editor) {
      return;
    }

    if (
      document.activeElement ===
      editor
    ) {
      return;
    }

    if (
      editor.innerHTML !== html
    ) {
      editor.innerHTML = html;
    }
  }, [html]);

  React.useEffect(() => {
    const close = () =>
      setContextMenu(
        (previous) => ({
          ...previous,
          visible: false,
        })
      );

    window.addEventListener(
      "scroll",
      close,
      true
    );
    window.addEventListener(
      "resize",
      close
    );
    window.addEventListener(
      "click",
      close
    );

    return () => {
      window.removeEventListener(
        "scroll",
        close,
        true
      );
      window.removeEventListener(
        "resize",
        close
      );
      window.removeEventListener(
        "click",
        close
      );
    };
  }, []);

  const syncFromEditor =
    React.useCallback(() => {
      const editor =
        editorRef.current;

      if (!editor) {
        return;
      }

      changeHtml(
        sanitizeRichHtml(
          editor.innerHTML
        )
      );
    }, [changeHtml]);

  const saveSelection =
    React.useCallback(() => {
      const selection =
        window.getSelection();

      if (
        !selection ||
        selection.rangeCount === 0
      ) {
        return;
      }

      const range =
        selection.getRangeAt(0);

      const editor =
        editorRef.current;

      if (
        editor &&
        editor.contains(
          range.commonAncestorContainer
        )
      ) {
        savedRangeRef.current =
          range.cloneRange();
      }
    }, []);

  const restoreSelection =
    React.useCallback(() => {
      const range =
        savedRangeRef.current;

      if (!range) {
        editorRef.current?.focus();
        return;
      }

      const selection =
        window.getSelection();

      selection?.removeAllRanges();
      selection?.addRange(range);
    }, []);

  const runCommand =
    React.useCallback(
      (
        command: string,
        value?: string
      ) => {
        restoreSelection();
        editorRef.current?.focus();

        document.execCommand(
          command,
          false,
          value
        );

        saveSelection();
        syncFromEditor();
      },
      [
        restoreSelection,
        saveSelection,
        syncFromEditor,
      ]
    );

  const openLinkDialog =
    React.useCallback(() => {
      restoreSelection();

      const selection =
        window.getSelection();

      const selectedText =
        selection?.toString().trim() ||
        "";

      if (!selectedText) {
        window.alert(
          "Hãy bôi đen chữ cần gắn liên kết trước."
        );
        return;
      }

      const input =
        window.prompt(
          "Nhập đường dẫn cho đoạn chữ đã chọn:",
          "https://"
        );

      if (input === null) {
        return;
      }

      const url =
        normalizeUrl(input);

      if (!url) {
        return;
      }

      runCommand(
        "createLink",
        url
      );
    }, [
      restoreSelection,
      runCommand,
    ]);

  const handleContextMenu = (
    event: React.MouseEvent
  ) => {
    saveSelection();

    const selection =
      window.getSelection();

    if (
      !selection ||
      !selection
        .toString()
        .trim()
    ) {
      return;
    }

    event.preventDefault();

    setContextMenu({
      visible: true,
      x: Math.min(
        event.clientX,
        window.innerWidth - 220
      ),
      y: Math.min(
        event.clientY,
        window.innerHeight - 190
      ),
    });
  };

  const updateResponsive = (
    key:
      | "hideOnDesktop"
      | "hideOnTablet"
      | "hideOnMobile"
      | "stackOnMobile",
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
    <article className="news-block-editor news-richtext-block-editor">
      <header>
        <div>
          <small>
            VĂN BẢN {index + 1}
          </small>

          <strong>
            Trình soạn thảo kiểu Word
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
        <div className="news-word-toolbar">
          <div className="news-word-toolbar__group">
            <button
              type="button"
              title="Hoàn tác"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                runCommand("undo")
              }
            >
              ↶
            </button>

            <button
              type="button"
              title="Làm lại"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                runCommand("redo")
              }
            >
              ↷
            </button>
          </div>

          <div className="news-word-toolbar__group">
            <button
              type="button"
              title="In đậm (Ctrl+B)"
              className="is-bold"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                runCommand("bold")
              }
            >
              B
            </button>

            <button
              type="button"
              title="In nghiêng (Ctrl+I)"
              className="is-italic"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                runCommand("italic")
              }
            >
              I
            </button>

            <button
              type="button"
              title="Gạch chân (Ctrl+U)"
              className="is-underline"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                runCommand("underline")
              }
            >
              U
            </button>

            <button
              type="button"
              title="Gạch ngang"
              className="is-strike"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                runCommand(
                  "strikeThrough"
                )
              }
            >
              S
            </button>
          </div>

          <div className="news-word-toolbar__group">
            <button
              type="button"
              title="Căn trái"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                runCommand(
                  "justifyLeft"
                )
              }
            >
              ≡
            </button>

            <button
              type="button"
              title="Căn giữa"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                runCommand(
                  "justifyCenter"
                )
              }
            >
              ≡
            </button>

            <button
              type="button"
              title="Căn phải"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                runCommand(
                  "justifyRight"
                )
              }
            >
              ≡
            </button>

            <button
              type="button"
              title="Căn đều hai bên"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                runCommand(
                  "justifyFull"
                )
              }
            >
              ☰
            </button>
          </div>

          <div className="news-word-toolbar__group">
            <button
              type="button"
              title="Bullet"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                runCommand(
                  "insertUnorderedList"
                )
              }
            >
              • List
            </button>

            <button
              type="button"
              title="Danh sách đánh số"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                runCommand(
                  "insertOrderedList"
                )
              }
            >
              1. List
            </button>
          </div>

          <div className="news-word-toolbar__group">
            <button
              type="button"
              title="Thêm liên kết (Ctrl+K)"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={
                openLinkDialog
              }
            >
              🔗 Link
            </button>

            <button
              type="button"
              title="Bỏ liên kết"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                runCommand("unlink")
              }
            >
              ⛓
            </button>
          </div>

          <div className="news-word-toolbar__group news-word-toolbar__colors">
            <label title="Màu chữ">
              A
              <input
                type="color"
                defaultValue="#142543"
                onMouseDown={
                  saveSelection
                }
                onChange={(event) =>
                  runCommand(
                    "foreColor",
                    event.target.value
                  )
                }
              />
            </label>

            <label title="Màu nền chữ">
              ▰
              <input
                type="color"
                defaultValue="#fff1b8"
                onMouseDown={
                  saveSelection
                }
                onChange={(event) =>
                  runCommand(
                    "hiliteColor",
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          <div className="news-word-toolbar__group">
            <button
              type="button"
              title="Xóa định dạng"
              onMouseDown={(event) =>
                event.preventDefault()
              }
              onClick={() =>
                runCommand(
                  "removeFormat"
                )
              }
            >
              Tx
            </button>
          </div>
        </div>

        <div className="news-word-editor-shell">
          <div
            ref={editorRef}
            className="news-word-editor"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Nhập nội dung bài viết tại đây..."
            onInput={
              syncFromEditor
            }
            onBlur={() => {
              saveSelection();
              syncFromEditor();
            }}
            onMouseUp={
              saveSelection
            }
            onKeyUp={
              saveSelection
            }
            onContextMenu={
              handleContextMenu
            }
            onKeyDown={(event) => {
              if (
                (event.ctrlKey ||
                  event.metaKey) &&
                event.key.toLowerCase() ===
                  "k"
              ) {
                event.preventDefault();
                saveSelection();
                openLinkDialog();
              }
            }}
          />

          <div className="news-word-editor-hint">
            <span>
              Bôi đen chữ để định dạng.
            </span>

            <span>
              Ctrl+K hoặc chuột phải để gắn link.
            </span>

            <span>
              Bullet và numbered list sẽ hiển thị ngoài bài.
            </span>
          </div>
        </div>

        <details className="news-word-responsive">
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

      {contextMenu.visible ? (
        <div
          className="news-word-context-menu"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          <button
            type="button"
            onMouseDown={(event) =>
              event.preventDefault()
            }
            onClick={() => {
              setContextMenu(
                (previous) => ({
                  ...previous,
                  visible: false,
                })
              );
              openLinkDialog();
            }}
          >
            🔗 Thêm / sửa liên kết
          </button>

          <button
            type="button"
            onMouseDown={(event) =>
              event.preventDefault()
            }
            onClick={() => {
              runCommand("unlink");
              setContextMenu(
                (previous) => ({
                  ...previous,
                  visible: false,
                })
              );
            }}
          >
            ⛓ Bỏ liên kết
          </button>

          <button
            type="button"
            onMouseDown={(event) =>
              event.preventDefault()
            }
            onClick={() => {
              runCommand("bold");
              setContextMenu(
                (previous) => ({
                  ...previous,
                  visible: false,
                })
              );
            }}
          >
            <b>B</b> In đậm
          </button>

          <button
            type="button"
            onMouseDown={(event) =>
              event.preventDefault()
            }
            onClick={() => {
              runCommand("italic");
              setContextMenu(
                (previous) => ({
                  ...previous,
                  visible: false,
                })
              );
            }}
          >
            <i>I</i> In nghiêng
          </button>
        </div>
      ) : null}
    </article>
  );
};

export default RichTextBlockEditor;
