import React, {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { productApi } from "../api/productApi";
import {
  PRODUCT_MENU,
  getAllProductMenuItems,
} from "../config/productMenuConfig";
import "../styles/BulkProductImportPage.css";

type Props = {
  onBack?: () => void;
  onFinished?: () => void;
};

type CsvRow = Record<string, string>;

type FixedMenuParent = (typeof PRODUCT_MENU)[number];

type FixedMenuItem =
  ReturnType<typeof getAllProductMenuItems>[number];

type CategorySelection = {
  parent: FixedMenuParent;
  child: FixedMenuItem;
};

type ImportRow = {
  index: number;
  sku: string;
  name: string;
  parentCategoryName: string;
  categoryName: string;
  price: number;
  salePrice: number;
  shortDescription: string;
  description: string;
  status:
    | "active"
    | "draft"
    | "inactive";
  mainImageName: string;
  galleryNames: string[];

  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  canonicalUrl: string;

  imageAlt: string;
  imageTitle: string;
  imageDescription: string;
  imageCaption: string;

  matchedFiles: File[];
  categorySelection:
    | CategorySelection
    | null;
  errors: string[];
};

const MAX_IMAGE_BYTES =
  150 * 1024 * 1024;

const IMPORT_CONCURRENCY = 3;

const ALLOWED_IMAGE_EXTENSIONS =
  new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
  ]);

const normalizeHeader = (
  value: string
) =>
  value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(
      /[^a-z0-9]/g,
      ""
    );

const normalizeText = (
  value: string
) =>
  value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLocaleLowerCase(
      "vi-VN"
    )
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();

const splitImageNames = (
  value: string
) =>
  value
    .split(/[;|]/g)
    .map((item) =>
      item.trim()
    )
    .filter(Boolean);

