import React from "react";
import {
  htmlToPlainText,
  normalizeNewsUrl,
  sanitizeNewsInlineHtml,
  sanitizeNewsRichHtml,
} from "../../utils/newsRichText";

type Props = {
  label: string;
  value: string;
  onChange: (
    html: string,
    plainText: string
  ) => void;
  placeholder?: string;
  minHeight?: number;
  compact?: boolean;
  allowLists?: boolean;
  allowLinks?: boolean;
  allowAlignment?: boolean;
};


const NEWS_FONT_OPTIONS = [
  {
    value: "Lora",
    label: "Lora",
  },
  {
    value: "SVN-Gilroy",
    label: "SVN-Gilroy",
  },
  {
    value: "Arial",
    label: "Arial",
  },
  {
    value: "Georgia",
    label: "Georgia",
  },
  {
    value: "Times New Roman",
    label: "Times New Roman",
  },
  {
    value: "Tahoma",
    label: "Tahoma",
  },
] as const;

type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
};

const WordRichTextField: React.FC<Props> = ({
  label,
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  minHeight = 130,
  compact = false,
  allowLists = true,
  allowLinks = true,
  allowAlignment = true,
}) => {
  const editorRef =
    React.useRef<HTMLDivElement | null>(
      null
    );

  const savedRangeRef =
    React.useRef<Range | null>(
      null
    );

  const [
    contextMenu,
    setContextMenu,
  ] =
    React.useState<ContextMenuState>({
      visible: false,
      x: 0,
      y: 0,
    });

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

    const sanitized =
      compact
        ? sanitizeNewsInlineHtml(
            value || ""
          )
        : sanitizeNewsRichHtml(
            value || ""
          );

    if (
      editor.innerHTML !==
      sanitized
    ) {
      editor.innerHTML =
        sanitized;
    }
  }, [compact, value]);

  React.useEffect(() => {
    const close = () =>
      setContextMenu(
        (previous) => ({
          ...previous,
          visible: false,
        })
      );

    window.addEventListener(
      "click",
      close
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

    return () => {
      window.removeEventListener(
        "click",
        close
      );

      window.removeEventListener(
        "scroll",
        close,
        true
      );

      window.removeEventListener(
        "resize",
        close
      );
    };
  }, []);

  const saveSelection =
    React.useCallback(() => {
      const editor =
        editorRef.current;

      const selection =
        window.getSelection();

      if (
        !editor ||
        !selection ||
        selection.rangeCount === 0
      ) {
        return;
      }

      const range =
        selection.getRangeAt(0);

      if (
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
      const editor =
        editorRef.current;

      editor?.focus();

      const range =
        savedRangeRef.current;

      if (!range) {
        return;
      }

      const selection =
        window.getSelection();

      if (!selection) {
        return;
      }

      selection.removeAllRanges();
      selection.addRange(range);
    }, []);

  const emitValue =
    React.useCallback(() => {
      const editor =
        editorRef.current;

      if (!editor) {
        return;
      }

      const html =
        compact
          ? sanitizeNewsInlineHtml(
              editor.innerHTML
            )
          : sanitizeNewsRichHtml(
              editor.innerHTML
            );

      onChange(
        html,
        htmlToPlainText(html)
      );
    }, [compact, onChange]);

  const runCommand =
    React.useCallback(
      (
        command: string,
        commandValue?: string
      ) => {
        restoreSelection();

        document.execCommand(
          command,
          false,
          commandValue
        );

        saveSelection();
        emitValue();
      },
      [
        emitValue,
        restoreSelection,
        saveSelection,
      ]
    );

  const addLink =
    React.useCallback(() => {
      restoreSelection();

      const selection =
        window.getSelection();

      const selectedText =
        selection
          ?.toString()
          .trim() || "";

      if (!selectedText) {
        window.alert(
          "Hãy bôi đen chữ cần gắn link trước."
        );

        return;
      }

      const rawUrl =
        window.prompt(
          "Nhập đường dẫn:",
          "https://"
        );

      if (rawUrl === null) {
        return;
      }

      const url =
        normalizeNewsUrl(
          rawUrl
        );

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
    if (!allowLinks) {
      return;
    }

    saveSelection();

    const selection =
      window.getSelection();

    if (
      !selection
        ?.toString()
        .trim()
    ) {
      return;
    }

    event.preventDefault();

    setContextMenu({
      visible: true,
      x: Math.min(
        event.clientX,
        window.innerWidth - 230
      ),
      y: Math.min(
        event.clientY,
        window.innerHeight - 175
      ),
    });
  };

  const preventToolbarBlur = (
    event: React.MouseEvent
  ) => {
    event.preventDefault();
    saveSelection();
  };

  return (
    <div
      className={[
        "news-word-field",
        compact
          ? "is-compact"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="news-word-field__label">
        {label}
      </div>

      <div className="news-word-toolbar">
        <div className="news-word-toolbar__group news-word-toolbar__font-group">
          <select
            className="news-word-font-select"
            defaultValue="SVN-Gilroy"
            title="Kiểu chữ"
            aria-label="Kiểu chữ"
            onMouseDown={() =>
              saveSelection()
            }
            onChange={(event) =>
              runCommand(
                "fontName",
                event.target.value
              )
            }
          >
            {NEWS_FONT_OPTIONS.map(
              (font) => (
                <option
                  key={font.value}
                  value={font.value}
                >
                  {font.label}
                </option>
              )
            )}
          </select>
        </div>

        <div className="news-word-toolbar__group">
          <button
            type="button"
            title="Hoàn tác"
            onMouseDown={
              preventToolbarBlur
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
            onMouseDown={
              preventToolbarBlur
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
            className="is-bold"
            title="In đậm"
            onMouseDown={
              preventToolbarBlur
            }
            onClick={() =>
              runCommand("bold")
            }
          >
            B
          </button>

          <button
            type="button"
            className="is-italic"
            title="In nghiêng"
            onMouseDown={
              preventToolbarBlur
            }
            onClick={() =>
              runCommand("italic")
            }
          >
            I
          </button>

          <button
            type="button"
            className="is-underline"
            title="Gạch chân"
            onMouseDown={
              preventToolbarBlur
            }
            onClick={() =>
              runCommand(
                "underline"
              )
            }
          >
            U
          </button>

          <button
            type="button"
            className="is-strike"
            title="Gạch ngang"
            onMouseDown={
              preventToolbarBlur
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

        {allowAlignment ? (
          <div className="news-word-toolbar__group">
            <button
              type="button"
              title="Căn trái"
              onMouseDown={
                preventToolbarBlur
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
              onMouseDown={
                preventToolbarBlur
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
              onMouseDown={
                preventToolbarBlur
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
              title="Căn đều"
              onMouseDown={
                preventToolbarBlur
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
        ) : null}

        {allowLists ? (
          <div className="news-word-toolbar__group">
            <button
              type="button"
              title="Bullet"
              onMouseDown={
                preventToolbarBlur
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
              onMouseDown={
                preventToolbarBlur
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
        ) : null}

        {allowLinks ? (
          <div className="news-word-toolbar__group">
            <button
              type="button"
              title="Gắn liên kết"
              onMouseDown={
                preventToolbarBlur
              }
              onClick={addLink}
            >
              🔗 Link
            </button>

            <button
              type="button"
              title="Bỏ liên kết"
              onMouseDown={
                preventToolbarBlur
              }
              onClick={() =>
                runCommand(
                  "unlink"
                )
              }
            >
              ⛓
            </button>
          </div>
        ) : null}

        <div className="news-word-toolbar__group news-word-toolbar__colors">
          <label title="Màu chữ">
            A
            <input
              type="color"
              defaultValue="#142543"
              onMouseDown={() =>
                saveSelection()
              }
              onChange={(
                event
              ) =>
                runCommand(
                  "foreColor",
                  event.target.value
                )
              }
            />
          </label>

          <label title="Highlight">
            ▰
            <input
              type="color"
              defaultValue="#fff1b8"
              onMouseDown={() =>
                saveSelection()
              }
              onChange={(
                event
              ) =>
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
            onMouseDown={
              preventToolbarBlur
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
          style={{
            minHeight,
          }}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={
            placeholder
          }
          onInput={emitValue}
          onBlur={() => {
            saveSelection();
            emitValue();
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
          onKeyDown={(
            event
          ) => {
            if (
              allowLinks &&
              (
                event.ctrlKey ||
                event.metaKey
              ) &&
              event.key
                .toLowerCase() ===
                "k"
            ) {
              event.preventDefault();

              saveSelection();
              addLink();
            }
          }}
        />

        <div className="news-word-editor-hint">
          <span>
            Bôi đen chữ để định dạng.
          </span>

          {allowLinks ? (
            <span>
              Ctrl+K hoặc chuột phải để gắn link.
            </span>
          ) : null}

          {allowLists ? (
            <span>
              Có Bullet và numbered list.
            </span>
          ) : null}
        </div>
      </div>

      {contextMenu.visible ? (
        <div
          className="news-word-context-menu"
          style={{
            left:
              contextMenu.x,
            top:
              contextMenu.y,
          }}
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          <button
            type="button"
            onMouseDown={
              preventToolbarBlur
            }
            onClick={() => {
              setContextMenu(
                (previous) => ({
                  ...previous,
                  visible: false,
                })
              );

              addLink();
            }}
          >
            🔗 Thêm / sửa liên kết
          </button>

          <button
            type="button"
            onMouseDown={
              preventToolbarBlur
            }
            onClick={() => {
              runCommand(
                "unlink"
              );

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
            onMouseDown={
              preventToolbarBlur
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
            onMouseDown={
              preventToolbarBlur
            }
            onClick={() => {
              runCommand(
                "italic"
              );

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
    </div>
  );
};

export default WordRichTextField;
