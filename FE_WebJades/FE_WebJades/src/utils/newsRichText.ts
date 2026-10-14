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
  "SUB",
  "SUP",
]);

const ALLOWED_STYLE_PROPERTIES = new Set([
  "text-align",
  "font-weight",
  "font-style",
  "text-decoration",
  "color",
  "background-color",
  "font-family",
]);

export const normalizeNewsUrl = (
  raw: string
) => {
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

const sanitizeStyle = (
  raw: string
) =>
  raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator =
        part.indexOf(":");

      if (separator <= 0) {
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
        /url\s*\(|expression\s*\(|java\s*script:/i.test(
          value
        )
      ) {
        return "";
      }

      return `${property}: ${value}`;
    })
    .filter(Boolean)
    .join("; ");

export const sanitizeNewsRichHtml = (
  html: string
) => {
  if (
    typeof window === "undefined" ||
    typeof DOMParser === "undefined"
  ) {
    return html;
  }

  const parser = new DOMParser();

  const documentNode =
    parser.parseFromString(
      `<div id="news-rich-root">${html}</div>`,
      "text/html"
    );

  const root =
    documentNode.getElementById(
      "news-rich-root"
    );

  if (!root) {
    return "";
  }

  const walk = (
    parent: Node
  ) => {
    Array.from(
      parent.childNodes
    ).forEach((child) => {
      if (
        child.nodeType !==
        Node.ELEMENT_NODE
      ) {
        return;
      }

      const element =
        child as HTMLElement;

      if (
        !ALLOWED_TAGS.has(
          element.tagName
        )
      ) {
        const fragment =
          documentNode.createDocumentFragment();

        while (
          element.firstChild
        ) {
          fragment.appendChild(
            element.firstChild
          );
        }

        element.replaceWith(
          fragment
        );

        walk(parent);

        return;
      }

      Array.from(
        element.attributes
      ).forEach(
        (attribute) => {
          const name =
            attribute.name
              .toLowerCase();

          if (
            name.startsWith("on")
          ) {
            element.removeAttribute(
              attribute.name
            );

            return;
          }

          if (
            name === "style"
          ) {
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

          if (
            element.tagName ===
            "A"
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
            element.tagName ===
            "FONT"
          ) {
            if (
              ![
                "face",
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

          element.removeAttribute(
            attribute.name
          );
        }
      );

      if (
        element.tagName === "A"
      ) {
        const rawHref =
          element.getAttribute(
            "href"
          ) || "";

        const href =
          normalizeNewsUrl(
            rawHref
          );

        if (!href) {
          element.removeAttribute(
            "href"
          );
        } else {
          element.setAttribute(
            "href",
            href
          );

          if (
            /^https?:\/\//i.test(
              href
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
          } else {
            element.removeAttribute(
              "target"
            );

            element.removeAttribute(
              "rel"
            );
          }
        }
      }

      walk(element);
    });
  };

  walk(root);

  return root.innerHTML;
};


export const sanitizeNewsInlineHtml = (
  html: string
) => {
  const safe =
    sanitizeNewsRichHtml(html);

  return safe
    .replace(
      /<(p|div|blockquote|ul|ol|li)(?:\s[^>]*)?>/gi,
      ""
    )
    .replace(
      /<\/(p|div|blockquote|li)>/gi,
      "<br>"
    )
    .replace(
      /<\/(ul|ol)>/gi,
      ""
    )
    .replace(
      /^(?:\s*<br>\s*)+/i,
      ""
    )
    .replace(
      /(?:\s*<br>\s*)+$/i,
      ""
    );
};

export const htmlToPlainText = (
  html: string
) => {
  if (
    typeof window === "undefined" ||
    typeof DOMParser === "undefined"
  ) {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .trim();
  }

  const parser = new DOMParser();

  const documentNode =
    parser.parseFromString(
      `<div id="news-text-root">${html}</div>`,
      "text/html"
    );

  const root =
    documentNode.getElementById(
      "news-text-root"
    );

  return (
    root?.textContent || ""
  )
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const richValueOrPlain = (
  richValue: unknown,
  plainValue: unknown
) => {
  const rich = String(
    richValue || ""
  ).trim();

  if (rich) {
    return rich;
  }

  return String(
    plainValue || ""
  );
};