const parseCsv = (
  text: string
): CsvRow[] => {
  const rows: string[][] = [];

  let row: string[] = [];
  let cell = "";
  let quoted = false;

  /*
   * Parser CSV giữ nguyên logic cũ:
   * - hỗ trợ dấu phẩy trong chuỗi quote
   * - hỗ trợ "" bên trong quote
   * - hỗ trợ CRLF / LF
   */
  for (
    let i = 0;
    i < text.length;
    i += 1
  ) {
    const char =
      text[i];

    const next =
      text[i + 1];

    if (
      char === '"'
    ) {
      if (
        quoted &&
        next === '"'
      ) {
        cell += '"';
        i += 1;
      } else {
        quoted =
          !quoted;
      }

      continue;
    }

    if (
      char === "," &&
      !quoted
    ) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (
      (
        char === "\n" ||
        char === "\r"
      ) &&
      !quoted
    ) {
      if (
        char === "\r" &&
        next === "\n"
      ) {
        i += 1;
      }

      row.push(cell);
      cell = "";

      if (
        row.some(
          (value) =>
            value.trim() !== ""
        )
      ) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    cell += char;
  }

  row.push(cell);

  if (
    row.some(
      (value) =>
        value.trim() !== ""
    )
  ) {
    rows.push(row);
  }

  if (
    rows.length <= 1
  ) {
    return [];
  }

  const headers =
    rows[0].map(
      (header) =>
        normalizeHeader(
          header
        )
    );

  return rows
    .slice(1)
    .map((values) => {
      const output:
        CsvRow = {};

      headers.forEach(
        (
          header,
          index
        ) => {
          output[header] =
            (
              values[index] ||
              ""
            ).trim();
        }
      );

      return output;
    });
};

const readValue = (
  row: CsvRow,
  aliases: string[]
) => {
  for (
    const alias
    of aliases
  ) {
    const key =
      normalizeHeader(
        alias
      );

    if (
      row[key] !==
      undefined
    ) {
      return row[key];
    }
  }

  return "";
};

const readSku = (
  row: CsvRow
) =>
  readValue(
    row,
    [
      "sku",
      "ma san pham",
      "mã sản phẩm",
      "product code",
    ]
  ).trim();

const normalizeFileName = (
  value: string
) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .split("/")
    .pop() ||
  "";

const createSlug = (
  value: string
) =>
  value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(
      /[^a-z0-9\s-]/g,
      ""
    )
    .trim()
    .replace(
      /\s+/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    );

const getFileExtension = (
  fileName: string
) => {
  const normalized =
    normalizeFileName(
      fileName
    );

  const dotIndex =
    normalized
      .lastIndexOf(".");

  if (
    dotIndex < 0
  ) {
    return "";
  }

  return normalized
    .slice(dotIndex)
    .toLowerCase();
};

const isAllowedImage = (
  file: File
) => {
  const extension =
    getFileExtension(
      file.name
    );

  return (
    file.size > 0 &&
    file.size <=
      MAX_IMAGE_BYTES &&
    ALLOWED_IMAGE_EXTENSIONS
      .has(extension) &&
    (
      !file.type ||
      file.type
        .toLowerCase()
        .startsWith(
          "image/"
        )
    )
  );
};

const buildCategoryCandidates = (
  value: string
) => {
  const normalized =
    normalizeText(value);

  const candidates =
    new Set<string>();

  if (!normalized) {
    return candidates;
  }

  candidates.add(normalized);

  /*
   * Backward compatibility cho CSV cũ.
   *
   * Ví dụ:
   * "Vòng Phi Thủy"
   * -> "Vòng Ngọc Phỉ Thúy"
   *
   * normalizeText đã bỏ dấu nên:
   * "vong phi thuy"
   * -> "vong ngoc phi thuy"
   */
  if (
    normalized.startsWith(
      "vong "
    ) &&
    !normalized.startsWith(
      "vong ngoc "
    )
  ) {
    candidates.add(
      normalized.replace(
        /^vong\s+/,
        "vong ngoc "
      )
    );
  }

  if (
    !normalized.startsWith(
      "vong "
    )
  ) {
    candidates.add(
      `vong ${normalized}`
    );

    candidates.add(
      `vong ngoc ${normalized}`
    );
  }

  return candidates;
};

const resolveFixedCategory = (
  parentCategoryName: string,
  categoryName: string
):
  | CategorySelection
  | null => {
  const normalizedParent =
    normalizeText(
      parentCategoryName
    );

  if (!normalizedParent) {
    return null;
  }

  const parent =
    PRODUCT_MENU.find(
      (category) =>
        normalizeText(
          category.name
        ) ===
        normalizedParent
    );

  if (!parent) {
    return null;
  }

  const childCandidates =
    buildCategoryCandidates(
      categoryName
    );

  if (
    childCandidates.size ===
    0
  ) {
    return null;
  }

  const child =
    getAllProductMenuItems(
      parent
    ).find(
      (item) =>
        childCandidates.has(
          normalizeText(
            item.name
          )
        ) ||
        childCandidates.has(
          normalizeText(
            item.id
          )
        )
    );

  if (!child) {
    return null;
  }

  return {
    parent,
    child,
  };
};

const getRequestErrorMessage = (
  error: unknown
) => {
  const candidate =
    error as {
      response?: {
        data?: {
          message?: string;
          error?: string;
        };
      };
      message?: string;
    };

  return (
    candidate
      ?.response
      ?.data
      ?.message ||
    candidate
      ?.response
      ?.data
      ?.error ||
    candidate
      ?.message ||
    "Import thất bại"
  );
};

const BulkProductImportPage:
  React.FC<Props> = ({
    onBack,
    onFinished,
  }) => {
  const [
    rawRows,
    setRawRows,
  ] = useState<
    CsvRow[]
  >([]);

  const [
    imageFiles,
    setImageFiles,
  ] = useState<
    File[]
  >([]);

  const [
    existingSkus,
    setExistingSkus,
  ] = useState<
    Set<string>
  >(
    new Set()
  );

  const [
    loadingExisting,
    setLoadingExisting,
  ] = useState(
    true
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    importing,
    setImporting,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState({
    current: 0,
    total: 0,
  });

  /*
   * ==================================================
   * LOAD EXISTING SKU
   *
   * Chỉ dùng để preview nhanh ở FE.
   * Backend + unique index vẫn là lớp bảo vệ cuối.
   * ==================================================
   */
  useEffect(() => {
    let mounted = true;

    const loadExisting =
      async () => {
        try {
          setLoadingExisting(
            true
          );

          const productData =
            await productApi
              .getAllAdminProducts();

          if (!mounted) {
            return;
          }

          const skus =
            new Set<string>(
              (
                productData
                  .products ||
                []
              )
                .map(
                  (
                    product:
                      any
                  ) =>
                    String(
                      product
                        .sku ||
                        ""
                    )
                      .trim()
                      .toLowerCase()
                )
                .filter(
                  Boolean
                )
            );

          setExistingSkus(
            skus
          );
        } catch {
          /*
           * Không chặn import chỉ vì
           * không preload được SKU.
           *
           * Backend vẫn kiểm tra duplicate.
           */
        } finally {
          if (mounted) {
            setLoadingExisting(
              false
            );
          }
        }
      };

    loadExisting();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ==================================================
   * PREPARE FILE LOOKUPS
   * ==================================================
   */
  const fileLookup =
    useMemo(() => {
      const byName =
        new Map<
          string,
          File
        >();

      const normalized =
        imageFiles.map(
          (file) => {
            const base =
              normalizeFileName(
                file.name
              );

            const withoutExtension =
              base.replace(
                /\.[^.]+$/,
                ""
              );

            byName.set(
              base,
              file
            );

            return {
              file,
              base,
              withoutExtension,
            };
          }
        );

      return {
        byName,
        normalized,
      };
    }, [
      imageFiles,
    ]);

  /*
   * ==================================================
   * SKU DUPLICATE INSIDE CURRENT CSV
   * ==================================================
   */
  const csvSkuCounts =
    useMemo(() => {
      const counts =
        new Map<
          string,
          number
        >();

      rawRows.forEach(
        (row) => {
          const sku =
            readSku(row)
              .toLowerCase();

          if (!sku) {
            return;
          }

          counts.set(
            sku,
            (
              counts.get(
                sku
              ) || 0
            ) + 1
          );
        }
      );

      return counts;
    }, [
      rawRows,
    ]);

  /*
   * ==================================================
   * BUILD PREVIEW ROWS
   *
   * Quan trọng:
   * - KHÔNG dùng ProductCategories MongoDB nữa.
   * - KHÔNG tự tạo category.
   * - Chỉ cho import category thuộc PRODUCT_MENU.
   * ==================================================
   */
  const rows =
    useMemo<
      ImportRow[]
    >(() => {
      return rawRows.map(
        (
          row,
          index
        ) => {
          const sku =
            readSku(
              row
            );

          const name =
            readValue(
              row,
              [
                "name",
                "ten san pham",
                "tên sản phẩm",
                "product name",
              ]
            ).trim();

          const parentCategoryName =
            readValue(
              row,
              [
                "parentCategory",
                "parentCategoryName",
                "danh muc chinh",
                "danh mục chính",
                "nhom chinh",
                "nhóm chính",
              ]
            ).trim();

          const categoryName =
            readValue(
              row,
              [
                "categoryName",
                "category",
                "muc san pham",
                "mục sản phẩm",
                "danh muc con",
                "danh mục con",
              ]
            ).trim();

          const price =
            Number(
              readValue(
                row,
                [
                  "price",
                  "gia",
                  "giá",
                ]
              ).replace(
                /[^\d.-]/g,
                ""
              )
            ) || 0;

          const salePrice =
            Number(
              readValue(
                row,
                [
                  "salePrice",
                  "sale price",
                  "gia sale",
                  "giá sale",
                ]
              ).replace(
                /[^\d.-]/g,
                ""
              )
            ) || 0;

          const shortDescription =
            readValue(
              row,
              [
                "shortDescription",
                "short description",
                "mo ta ngan",
                "mô tả ngắn",
              ]
            );

          const description =
            readValue(
              row,
              [
                "description",
                "mo ta",
                "mô tả",
              ]
            );

          const rawStatus =
            readValue(
              row,
              [
                "status",
                "trang thai",
                "trạng thái",
              ]
            )
              .toLowerCase()
              .trim();

          const status:
            ImportRow["status"] =
              rawStatus ===
                "draft" ||
              rawStatus ===
                "inactive"
                ? rawStatus
                : "active";

          const mainImageName =
            readValue(
              row,
              [
                "mainImage",
                "main image",
                "anh chinh",
                "ảnh chính",
              ]
            ).trim();

          const galleryNames =
            splitImageNames(
              readValue(
                row,
                [
                  "gallery",
                  "galleryImages",
                  "gallery images",
                  "anh phu",
                  "ảnh phụ",
                ]
              )
            );

          /*
           * SEO / IMAGE SEO là optional.
           * Nếu CSV không có cột thì Bulk Import
           * sẽ tự tạo giá trị mặc định an toàn.
           */
          const seoTitle =
            readValue(
              row,
              [
                "seoTitle",
                "seo title",
                "tieu de seo",
                "tiêu đề seo",
              ]
            ).trim();

          const seoDescription =
            readValue(
              row,
              [
                "seoDescription",
                "seo description",
                "meta description",
                "mo ta seo",
                "mô tả seo",
              ]
            ).trim();

          const focusKeyword =
            readValue(
              row,
              [
                "focusKeyword",
                "focus keyword",
                "tu khoa chinh",
                "từ khóa chính",
              ]
            ).trim();

        const canonicalUrl = "";

          const imageAlt =
            readValue(
              row,
              [
                "imageAlt",
                "image alt",
                "alt text",
                "alt",
              ]
            ).trim();

          const imageTitle =
            readValue(
              row,
              [
                "imageTitle",
                "image title",
                "tieu de anh",
                "tiêu đề ảnh",
              ]
            ).trim();

          const imageDescription =
            readValue(
              row,
              [
                "imageDescription",
                "image description",
                "mo ta anh",
                "mô tả ảnh",
              ]
            ).trim();

          const imageCaption =
            readValue(
              row,
              [
                "imageCaption",
                "image caption",
                "caption",
                "chu thich anh",
                "chú thích ảnh",
              ]
            ).trim();

          /*
           * ==========================================
           * IMAGE MATCH
           * ==========================================
           */

          const explicitFiles:
            File[] = [];

          if (
            mainImageName
          ) {
            const match =
              fileLookup
                .byName
                .get(
                  normalizeFileName(
                    mainImageName
                  )
                );

            if (match) {
              explicitFiles.push(
                match
              );
            }
          }

          galleryNames
            .forEach(
              (
                fileName
              ) => {
                const match =
                  fileLookup
                    .byName
                    .get(
                      normalizeFileName(
                        fileName
                      )
                    );

                if (
                  match &&
                  !explicitFiles
                    .some(
                      (
                        file
                      ) =>
                        file.name ===
                        match.name
                    )
                ) {
                  explicitFiles
                    .push(
                      match
                    );
                }
              }
            );

          let matchedFiles =
            explicitFiles;

          /*
           * Nếu CSV không khai báo MainImage/Gallery
           * thì fallback match theo SKU.
           */
          if (
            matchedFiles
              .length === 0 &&
            sku
          ) {
            const normalizedSku =
              sku.toLowerCase();

            matchedFiles =
              fileLookup
                .normalized
                .filter(
                  ({
                    withoutExtension,
                  }) =>
                    withoutExtension ===
                      normalizedSku ||
                    withoutExtension
                      .startsWith(
                        `${normalizedSku}-`
                      ) ||
                    withoutExtension
                      .startsWith(
                        `${normalizedSku}_`
                      )
                )
                .sort(
                  (
                    a,
                    b
                  ) => {
                    const aMain =
                      /(?:^|[-_])main(?:[-_.]|$)/i
                        .test(
                          a.file
                            .name
                        )
                        ? 0
                        : 1;

                    const bMain =
                      /(?:^|[-_])main(?:[-_.]|$)/i
                        .test(
                          b.file
                            .name
                        )
                        ? 0
                        : 1;

                    return (
                      aMain -
                        bMain ||
                      a.file
                        .name
                        .localeCompare(
                          b.file
                            .name
                        )
                    );
                  }
                )
                .map(
                  ({
                    file,
                  }) =>
                    file
                );
          }

          /*
           * ==========================================
           * FIXED CATEGORY
           * ==========================================
           */

          const categorySelection =
            resolveFixedCategory(
              parentCategoryName,
              categoryName
            );

          /*
           * ==========================================
           * VALIDATION
           * ==========================================
           */

          const errors:
            string[] = [];

          const normalizedSku =
            sku
              .toLowerCase();

          if (!sku) {
            errors.push(
              "Thiếu SKU"
            );
          }

          if (!name) {
            errors.push(
              "Thiếu tên sản phẩm"
            );
          }

          if (
            !parentCategoryName
          ) {
            errors.push(
              "Thiếu danh mục chính"
            );
          }

          if (
            !categoryName
          ) {
            errors.push(
              "Thiếu mục sản phẩm"
            );
          }

          if (
            parentCategoryName &&
            categoryName &&
            !categorySelection
          ) {
            errors.push(
              "Danh mục không thuộc menu King Jades"
            );
          }

          if (
            price < 0
          ) {
            errors.push(
              "Giá không hợp lệ"
            );
          }

          if (
            salePrice < 0
          ) {
            errors.push(
              "Giá sale không hợp lệ"
            );
          }

          if (
            price > 0 &&
            salePrice >
              price
          ) {
            errors.push(
              "Giá sale lớn hơn giá bán"
            );
          }

          if (
            normalizedSku &&
            existingSkus.has(
              normalizedSku
            )
          ) {
            errors.push(
              "SKU đã tồn tại"
            );
          }

          if (
            normalizedSku &&
            (
              csvSkuCounts.get(
                normalizedSku
              ) || 0
            ) > 1
          ) {
            errors.push(
              "SKU bị trùng trong CSV"
            );
          }

          if (
            mainImageName &&
            !fileLookup
              .byName
              .has(
                normalizeFileName(
                  mainImageName
                )
              )
          ) {
            errors.push(
              `Không tìm thấy ảnh chính: ${mainImageName}`
            );
          }

          return {
            index:
              index + 2,

            sku,
            name,

            parentCategoryName,
            categoryName,

            price,
            salePrice,

            shortDescription,
            description,

            status,

            mainImageName,
            galleryNames,

            seoTitle,
            seoDescription,
            focusKeyword,
            canonicalUrl,

            imageAlt,
            imageTitle,
            imageDescription,
            imageCaption,

            matchedFiles,
            categorySelection,

            errors,
          };
        }
      );
    }, [
      csvSkuCounts,
      existingSkus,
      fileLookup,
      rawRows,
    ]);

  const validRows =
    useMemo(
      () =>
        rows.filter(
          (row) =>
            row.errors
              .length === 0
        ),
      [rows]
    );

  const invalidRows =
    useMemo(
      () =>
        rows.filter(
          (row) =>
            row.errors
              .length > 0
        ),
      [rows]
    );

  /*
   * ==================================================
   * CSV
   * ==================================================
   */

  const handleCsv =
    async (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target
          .files?.[0];

      event.target.value =
        "";

      if (!file) {
        return;
      }

      setError("");
      setMessage("");

      try {
        const text =
          await file.text();

        const parsed =
          parseCsv(
            text
          );

        if (
          parsed.length ===
          0
        ) {
          throw new Error(
            "CSV không có dữ liệu. Hãy kiểm tra dòng tiêu đề và dữ liệu."
          );
        }

        setRawRows(
          parsed
        );

        setMessage(
          `Đã đọc ${parsed.length} dòng sản phẩm.`
        );
      } catch (
        requestError
      ) {
        const err =
          requestError as Error;

        setError(
          err.message ||
            "Không đọc được file CSV."
        );
      }
    };

  /*
   * ==================================================
   * IMAGES
   * ==================================================
   */

  const handleImages = (
    event:
      ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles =
      Array.from(
        event.target
          .files ||
          []
      );

    event.target.value =
      "";

    const validFiles =
      selectedFiles.filter(
        isAllowedImage
      );

    const rejectedCount =
      selectedFiles.length -
      validFiles.length;

    /*
     * Cho phép chọn ảnh nhiều lần.
     *
     * Bản cũ setImageFiles(validFiles)
     * nên lần chọn thứ 2 sẽ ghi đè toàn bộ ảnh
     * của lần chọn thứ 1.
     *
     * Bản mới merge + chống trùng theo filename.
     */
    const merged =
      new Map<
        string,
        File
      >();

    imageFiles.forEach(
      (file) => {
        merged.set(
          normalizeFileName(
            file.name
          ),
          file
        );
      }
    );

    validFiles.forEach(
      (file) => {
        merged.set(
          normalizeFileName(
            file.name
          ),
          file
        );
      }
    );

    const nextFiles =
      Array.from(
        merged.values()
      );

    setImageFiles(
      nextFiles
    );

    setError("");

    if (
      rejectedCount >
      0
    ) {
      setMessage(
        `Đang giữ ${nextFiles.length} ảnh hợp lệ. Lần này bỏ qua ${rejectedCount} file không hợp lệ hoặc vượt 150MB.`
      );
    } else {
      setMessage(
        `Đang giữ ${nextFiles.length} file hình ảnh. Bạn có thể chọn thêm nhiều lần mà không mất ảnh đã chọn trước đó.`
      );
    }
  };

  /*
   * ==================================================
   * FORM DATA

   * Backend FixedProductMenu yêu cầu:
   * - parentCategoryId
   * - categoryId
   * phải là ID cố định của PRODUCT_MENU.
   * ==================================================
   */

  const buildFormData = (
    row: ImportRow
  ) => {
    if (
      !row.categorySelection
    ) {
      throw new Error(
        "Danh mục sản phẩm không hợp lệ."
      );
    }

    const {
      parent,
      child,
    } =
      row.categorySelection;

    const formData =
      new FormData();

    formData.append(
      "name",
      row.name
    );

    formData.append(
      "slug",
      createSlug(
        row.name
      )
    );

    formData.append(
      "sku",
      row.sku
    );

    formData.append(
      "parentCategoryId",
      parent.id
    );

    formData.append(
      "parentCategoryName",
      parent.name
    );

    formData.append(
      "categoryId",
      child.id
    );

    formData.append(
      "categoryName",
      child.name
    );

    formData.append(
      "price",
      String(
        row.price
      )
    );

    formData.append(
      "salePrice",
      String(
        row.salePrice
      )
    );

    formData.append(
      "shortDescription",
      row.shortDescription
    );

    formData.append(
      "description",
      row.description
    );

    formData.append(
      "status",
      row.status
    );

    /*
     * Đồng bộ Status + Visibility + PublishStatus.
     *
     * active   => Published + website ON
     * draft    => Draft + website OFF
     * inactive => Draft + website OFF
     */
    const isPublished =
      row.status ===
      "active";

    formData.append(
      "publishStatus",
      isPublished
        ? "Published"
        : "Draft"
    );

    formData.append(
      "specifications",
      JSON.stringify(
        []
      )
    );

    const resolvedFocusKeyword =
      row.focusKeyword ||
      row.name;

    formData.append(
      "seo",
      JSON.stringify({
        title:
          row.seoTitle ||
          (
            row.name
              ? `${row.name} | King Jades`
              : ""
          ),

        description:
          row.seoDescription ||
          row.shortDescription ||
          "",

        keywords:
          resolvedFocusKeyword
            ? [resolvedFocusKeyword]
            : [],

        canonicalUrl:
          row.canonicalUrl ||
          "",

        ogImage: "",

        focusKeyword:
          resolvedFocusKeyword,

        robots:
          "index,follow",

        schemaType:
          "Product",
      })
    );

    /*
     * Đồng bộ default với AddProductPage.
     * Bulk Import không cần người dùng nhập lại
     * Typography / Text Style cho từng dòng.
     */
    formData.append(
      "typography",
      JSON.stringify({
        titleFont:
          "Lora",
        descriptionFont:
          "SVN-Gilroy",
        letterSpacing:
          0.02,
        lineHeight:
          1.8,
      })
    );

    formData.append(
      "textStyle",
      JSON.stringify({
        headingSize:
          48,
        bodySize:
          16,
        headingColor:
          "#142543",
        bodyColor:
          "#706d65",
        headingAlign:
          "left",
        bodyAlign:
          "left",
      })
    );

    formData.append(
      "tags",
      JSON.stringify(
        []
      )
    );

    formData.append(
      "productTagging",
      JSON.stringify({
        isFeatured: false,
        isBestSeller: false,
        isNewArrival: false,
        isPromotion: false,
        collectionTags: [],
      })
    );

    formData.append(
      "visibility",
      JSON.stringify({
        isPublished,
        showOnMenu: false,
      })
    );

    const imageMetadata =
      row.matchedFiles.map(
        (
          file,
          index
        ) => {
          const suffix =
            index === 0
              ? ""
              : ` - ảnh ${index + 1}`;

          return {
            fileName:
              file.name,

            alt:
              row.imageAlt ||
              `${row.name}${suffix}`,

            title:
              row.imageTitle ||
              `${row.name}${suffix}`,

            description:
              row.imageDescription ||
              `Hình ảnh ${index + 1} của ${row.name} tại King Jades.`,

            caption:
              row.imageCaption ||
              row.name,

            isMain:
              index === 0,

            sortOrder:
              index + 1,
          };
        }
      );

    formData.append(
      "imageMetadata",
      JSON.stringify(
        imageMetadata
      )
    );

    row.matchedFiles
      .forEach(
        (file) => {
          formData.append(
            "images",
            file
          );
        }
      );

    return formData;
  };

  /*
   * ==================================================
   * IMPORT WITH LIMITED CONCURRENCY

   * Chưa thay backend thành BulkWrite ở bước này,
   * nên dùng createProduct hiện tại nhưng chạy tối đa
   * IMPORT_CONCURRENCY request cùng lúc.
   *
   * Không Promise.all 1000 request cùng lúc.
   * ==================================================
   */

  const handleImport =
    async () => {
      if (
        validRows.length ===
        0
      ) {
        setError(
          "Không có dòng hợp lệ để import."
        );

        return;
      }

      const ok =
        window.confirm(
          `Import ${validRows.length} sản phẩm hợp lệ? ${
            invalidRows.length
              ? `${invalidRows.length} dòng lỗi sẽ được bỏ qua.`
              : ""
          }`
        );

      if (!ok) {
        return;
      }

      setImporting(
        true
      );

      setError("");
      setMessage("");

      setProgress({
        current: 0,
        total:
          validRows.length,
      });

      let success = 0;
      let completed = 0;

      const failed:
        string[] = [];

      let cursor = 0;

      const worker =
        async () => {
          while (
            true
          ) {
            const currentIndex =
              cursor;

            cursor += 1;

            if (
              currentIndex >=
              validRows.length
            ) {
              return;
            }

            const row =
              validRows[
                currentIndex
              ];

            try {
              await productApi
                .createProduct(
                  buildFormData(
                    row
                  )
                );

              success += 1;
            } catch (
              requestError
            ) {
              failed.push(
                `${row.sku}: ${getRequestErrorMessage(
                  requestError
                )}`
              );
            } finally {
              completed += 1;

              setProgress({
                current:
                  completed,

                total:
                  validRows
                    .length,
              });
            }
          }
        };

      try {
        const workerCount =
          Math.min(
            IMPORT_CONCURRENCY,
            validRows.length
          );

        await Promise.all(
          Array.from(
            {
              length:
                workerCount,
            },
            () =>
              worker()
          )
        );

        /*
         * Cập nhật local SKU cache với những SKU
         * đã thành công để không import lại nếu user
         * tiếp tục thao tác trên cùng màn hình.
         */
        if (
          success > 0
        ) {
          setExistingSkus(
            (previous) => {
              const next =
                new Set(
                  previous
                );

              validRows
                .forEach(
                  (row) => {
                    if (
                      !failed.some(
                        (
                          failure
                        ) =>
                          failure
                            .toLowerCase()
                            .startsWith(
                              `${row.sku.toLowerCase()}:`
                            )
                      )
                    ) {
                      next.add(
                        row.sku
                          .toLowerCase()
                      );
                    }
                  }
                );

              return next;
            }
          );
        }

        if (
          failed.length >
          0
        ) {
          const preview =
            failed
              .slice(
                0,
                20
              )
              .join(
                " | "
              );

          const more =
            failed.length >
            20
              ? ` | ... và ${
                  failed.length -
                  20
                } lỗi khác`
              : "";

          setError(
            `Import thành công ${success}/${validRows.length}. Lỗi: ${preview}${more}`
          );
        } else {
          setMessage(
            `Import thành công ${success} sản phẩm.`
          );

          onFinished?.();
        }
      } finally {
        setImporting(
          false
        );
      }
    };

  return (
    <div className="kj-bulk-page">
      <header className="kj-bulk-header">
        <div>
          <span>
            Bulk Product Import
          </span>

          <h1>
            Import sản phẩm hàng loạt
          </h1>

          <p>
            Upload CSV + thư mục ảnh, hệ thống tự đối chiếu theo SKU
            và cho kiểm tra trước khi lưu.
          </p>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
          >
            ← Danh sách sản phẩm
          </button>
        )}
      </header>

      <section className="kj-bulk-step-grid">
        <label className="kj-bulk-upload-card">
          <span>01</span>

          <strong>
            Chọn file CSV
          </strong>

          <small>
            Cột tối thiểu: SKU, Name, ParentCategory, CategoryName.
          </small>

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={
              handleCsv
            }
            disabled={
              importing
            }
          />
        </label>

        <label className="kj-bulk-upload-card">
          <span>02</span>

          <strong>
            Chọn nhiều ảnh
          </strong>

          <small>
            Đặt tên dạng SKU-main.jpg, SKU-1.jpg, SKU-2.jpg để tự match.
            Có thể chọn ảnh nhiều lần; ảnh mới sẽ được cộng thêm, không ghi đè ảnh cũ.
          </small>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={
              handleImages
            }
            disabled={
              importing
            }
          />

          <div className="kj-bulk-image-selection">
            <b>
              {imageFiles.length}
            </b>
            <span>
              ảnh đang được giữ để match theo SKU
            </span>
          </div>
        </label>

        <div className="kj-bulk-upload-card is-summary">
          <span>03</span>

          <strong>
            Kiểm tra & Import
          </strong>

          <small>
            Hệ thống bỏ qua dòng lỗi, không làm fail toàn bộ file.
          </small>
        </div>
      </section>

      {(message ||
        error) && (
        <div
          className={`kj-bulk-alert ${
            error
              ? "is-error"
              : "is-success"
          }`}
        >
          {error ||
            message}
        </div>
      )}

      <section className="kj-bulk-stats">
        <article>
          <span>
            Tổng dòng
          </span>
          <strong>
            {rows.length}
          </strong>
        </article>

        <article>
          <span>
            Hợp lệ
          </span>
          <strong>
            {
              validRows.length
            }
          </strong>
        </article>

        <article>
          <span>
            Có lỗi
          </span>
          <strong>
            {
              invalidRows.length
            }
          </strong>
        </article>

        <article>
          <span>
            Ảnh đã chọn
          </span>
          <strong>
            {
              imageFiles.length
            }
          </strong>
        </article>
      </section>

      {rows.length >
        0 && (
        <section className="kj-bulk-table-card">
          <div className="kj-bulk-table-header">
            <div>
              <strong>
                Preview dữ liệu
              </strong>

              <span>
                Chỉ các dòng “Sẵn sàng” mới được import.
              </span>
            </div>

            <button
              type="button"
              onClick={
                handleImport
              }
              disabled={
                importing ||
                loadingExisting ||
                validRows.length ===
                  0
              }
            >
              {importing
                ? `Đang import ${progress.current}/${progress.total}`
                : loadingExisting
                  ? "Đang kiểm tra SKU..."
                  : `Import ${validRows.length} sản phẩm hợp lệ`}
            </button>
          </div>

          {importing &&
            progress.total >
              0 && (
              <div className="kj-bulk-progress">
                <span
                  style={{
                    width:
                      `${Math.round(
                        (
                          progress.current /
                          progress.total
                        ) *
                          100
                      )}%`,
                  }}
                />
              </div>
            )}

          <div className="kj-bulk-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    Dòng
                  </th>

                  <th>
                    SKU
                  </th>

                  <th>
                    Sản phẩm
                  </th>

                  <th>
                    Danh mục chính
                  </th>

                  <th>
                    Mục sản phẩm
                  </th>

                  <th>
                    Giá
                  </th>

                  <th>
                    Ảnh match
                  </th>

                  <th>
                    Trạng thái
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (row) => (
                    <tr
                      key={`${row.index}-${row.sku}`}
                      className={
                        row.errors
                          .length
                          ? "is-error"
                          : ""
                      }
                    >
                      <td>
                        {
                          row.index
                        }
                      </td>

                      <td>
                        <strong>
                          {row.sku ||
                            "—"}
                        </strong>
                      </td>

                      <td>
                        {row.name ||
                          "—"}
                      </td>

                      <td>
                        {row.parentCategoryName ||
                          "—"}
                      </td>

                      <td>
                        <div className="kj-bulk-category-preview">
                          <span>
                            {row.categoryName ||
                              "—"}
                          </span>

                          {row.categorySelection &&
                            normalizeText(
                              row.categorySelection
                                .child.name
                            ) !==
                              normalizeText(
                                row.categoryName
                              ) && (
                              <small>
                                →{" "}
                                {
                                  row
                                    .categorySelection
                                    .child.name
                                }
                              </small>
                            )}
                        </div>
                      </td>

                      <td>
                        {new Intl
                          .NumberFormat(
                            "vi-VN"
                          )
                          .format(
                            row.price
                          )}{" "}
                        VNĐ
                      </td>

                      <td>
                        <span
                          className={`kj-bulk-image-match ${
                            row.matchedFiles
                              .length >
                            0
                              ? "has-images"
                              : ""
                          }`}
                          title={
                            row.matchedFiles
                              .map(
                                (file) =>
                                  file.name
                              )
                              .join("\n")
                          }
                        >
                          {
                            row
                              .matchedFiles
                              .length
                          }{" "}
                          ảnh
                        </span>
                      </td>

                      <td>
                        {row.errors
                          .length ===
                        0 ? (
                          <span className="kj-bulk-status ready">
                            ✓ Sẵn sàng
                          </span>
                        ) : (
                          <span className="kj-bulk-status error">
                            {row.errors.join(
                              ", "
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="kj-bulk-guide">
        <strong>
          Cấu trúc danh mục CSV
        </strong>

        <code>
          ParentCategory,CategoryName
        </code>

        <code>
          Vòng Ngọc Thiên Nhiên,Vòng Ngọc Sơn Thủy
        </code>

        <p>
          Danh mục được đối chiếu với menu sản phẩm cố định của King Jades.
          Một số tên cũ như “Vòng Phi Thủy” sẽ tự map sang
          “Vòng Ngọc Phỉ Thúy”. Bulk Import không tự tạo category mới.
        </p>

        <strong>
          Quy tắc tên ảnh khuyên dùng
        </strong>

        <code>
          JD-BR-001-main.jpg
        </code>

        <code>
          JD-BR-001-1.jpg
        </code>

        <code>
          JD-BR-001-2.jpg
        </code>

        <p>
          Nếu CSV có cột MainImage / Gallery thì hệ thống ưu tiên tên file
          khai báo trong CSV; nếu để trống thì tự match theo tiền tố SKU.
          Mỗi ảnh tối đa 150MB. Có thể chọn nhiều đợt ảnh liên tiếp; hệ thống sẽ cộng dồn và chống trùng tên file.
        </p>

        <strong>
          SEO nâng cao (không bắt buộc)
        </strong>

        <code>
          SeoTitle,SeoDescription,FocusKeyword,CanonicalUrl
        </code>

        <code>
          ImageAlt,ImageTitle,ImageDescription,ImageCaption
        </code>

        <p>
          Nếu bỏ trống, hệ thống tự tạo Rank Math-style SEO cơ bản,
          Typography, Text Style và metadata SEO cho từng ảnh.
        </p>
      </section>
    </div>
  );
};

export default BulkProductImportPage;
