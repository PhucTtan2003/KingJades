using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;
using System.Text.Json;
using System.Text.RegularExpressions;
using WebKingJades.Data;
using WebKingJades.Models;
using WebKingJades.Services;

namespace WebKingJades.Controllers;

[ApiController]
public class ProductsController : ControllerBase
{
    private const long MaxSingleImageBytes = 150_000_000;

    private readonly ProductService _productService;
    private readonly IWebHostEnvironment _environment;
    private readonly MongoDbContext _mongoContext;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(
        ProductService productService,
        IWebHostEnvironment environment,
        MongoDbContext mongoContext,
        ILogger<ProductsController> logger
    )
    {
        _productService = productService;
        _environment = environment;
        _mongoContext = mongoContext;
        _logger = logger;
    }

    // ==================================================
    // FIXED PRODUCT MENU
    //
    // Đồng bộ với FE:
    // src/config/productMenuConfig.ts
    //
    // Group chỉ dùng để trình bày menu.
    // Product lưu parent + leaf item.
    // ==================================================

    private sealed record
        FixedProductMenuItem(
            string ParentCategoryId,
            string ParentCategoryName,
            string CategoryId,
            string CategoryName
        );

    private static readonly
        IReadOnlyList<FixedProductMenuItem>
        FixedProductMenu =
        new List<FixedProductMenuItem>
        {
            // VÒNG NGỌC THIÊN NHIÊN
            new(
                "vong-ngoc-thien-nhien",
                "Vòng Ngọc Thiên Nhiên",
                "vong-ngoc-son-thuy",
                "Vòng Ngọc Sơn Thủy"
            ),
            new(
                "vong-ngoc-thien-nhien",
                "Vòng Ngọc Thiên Nhiên",
                "vong-ngoc-phi-thuy",
                "Vòng Ngọc Phỉ Thúy"
            ),
            new(
                "vong-ngoc-thien-nhien",
                "Vòng Ngọc Thiên Nhiên",
                "vong-ngoc-tu-nham",
                "Vòng Ngọc Tụ Nham"
            ),
            new(
                "vong-ngoc-thien-nhien",
                "Vòng Ngọc Thiên Nhiên",
                "vong-lam-ngoc",
                "Vòng Lam Ngọc"
            ),
            new(
                "vong-ngoc-thien-nhien",
                "Vòng Ngọc Thiên Nhiên",
                "vong-ngoc-bich",
                "Vòng Ngọc Bích"
            ),
            new(
                "vong-ngoc-thien-nhien",
                "Vòng Ngọc Thiên Nhiên",
                "vong-ngoc-huyet",
                "Vòng Ngọc Huyết"
            ),
            new(
                "vong-ngoc-thien-nhien",
                "Vòng Ngọc Thiên Nhiên",
                "vong-ngoc-hoa-dien",
                "Vòng Ngọc Hòa Điền"
            ),
            new(
                "vong-ngoc-thien-nhien",
                "Vòng Ngọc Thiên Nhiên",
                "vong-bach-ngoc",
                "Vòng Bạch Ngọc"
            ),
            new(
                "vong-ngoc-thien-nhien",
                "Vòng Ngọc Thiên Nhiên",
                "vong-ngoc-vip",
                "Vòng Ngọc VIP"
            ),

            // TRANG SỨC NGỌC - PHẬT NGỌC
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "duc-chua",
                "Đức Chúa"
            ),
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "phat-ba-quan-am",
                "Phật Bà Quan Âm"
            ),
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "phat-di-lac",
                "Phật Di Lặc"
            ),
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "phat-adida",
                "Phật Adida"
            ),
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "phat-ban-menh",
                "Phật Bản Mệnh"
            ),

            // TRANG SỨC NGỌC - CHUỖI NGỌC
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "chuoi-ngoc-deo-tay",
                "Chuỗi Ngọc Đeo Tay"
            ),
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "chuoi-ngoc-deo-co",
                "Chuỗi Ngọc Đeo Cổ"
            ),

            // TRANG SỨC NGỌC
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "ngoc-hoa-dien",
                "Ngọc Hòa Điền"
            ),
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "nhan-ngoc",
                "Nhẫn Ngọc"
            ),
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "day-chuyen-ngoc",
                "Dây Chuyền Ngọc"
            ),
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "bong-tai-ngoc",
                "Bông Tai Ngọc"
            ),
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "vong-ngoc",
                "Vòng Ngọc"
            ),

            // TRANG SỨC ĐÁ QUÝ
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "nhan-da-quy",
                "Nhẫn"
            ),
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "day-chuyen-da-quy",
                "Dây Chuyền"
            ),
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "bong-tai-da-quy",
                "Bông Tai"
            ),

            // PHONG THỦY
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "chuoi-thach-anh",
                "Chuỗi Thạch Anh"
            ),

            // TƯỢNG NGỌC
            new(
                "trang-suc-ngoc",
                "Trang Sức Ngọc",
                "tuong-ngoc-dieu-khac",
                "Tượng Ngọc Điêu Khắc"
            ),
        };
    [HttpGet("api/debug/mongo-collections")]
    public async Task<IActionResult>
    DebugMongoCollections()
    {
        var database =
            _mongoContext.Database;

        using var cursor =
            await database
                .ListCollectionNamesAsync();

        var collectionNames =
            await cursor.ToListAsync();

        var collections =
            new List<object>();

        foreach (
            var collectionName
            in collectionNames
                .OrderBy(x => x)
        )
        {
            var collection =
                database
                    .GetCollection<BsonDocument>(
                        collectionName
                    );

            var count =
                await collection
                    .CountDocumentsAsync(
                        FilterDefinition<BsonDocument>
                            .Empty
                    );

            collections.Add(
                new
                {
                    name =
                        collectionName,

                    count
                }
            );
        }

        return Ok(new
        {
            database =
                _mongoContext.DatabaseName,

            collections
        });
    }
    // ==================================================
    // ADMIN - PRODUCT LIST
    //
    // GET /api/admin/products?skip=0&take=50
    // ==================================================

    [HttpGet("api/admin/products")]
    public async Task<IActionResult> GetAdminProducts(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50
    )
    {
        var result =
            await _productService
                .GetAdminProductListAsync(
                    skip,
                    take
                );

        return Ok(new
        {
            products = result.Products,
            total = result.Total,
            skip,
            take
        });
    }

    // ==================================================
    // ADMIN - PRODUCT DETAIL
    //
    // GET /api/admin/products/{id}
    // ==================================================

    [HttpGet("api/admin/products/{id}")]
    public async Task<IActionResult> GetAdminProductDetail(
        string id
    )
    {
        var product =
            await _productService
                .GetByIdAdminAsync(id);

        if (product == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy sản phẩm."
            });
        }

        return Ok(new
        {
            product
        });
    }

    // ==================================================
    // ADMIN - CREATE PRODUCT
    //
    // POST /api/admin/products
    // ==================================================

    [HttpPost("api/admin/products")]
    [RequestSizeLimit(500_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 500_000_000)]
    public async Task<IActionResult> CreateProduct(
        [FromForm] CreateProductRequest request,
        [FromForm] string? publishStatus = null,
        [FromForm] DateTime? publishAtUtc = null,
        [FromForm] string? imageMetadata = null
    )
    {
        // ==================================================
        // VALIDATE BASIC
        // ==================================================

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new
            {
                message = "Tên sản phẩm là bắt buộc."
            });
        }

        var normalizedSku =
            request.Sku?.Trim()
            ?? string.Empty;

        if (
            !string.IsNullOrWhiteSpace(
                normalizedSku
            )
            &&
            await _productService
                .SkuExistsAsync(
                    normalizedSku
                )
        )
        {
            return Conflict(new
            {
                message =
                    $"SKU '{normalizedSku}' đã tồn tại."
            });
        }

        // ==================================================
        // RESOLVE CATEGORY
        // ==================================================

        var categoryResult =
            await ResolveCategoryAsync(
                request.ParentCategoryId,
                request.ParentCategoryName,
                request.CategoryId,
                request.CategoryName
            );

        if (!categoryResult.Success)
        {
            return BadRequest(new
            {
                message = categoryResult.Error
            });
        }

        // ==================================================
        // PUBLISH STATUS
        // ==================================================

        var normalizedPublishStatus =
            NormalizePublishStatus(
                publishStatus
            );

        DateTime? normalizedPublishAtUtc =
            null;

        if (
            normalizedPublishStatus ==
            "Scheduled"
        )
        {
            if (!publishAtUtc.HasValue)
            {
                return BadRequest(new
                {
                    message =
                        "Vui lòng chọn thời gian đăng sản phẩm."
                });
            }

            normalizedPublishAtUtc =
                NormalizeUtc(
                    publishAtUtc.Value
                );

            if (
                normalizedPublishAtUtc <=
                DateTime.UtcNow
            )
            {
                return BadRequest(new
                {
                    message =
                        "Thời gian hẹn đăng phải lớn hơn thời gian hiện tại."
                });
            }
        }

        // ==================================================
        // SLUG
        // ==================================================

        var baseSlug =
            !string.IsNullOrWhiteSpace(
                request.Slug
            )
                ? Slugify(request.Slug)
                : Slugify(request.Name);

        var finalSlug =
            await BuildUniqueSlugAsync(
                baseSlug
            );

        // ==================================================
        // IMAGES
        // ==================================================

        var productImages =
            await SaveUploadedImagesAsync(
                request.Images,
                request.Name.Trim(),
                0,
                true
            );

        ApplyUploadedImageMetadata(
            productImages,
            imageMetadata,
            request.Name.Trim()
        );

        // ==================================================
        // PARSE JSON FIELDS
        // ==================================================

        var specifications =
            ParseJson(
                request.Specifications,
                new List<ProductSpecification>()
            );

        var seo =
            ParseJson(
                request.Seo,
                new ProductSeo()
            );

        var typography =
            ParseJson(
                request.Typography,
                new ProductTypography()
            );

        var textStyle =
            ParseJson(
                request.TextStyle,
                new ProductTextStyle()
            );

        var tags =
            ParseJson(
                request.Tags,
                new List<string>()
            );

        var productTagging =
            ParseJson(
                request.ProductTagging,
                new ProductTagging()
            );

        var visibility =
            ParseJson(
                request.Visibility,
                new ProductVisibility()
            );

        NormalizeImages(
            productImages,
            request.Name
        );

        var mainImage =
            productImages
                .FirstOrDefault(
                    x => x.IsMain
                )
            ??
            productImages
                .FirstOrDefault();

        if (
            string.IsNullOrWhiteSpace(
                seo.OgImage
            )
            &&
            mainImage != null
        )
        {
            seo.OgImage =
                mainImage.Url;
        }

        var nowUtc =
            DateTime.UtcNow;

        // ==================================================
        // CREATE PRODUCT MODEL
        // ==================================================

        var product =
            new Product
            {
                Name =
                    request.Name.Trim(),

                Slug =
                    finalSlug,

                Sku =
                    normalizedSku,

                // ==========================================
                // CATEGORY HIERARCHY
                // ==========================================

                ParentCategoryId =
                    categoryResult.ParentCategoryId,

                ParentCategoryName =
                    categoryResult.ParentCategoryName,

                CategoryId =
                    categoryResult.CategoryId,

                CategoryName =
                    categoryResult.CategoryName,

                // ==========================================
                // PRICE
                // ==========================================

                Price =
                    request.Price,

                SalePrice =
                    request.SalePrice,

                // ==========================================
                // CONTENT
                // ==========================================

                ShortDescription =
                    request.ShortDescription?.Trim()
                    ?? string.Empty,

                Description =
                    request.Description?.Trim()
                    ?? string.Empty,

                // ==========================================
                // MEDIA
                // ==========================================

                Images =
                    productImages,

                // ==========================================
                // SPECIFICATION
                // ==========================================

                Specifications =
                    specifications
                        .Where(x =>
                            !string.IsNullOrWhiteSpace(
                                x.Label
                            )
                            &&
                            !string.IsNullOrWhiteSpace(
                                x.Value
                            )
                        )
                        .ToList(),

                // ==========================================
                // SEO
                // ==========================================

                Seo =
                    seo,

                Typography =
                    typography,

                TextStyle =
                    textStyle,

                // ==========================================
                // TAG
                // ==========================================

                Tags =
                    tags
                        .Where(x =>
                            !string.IsNullOrWhiteSpace(
                                x
                            )
                        )
                        .Select(x =>
                            x.Trim()
                        )
                        .Distinct(
                            StringComparer.OrdinalIgnoreCase
                        )
                        .ToList(),

                ProductTagging =
                    productTagging,

                Visibility =
                    visibility,

                Status =
                    string.IsNullOrWhiteSpace(
                        request.Status
                    )
                        ? "active"
                        : request.Status.Trim(),

                // ==========================================
                // PUBLISH
                // ==========================================

                PublishStatus =
                    normalizedPublishStatus,

                PublishAtUtc =
                    normalizedPublishAtUtc,

                PublishedAtUtc =
                    normalizedPublishStatus ==
                    "Published"
                        ? nowUtc
                        : null,

                CreatedAtUtc =
                    nowUtc,

                UpdatedAtUtc =
                    nowUtc
            };

        // ==================================================
        // INSERT PRODUCT + DEBUG VERIFY
        //
        // Tạm giữ debug để kiểm tra chính xác sản phẩm
        // có được insert vào MongoDB hay không.
        // ==================================================

        try
        {
            var createdProduct =
                await _productService
                    .CreateAsync(
                        product
                    );

            // Đọc lại ngay sau khi insert.
            // Id có thể được khai báo nullable trong model,
            // nên xử lý null-safe để tránh CS8604.
            var savedProduct =
                string.IsNullOrWhiteSpace(
                    createdProduct.Id
                )
                    ? createdProduct
                    : await _productService
                        .GetByIdAdminAsync(
                            createdProduct.Id
                        );

            var afterInsert =
                await _productService
                    .GetAdminProductListAsync(
                        0,
                        1
                    );

            var mongoContextCount =
                await _mongoContext
                    .Products
                    .CountDocumentsAsync(
                        _ => true
                    );

            return StatusCode(
                StatusCodes.Status201Created,
                new
                {
                    message =
                        normalizedPublishStatus ==
                        "Scheduled"
                            ? "Thêm sản phẩm thành công. Sản phẩm sẽ tự động đăng theo lịch."
                            : normalizedPublishStatus ==
                              "Draft"
                                ? "Đã lưu sản phẩm ở trạng thái nháp."
                                : "Thêm sản phẩm thành công.",

                    product =
                        savedProduct ??
                        createdProduct,

                    debug = new
                    {
                        insertedId =
                            createdProduct.Id,

                        inserted =
                            savedProduct != null,

                        totalAfterInsert =
                            afterInsert.Total,

                        mongoContextCount
                    }
                }
            );
        }
        catch (MongoWriteException ex)
            when (
                ex.WriteError?.Code ==
                11000
            )
        {
            DeleteLocalFiles(
                productImages
            );

            _logger.LogWarning(
                ex,
                "[ProductsController] Duplicate key while creating product. SKU={Sku}, Slug={Slug}",
                normalizedSku,
                finalSlug
            );

            return Conflict(new
            {
                message =
                    "SKU hoặc đường dẫn sản phẩm đã tồn tại.",
                sku =
                    normalizedSku,
                slug =
                    finalSlug
            });
        }
        catch (MongoWriteException ex)
        {
            DeleteLocalFiles(
                productImages
            );

            _logger.LogError(
                ex,
                "[ProductsController] MongoDB rejected product insert. SKU={Sku}",
                normalizedSku
            );

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message =
                        "MongoDB từ chối ghi sản phẩm.",

                    error =
                        ex.Message,

                    innerError =
                        ex.InnerException?.Message,

                    category = new
                    {
                        parentCategoryId =
                            categoryResult.ParentCategoryId,

                        parentCategoryName =
                            categoryResult.ParentCategoryName,

                        categoryId =
                            categoryResult.CategoryId,

                        categoryName =
                            categoryResult.CategoryName
                    }
                }
            );
        }
        catch (Exception ex)
        {
            DeleteLocalFiles(
                productImages
            );

            _logger.LogError(
                ex,
                "[ProductsController] Product insert failed. SKU={Sku}",
                normalizedSku
            );

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message =
                        "Insert sản phẩm vào MongoDB thất bại.",

                    error =
                        ex.Message,

                    innerError =
                        ex.InnerException?.Message,

                    category = new
                    {
                        parentCategoryId =
                            categoryResult.ParentCategoryId,

                        parentCategoryName =
                            categoryResult.ParentCategoryName,

                        categoryId =
                            categoryResult.CategoryId,

                        categoryName =
                            categoryResult.CategoryName
                    }
                }
            );
        }
    }
    [HttpGet("api/debug/products-storage")]
    public async Task<IActionResult>
    DebugProductsStorage()
    {
        var contextCount =
            await _mongoContext
                .Products
                .CountDocumentsAsync(
                    _ => true
                );

        var serviceResult =
            await _productService
                .GetAdminProductListAsync(
                    0,
                    1
                );

        return Ok(new
        {
            mongoContextCount =
                contextCount,

            productServiceCount =
                serviceResult.Total
        });
    }
    // ==================================================
    // ADMIN - UPDATE PRODUCT
    //
    // PUT /api/admin/products/{id}
    // ==================================================

    [HttpPut("api/admin/products/{id}")]
    [RequestSizeLimit(500_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 500_000_000)]
    public async Task<IActionResult> UpdateProduct(
        string id,
        [FromForm] CreateProductRequest request,
        [FromForm] string? existingImages = null,
        [FromForm] string? imageMetadata = null,
        [FromForm] bool? imagesChanged = null
    )
    {
        var existingProduct =
            await _productService
                .GetByIdAdminAsync(id);

        if (existingProduct == null)
        {
            return NotFound(new
            {
                message =
                    "Không tìm thấy sản phẩm cần cập nhật."
            });
        }

        if (
            string.IsNullOrWhiteSpace(
                request.Name
            )
        )
        {
            return BadRequest(new
            {
                message =
                    "Tên sản phẩm là bắt buộc."
            });
        }

        var normalizedSku =
            request.Sku?.Trim()
            ?? string.Empty;

        if (
            !string.IsNullOrWhiteSpace(
                normalizedSku
            )
            &&
            await _productService
                .SkuExistsExceptIdAsync(
                    normalizedSku,
                    id
                )
        )
        {
            return Conflict(new
            {
                message =
                    $"SKU '{normalizedSku}' đã tồn tại."
            });
        }

        // ==================================================
        // CATEGORY
        // ==================================================

        var categoryResult =
            await ResolveCategoryAsync(
                request.ParentCategoryId,
                request.ParentCategoryName,
                request.CategoryId,
                request.CategoryName
            );

        if (!categoryResult.Success)
        {
            return BadRequest(new
            {
                message =
                    categoryResult.Error
            });
        }

        // ==================================================
        // SLUG
        // ==================================================

        var baseSlug =
            !string.IsNullOrWhiteSpace(
                request.Slug
            )
                ? Slugify(
                    request.Slug
                )
                : Slugify(
                    request.Name
                );

        var finalSlug =
            baseSlug;

        var slugExists =
            await _productService
                .SlugExistsExceptIdAsync(
                    finalSlug,
                    id
                );

        if (slugExists)
        {
            finalSlug =
                await BuildUniqueSlugExceptIdAsync(
                    baseSlug,
                    id
                );
        }

        // ==================================================
        // EXISTING IMAGES - BACKWARD COMPATIBLE / SAFE UPDATE
        // ==================================================

        var databaseImages =
            (existingProduct.Images
                ?? new List<ProductImage>())
                .Select(CloneProductImage)
                .ToList();

        foreach (var image in databaseImages)
        {
            image.Url =
                NormalizeStoredProductImageUrl(
                    image.Url
                );
        }

        var hasExistingImagesPayload =
            !string.IsNullOrWhiteSpace(
                existingImages
            );

        var explicitlyChangedImageList =
            imagesChanged == true;

        var submittedImages =
            hasExistingImagesPayload
                ? ParseJson(
                    existingImages,
                    new List<ProductImage>()
                )
                : new List<ProductImage>();

        foreach (var image in submittedImages)
        {
            image.Url =
                NormalizeStoredProductImageUrl(
                    image.Url
                );
        }

        submittedImages =
            submittedImages
                .Where(x =>
                    !string.IsNullOrWhiteSpace(
                        x.Url
                    )
                )
                .ToList();

        /*
         * Safety cho sản phẩm cũ:
         * - imagesChanged=false: KHÔNG được làm mất bất kỳ URL ảnh nào đang có trong MongoDB.
         *   Nếu FE gửi metadata/main image mới thì chỉ merge theo URL.
         * - imagesChanged=true: danh sách existingImages từ FE là danh sách ảnh cũ cần giữ.
         *   Đây là trường hợp người dùng thật sự thêm/xóa ảnh trong UI.
         */
        List<ProductImage> keptImages;

        if (
            databaseImages.Count > 0
            &&
            !explicitlyChangedImageList
        )
        {
            keptImages =
                databaseImages
                    .Select(CloneProductImage)
                    .ToList();

            if (submittedImages.Count > 0)
            {
                var submittedByUrl =
                    submittedImages
                        .Where(x =>
                            !string.IsNullOrWhiteSpace(
                                x.Url
                            )
                        )
                        .GroupBy(
                            x => NormalizeStoredProductImageUrl(
                                x.Url
                            ),
                            StringComparer.OrdinalIgnoreCase
                        )
                        .ToDictionary(
                            group => group.Key,
                            group => group.First(),
                            StringComparer.OrdinalIgnoreCase
                        );

                foreach (var keptImage in keptImages)
                {
                    var normalizedUrl =
                        NormalizeStoredProductImageUrl(
                            keptImage.Url
                        );

                    if (
                        !submittedByUrl.TryGetValue(
                            normalizedUrl,
                            out var submittedImage
                        )
                    )
                    {
                        continue;
                    }

                    keptImage.FileName =
                        string.IsNullOrWhiteSpace(
                            submittedImage.FileName
                        )
                            ? keptImage.FileName
                            : submittedImage.FileName;

                    keptImage.Alt =
                        submittedImage.Alt;

                    keptImage.Title =
                        submittedImage.Title;

                    keptImage.Description =
                        submittedImage.Description;

                    keptImage.Caption =
                        submittedImage.Caption;

                    keptImage.IsMain =
                        submittedImage.IsMain;

                    keptImage.SortOrder =
                        submittedImage.SortOrder;
                }
            }
        }
        else
        {
            keptImages =
                submittedImages;
        }

        var keptImageUrls =
            keptImages
                .Select(x =>
                    NormalizeStoredProductImageUrl(
                        x.Url
                    )
                )
                .Where(x =>
                    !string.IsNullOrWhiteSpace(x)
                )
                .ToHashSet(
                    StringComparer.OrdinalIgnoreCase
                );

        var removedImages =
            databaseImages
                .Where(image =>
                    !string.IsNullOrWhiteSpace(
                        image.Url
                    )
                    &&
                    !keptImageUrls.Contains(
                        NormalizeStoredProductImageUrl(
                            image.Url
                        )
                    )
                )
                .ToList();

        // ==================================================
        // NEW IMAGES
        // ==================================================

        var uploadedImages =
            await SaveUploadedImagesAsync(
                request.Images,
                request.Name.Trim(),
                keptImages.Count,
                keptImages.Count == 0
            );

        ApplyUploadedImageMetadata(
            uploadedImages,
            imageMetadata,
            request.Name.Trim()
        );

        if (uploadedImages.Any(x => x.IsMain))
        {
            foreach (var keptImage in keptImages)
            {
                keptImage.IsMain = false;
            }
        }

        var productImages =
            new List<ProductImage>();

        productImages.AddRange(
            keptImages
        );

        productImages.AddRange(
            uploadedImages
        );

        NormalizeImages(
            productImages,
            request.Name
        );

        // ==================================================
        // PARSE JSON
        // ==================================================

        var specifications =
            ParseJson(
                request.Specifications,
                new List<ProductSpecification>()
            );

        var seo =
            ParseJson(
                request.Seo,
                existingProduct.Seo
                ?? new ProductSeo()
            );

        var typography =
            ParseJson(
                request.Typography,
                existingProduct.Typography
                ?? new ProductTypography()
            );

        var textStyle =
            ParseJson(
                request.TextStyle,
                existingProduct.TextStyle
                ?? new ProductTextStyle()
            );

        var tags =
            ParseJson(
                request.Tags,
                new List<string>()
            );

        var productTagging =
            ParseJson(
                request.ProductTagging,
                existingProduct.ProductTagging
                ?? new ProductTagging()
            );

        var visibility =
            ParseJson(
                request.Visibility,
                existingProduct.Visibility
                ?? new ProductVisibility()
            );

        var mainImage =
            productImages
                .FirstOrDefault(
                    x => x.IsMain
                )
            ??
            productImages
                .FirstOrDefault();

        if (
            string.IsNullOrWhiteSpace(
                seo.OgImage
            )
            &&
            mainImage != null
        )
        {
            seo.OgImage =
                mainImage.Url;
        }

        // ==================================================
        // UPDATE MODEL
        // ==================================================

        var updatedProduct =
            new Product
            {
                Id =
                    existingProduct.Id,

                Name =
                    request.Name.Trim(),

                Slug =
                    finalSlug,

                Sku =
                    normalizedSku,

                // ==========================================
                // CATEGORY
                // ==========================================

                ParentCategoryId =
                    categoryResult.ParentCategoryId,

                ParentCategoryName =
                    categoryResult.ParentCategoryName,

                CategoryId =
                    categoryResult.CategoryId,

                CategoryName =
                    categoryResult.CategoryName,

                // ==========================================
                // PRICE
                // ==========================================

                Price =
                    request.Price,

                SalePrice =
                    request.SalePrice,

                ShortDescription =
                    request.ShortDescription?.Trim()
                    ?? string.Empty,

                Description =
                    request.Description?.Trim()
                    ?? string.Empty,

                Images =
                    productImages,

                Specifications =
                    specifications
                        .Where(x =>
                            !string.IsNullOrWhiteSpace(
                                x.Label
                            )
                            &&
                            !string.IsNullOrWhiteSpace(
                                x.Value
                            )
                        )
                        .ToList(),

                Seo =
                    seo,

                Typography =
                    typography,

                TextStyle =
                    textStyle,

                Tags =
                    tags
                        .Where(x =>
                            !string.IsNullOrWhiteSpace(
                                x
                            )
                        )
                        .Select(x =>
                            x.Trim()
                        )
                        .Distinct(
                            StringComparer.OrdinalIgnoreCase
                        )
                        .ToList(),

                ProductTagging =
                    productTagging,

                Visibility =
                    visibility,

                Status =
                    string.IsNullOrWhiteSpace(
                        request.Status
                    )
                        ? existingProduct.Status
                        : request.Status.Trim(),

                // ==========================================
                // GIỮ NGUYÊN PUBLISH SCHEDULE
                //
                // FE sẽ gọi endpoint publish-schedule riêng
                // ngay sau updateProduct().
                // ==========================================

                PublishStatus =
                    existingProduct.PublishStatus,

                PublishAtUtc =
                    existingProduct.PublishAtUtc,

                PublishedAtUtc =
                    existingProduct.PublishedAtUtc,

                CreatedAtUtc =
                    existingProduct.CreatedAtUtc,

                UpdatedAtUtc =
                    DateTime.UtcNow
            };

        try
        {
            var updated =
                await _productService
                    .UpdateAsync(
                        id,
                        updatedProduct
                    );

            if (!updated)
            {
                DeleteLocalFiles(
                    uploadedImages
                );

                return BadRequest(new
                {
                    message =
                        "Không thể cập nhật sản phẩm."
                });
            }

            /*
             * Chỉ xóa file cũ sau khi MongoDB update thành công.
             * Nếu update fail, ảnh cũ vẫn phải còn nguyên.
             */
            DeleteLocalFiles(
                removedImages
            );

            var savedProduct =
                await _productService
                    .GetByIdAdminAsync(id);

            return Ok(new
            {
                message =
                    "Cập nhật sản phẩm thành công.",

                product =
                    savedProduct
            });
        }
        catch (MongoWriteException ex)
            when (
                ex.WriteError?.Code ==
                11000
            )
        {
            DeleteLocalFiles(
                uploadedImages
            );

            _logger.LogWarning(
                ex,
                "[ProductsController] Duplicate key while updating product {ProductId}. SKU={Sku}, Slug={Slug}",
                id,
                normalizedSku,
                finalSlug
            );

            return Conflict(new
            {
                message =
                    "SKU hoặc đường dẫn sản phẩm đã tồn tại.",
                sku =
                    normalizedSku,
                slug =
                    finalSlug
            });
        }
        catch (Exception ex)
        {
            DeleteLocalFiles(
                uploadedImages
            );

            _logger.LogError(
                ex,
                "[ProductsController] Product update failed. ProductId={ProductId}",
                id
            );

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message =
                        "Cập nhật sản phẩm thất bại.",
                    error =
                        ex.Message
                }
            );
        }
    }

    // ==================================================
    // ADMIN - DELETE PRODUCT
    //
    // DELETE /api/admin/products/{id}
    // ==================================================

    [HttpDelete("api/admin/products/{id}")]
    public async Task<IActionResult> DeleteProduct(
        string id
    )
    {
        var existingProduct =
            await _productService
                .GetByIdAdminAsync(id);

        if (existingProduct == null)
        {
            return NotFound(new
            {
                message =
                    "Không tìm thấy sản phẩm cần xóa."
            });
        }

        var deleted =
            await _productService
                .DeleteAsync(id);

        if (!deleted)
        {
            return BadRequest(new
            {
                message =
                    "Không thể xóa sản phẩm."
            });
        }

        /*
         * MongoDB đã xóa thành công thì mới cleanup file vật lý.
         * Lỗi xóa file không làm request delete product thất bại.
         */
        DeleteLocalFiles(
            existingProduct.Images
                ?? new List<ProductImage>()
        );

        return Ok(new
        {
            message =
                "Xóa sản phẩm thành công."
        });
    }

    // ==================================================
    // ADMIN - UPDATE PUBLISH SCHEDULE
    //
    // PUT /api/admin/products/{id}/publish-schedule
    // ==================================================

    [HttpPut("api/admin/products/{id}/publish-schedule")]
    public async Task<IActionResult> UpdatePublishSchedule(
        string id,
        [FromBody] ProductPublishScheduleRequest request
    )
    {
        var existingProduct =
            await _productService
                .GetByIdAdminAsync(id);

        if (existingProduct == null)
        {
            return NotFound(new
            {
                message =
                    "Không tìm thấy sản phẩm cần cập nhật lịch đăng."
            });
        }

        var normalizedPublishStatus =
            NormalizePublishStatus(
                request.PublishStatus
            );

        var nowUtc =
            DateTime.UtcNow;

        var update =
            Builders<Product>
                .Update;

        UpdateDefinition<Product>
            updateDefinition;

        if (
            normalizedPublishStatus ==
            "Scheduled"
        )
        {
            if (
                !request
                    .PublishAtUtc
                    .HasValue
            )
            {
                return BadRequest(new
                {
                    message =
                        "Vui lòng chọn thời gian đăng sản phẩm."
                });
            }

            var normalizedTime =
                NormalizeUtc(
                    request
                        .PublishAtUtc
                        .Value
                );

            if (
                normalizedTime <=
                nowUtc
            )
            {
                return BadRequest(new
                {
                    message =
                        "Thời gian hẹn đăng phải lớn hơn thời gian hiện tại."
                });
            }

            updateDefinition =
                update
                    .Set(
                        x => x.PublishStatus,
                        "Scheduled"
                    )
                    .Set(
                        x => x.PublishAtUtc,
                        normalizedTime
                    )
                    .Set(
                        x => x.PublishedAtUtc,
                        null
                    )
                    .Set(
                        x => x.UpdatedAtUtc,
                        nowUtc
                    );
        }
        else if (
            normalizedPublishStatus ==
            "Draft"
        )
        {
            updateDefinition =
                update
                    .Set(
                        x => x.PublishStatus,
                        "Draft"
                    )
                    .Set(
                        x => x.PublishAtUtc,
                        null
                    )
                    .Set(
                        x => x.PublishedAtUtc,
                        null
                    )
                    .Set(
                        x => x.UpdatedAtUtc,
                        nowUtc
                    );
        }
        else
        {
            updateDefinition =
                update
                    .Set(
                        x => x.PublishStatus,
                        "Published"
                    )
                    .Set(
                        x => x.PublishAtUtc,
                        null
                    )
                    .Set(
                        x => x.PublishedAtUtc,
                        nowUtc
                    )
                    .Set(
                        x => x.UpdatedAtUtc,
                        nowUtc
                    );
        }

        var result =
            await _mongoContext
                .Products
                .UpdateOneAsync(
                    x => x.Id == id,
                    updateDefinition
                );

        if (
            result.MatchedCount == 0
        )
        {
            return NotFound(new
            {
                message =
                    "Không tìm thấy sản phẩm cần cập nhật lịch đăng."
            });
        }

        var updatedProduct =
            await _productService
                .GetByIdAdminAsync(id);

        return Ok(new
        {
            message =
                normalizedPublishStatus ==
                "Scheduled"
                    ? "Đã cập nhật lịch tự động đăng sản phẩm."
                    : normalizedPublishStatus ==
                      "Draft"
                        ? "Đã chuyển sản phẩm về trạng thái nháp."
                        : "Sản phẩm đã được đăng ngay.",

            product =
                updatedProduct
        });
    }

    // ==================================================
    // PUBLIC - DYNAMIC PRODUCT MENU SOURCE
    //
    // GET /api/product-menu
    //
    // Chỉ đọc ProductCategories.
    // KHÔNG đọc/ghi Product document.
    // KHÔNG đổi URL, ảnh, SEO, giá hoặc filter sản phẩm.
    // ==================================================

    [HttpGet("api/product-menu")]
    public async Task<IActionResult>
        GetPublicProductMenuSource()
    {
        var categories =
            await _mongoContext
                .Database
                .GetCollection<ProductCategory>(
                    "ProductCategories"
                )
                .Find(x =>
                    x.IsActive &&
                    x.ShowOnMenu
                )
                .SortBy(x =>
                    x.SortOrder
                )
                .ThenBy(x =>
                    x.Name
                )
                .ToListAsync();

        return Ok(new
        {
            categories
        });
    }


    // ==================================================
    // PUBLIC - GET PRODUCTS
    //
    // GET /api/products
    // ==================================================

    [HttpGet("api/products")]
    public async Task<IActionResult> GetPublicProducts()
    {
        /*
         * LEGACY / BACKWARD-COMPATIBILITY ENDPOINT.
         *
         * ProductPage hiện tại vẫn đang cần full Product:
         * - images[]
         * - tags[]
         * - visibility
         * - publishStatus
         *
         * Vì vậy giữ endpoint này trong giai đoạn migration
         * để frontend hiện tại không bị trắng danh sách sản phẩm.
         *
         * Sau khi ProductPage.tsx chuyển sang endpoint /paged,
         * endpoint này có thể được deprecate.
         */
        var products =
            await _productService
                .GetPublicProductsAsync();

        return Ok(new
        {
            products
        });
    }

    // ==================================================
    // PUBLIC - PAGED PRODUCTS
    //
    // GET /api/products/paged
    //
    // Ví dụ:
    // /api/products/paged?page=1&pageSize=24
    // /api/products/paged?page=1&pageSize=24&search=ngoc
    // /api/products/paged?page=1&pageSize=24&categoryId=nhan-ngoc
    // /api/products/paged?page=1&pageSize=24&sort=price-asc
    // ==================================================

    [HttpGet("api/products/paged")]
    public async Task<IActionResult> GetPublicProductsPaged(
        [FromQuery] ProductQuery query
    )
    {
        // ==================================================
        // BACKWARD COMPATIBILITY CHO FILTER CATEGORY
        //
        // FE cũ đang gửi slug cố định, ví dụ:
        // - vong-ngoc-thien-nhien
        // - vong-ngoc-bich
        //
        // Sau migration, các sản phẩm Vòng Ngọc lưu Mongo ObjectId thật.
        // Vì vậy trước khi query Products, nếu giá trị truyền vào là slug
        // và ProductCategories có slug tương ứng thì đổi slug -> ObjectId.
        // Các taxonomy cũ chưa migrate (vd. trang-suc-ngoc) không có record
        // trong ProductCategories thì giữ nguyên slug để không phá dữ liệu cũ.
        // ==================================================

        query.ParentCategoryId =
            await ResolvePublicCategoryFilterIdAsync(
                query.ParentCategoryId
            );

        query.CategoryId =
            await ResolvePublicCategoryFilterIdAsync(
                query.CategoryId
            );

        var result =
            await _productService
                .GetPublicProductsAsync(
                    query
                );

        return Ok(new
        {
            products =
                result.Items,

            items =
                result.Items,

            page =
                result.Page,

            pageSize =
                result.PageSize,

            total =
                result.Total,

            totalPages =
                result.TotalPages,

            hasPreviousPage =
                result.HasPreviousPage,

            hasNextPage =
                result.HasNextPage
        });
    }

    // ==================================================
    // PUBLIC CATEGORY FILTER COMPATIBILITY
    // ==================================================

    private async Task<string?> ResolvePublicCategoryFilterIdAsync(
        string? value
    )
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        var normalized =
            value.Trim();

        // Đã là Mongo ObjectId thật thì giữ nguyên.
        if (ObjectId.TryParse(normalized, out _))
        {
            return normalized;
        }

        try
        {
            var categories =
                _mongoContext.Database
                    .GetCollection<ProductCategory>(
                        "ProductCategories"
                    );

            var matched =
                await categories
                    .Find(x =>
                        x.Slug == normalized
                    )
                    .FirstOrDefaultAsync();

            // Có category Mongo tương ứng -> dùng ObjectId thật.
            if (
                matched != null &&
                !string.IsNullOrWhiteSpace(matched.Id)
            )
            {
                return matched.Id;
            }
        }
        catch (Exception ex)
        {
            // Không để lỗi resolve category làm trắng ProductPage.
            _logger.LogWarning(
                ex,
                "[ProductsController] Cannot resolve public category filter {CategoryFilter}",
                normalized
            );
        }

        // Không có ProductCategories record -> taxonomy cũ vẫn dùng slug.
        return normalized;
    }

    // ==================================================
    // PUBLIC - MENU PRODUCTS
    //
    // GET /api/products/menu
    // ==================================================

    [HttpGet("api/products/menu")]
    public async Task<IActionResult> GetMenuProducts()
    {
        /*
         * ProductService đã lọc:
         * - active
         * - Visibility.IsPublished
         * - PublishStatus = Published
         * - ShowOnMenu
         *
         * Không lọc lại bằng LINQ trong Controller.
         */
        var products =
            await _productService
                .GetMenuProductsAsync();

        return Ok(new
        {
            products
        });
    }

    // ==================================================
    // PUBLIC - PRODUCT DETAIL
    //
    // GET /api/products/{slug}
    // ==================================================

    [HttpGet("api/products/{slug}")]
    public async Task<IActionResult> GetProductDetail(
        string slug,
        [FromQuery] string? id = null
    )
    {
        Product? product = null;

        /*
         * FIX TOÀN HỆ THỐNG:
         *
         * 1. Nếu frontend gửi Product ID:
         *    -> lấy đúng document theo ID.
         *
         * 2. Nếu là URL/link cũ không có ID:
         *    -> fallback theo slug để giữ backward compatibility.
         *
         * Không sửa category, ảnh, giá hay dữ liệu sản phẩm.
         * Vòng Ngọc / Trang Sức / Chuỗi Ngọc đều đi chung cơ chế này.
         */
        if (!string.IsNullOrWhiteSpace(id))
        {
            product =
                await _productService
                    .GetPublicByIdAsync(
                        id
                    );
        }

        if (product == null)
        {
            product =
                await _productService
                    .GetBySlugAsync(
                        slug
                    );
        }

        if (
            product == null
            ||
            product.Visibility == null
            ||
            !product.Visibility.IsPublished
            ||
            !string.Equals(
                product.PublishStatus,
                "Published",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return NotFound(new
            {
                message =
                    "Không tìm thấy sản phẩm."
            });
        }

        return Ok(new
        {
            product,

            /*
             * FE hiện chưa bắt buộc dùng field này.
             * Giữ lại để debug / canonical URL sau này nếu cần.
             */
            resolvedBy =
                !string.IsNullOrWhiteSpace(id)
                    ? "id"
                    : "slug",

            canonicalSlug =
                product.Slug
        });
    }

    // ==================================================
    // CATEGORY RESOLVER
    //
    // QUAN TRỌNG:
    // - ProductCategory.Id trong MongoDB mới là ID dùng để filter.
    // - FixedProductMenu chỉ giữ slug/name để kiểm tra menu hợp lệ.
    // - Hỗ trợ FE cũ gửi slug, nhưng khi lưu Product luôn đổi về
    //   ProductCategory.Id thật trong MongoDB.
    // ==================================================

    private async Task<CategoryResolveResult>
        ResolveCategoryAsync(
            string? parentCategoryId,
            string? parentCategoryName,
            string? categoryId,
            string? categoryName
        )
    {
        parentCategoryId =
            parentCategoryId?.Trim()
            ?? "";

        parentCategoryName =
            parentCategoryName?.Trim()
            ?? "";

        categoryId =
            categoryId?.Trim()
            ?? "";

        categoryName =
            categoryName?.Trim()
            ?? "";

        if (
            string.IsNullOrWhiteSpace(
                categoryId
            )
            &&
            string.IsNullOrWhiteSpace(
                categoryName
            )
        )
        {
            return CategoryResolveResult.Fail(
                "Vui lòng chọn mục sản phẩm."
            );
        }

        var categories =
            await _mongoContext
                .Database
                .GetCollection<ProductCategory>(
                    "ProductCategories"
                )
                .Find(_ => true)
                .ToListAsync();

        if (categories.Count == 0)
        {
            return CategoryResolveResult.Fail(
                "Chưa có dữ liệu ProductCategories."
            );
        }

        /*
         * ==================================================
         * RESOLVE DANH MỤC MENU
         *
         * Hỗ trợ cả:
         * - Mongo ObjectId hiện tại
         * - slug cũ / slug public
         * - tên cũ
         *
         * Chỉ tìm ROOT (ParentId rỗng).
         * ==================================================
         */

        ProductCategory? requestedParent =
            null;

        if (
            !string.IsNullOrWhiteSpace(
                parentCategoryId
            )
        )
        {
            requestedParent =
                categories
                    .Where(x =>
                        string.IsNullOrWhiteSpace(
                            x.ParentId
                        )
                    )
                    .FirstOrDefault(x =>
                        string.Equals(
                            x.Id,
                            parentCategoryId,
                            StringComparison.OrdinalIgnoreCase
                        )
                        ||
                        string.Equals(
                            x.Slug,
                            parentCategoryId,
                            StringComparison.OrdinalIgnoreCase
                        )
                        ||
                        string.Equals(
                            Slugify(x.Name),
                            Slugify(
                                parentCategoryId
                            ),
                            StringComparison.OrdinalIgnoreCase
                        )
                    );
        }

        if (
            requestedParent == null
            &&
            !string.IsNullOrWhiteSpace(
                parentCategoryName
            )
        )
        {
            requestedParent =
                categories
                    .Where(x =>
                        string.IsNullOrWhiteSpace(
                            x.ParentId
                        )
                    )
                    .FirstOrDefault(x =>
                        string.Equals(
                            x.Name,
                            parentCategoryName,
                            StringComparison.OrdinalIgnoreCase
                        )
                    );
        }

        /*
         * ==================================================
         * RESOLVE MỤC SẢN PHẨM
         *
         * ProductCategory vẫn giữ kiến trúc cũ 2 tầng:
         *
         * ROOT -> LEAF
         *
         * MenuGroupId/MenuGroupName chỉ là metadata UI.
         * ==================================================
         */

        ProductCategory? leaf =
            null;

        if (
            !string.IsNullOrWhiteSpace(
                categoryId
            )
        )
        {
            leaf =
                categories
                    .Where(x =>
                        !string.IsNullOrWhiteSpace(
                            x.ParentId
                        )
                    )
                    .FirstOrDefault(x =>
                        string.Equals(
                            x.Id,
                            categoryId,
                            StringComparison.OrdinalIgnoreCase
                        )
                        ||
                        string.Equals(
                            x.Slug,
                            categoryId,
                            StringComparison.OrdinalIgnoreCase
                        )
                        ||
                        string.Equals(
                            Slugify(x.Name),
                            Slugify(
                                categoryId
                            ),
                            StringComparison.OrdinalIgnoreCase
                        )
                    );
        }

        if (
            leaf == null
            &&
            !string.IsNullOrWhiteSpace(
                categoryName
            )
        )
        {
            var sameName =
                categories
                    .Where(x =>
                        !string.IsNullOrWhiteSpace(
                            x.ParentId
                        )
                        &&
                        string.Equals(
                            x.Name,
                            categoryName,
                            StringComparison.OrdinalIgnoreCase
                        )
                    )
                    .ToList();

            if (requestedParent != null)
            {
                leaf =
                    sameName
                        .FirstOrDefault(x =>
                            string.Equals(
                                x.ParentId,
                                requestedParent.Id,
                                StringComparison.OrdinalIgnoreCase
                            )
                        );
            }
            else if (
                sameName.Count == 1
            )
            {
                leaf =
                    sameName[0];
            }
        }

        if (leaf == null)
        {
            return CategoryResolveResult.Fail(
                "Không tìm thấy mục sản phẩm trong ProductCategories."
            );
        }

        if (!leaf.IsActive)
        {
            return CategoryResolveResult.Fail(
                $"Mục sản phẩm '{leaf.Name}' đang bị tắt."
            );
        }

        if (
            string.IsNullOrWhiteSpace(
                leaf.ParentId
            )
        )
        {
            return CategoryResolveResult.Fail(
                "Không thể dùng danh mục menu làm mục sản phẩm."
            );
        }

        var actualParent =
            categories
                .FirstOrDefault(x =>
                    string.Equals(
                        x.Id,
                        leaf.ParentId,
                        StringComparison.OrdinalIgnoreCase
                    )
                );

        if (actualParent == null)
        {
            return CategoryResolveResult.Fail(
                $"Danh mục menu của '{leaf.Name}' không tồn tại."
            );
        }

        if (
            !string.IsNullOrWhiteSpace(
                actualParent.ParentId
            )
        )
        {
            return CategoryResolveResult.Fail(
                "Dữ liệu ProductCategories không đúng kiến trúc 2 tầng hiện tại."
            );
        }

        /*
         * Nếu FE đã gửi parent thì parent phải đúng với
         * ParentId thật của leaf.
         */
        if (
            requestedParent != null
            &&
            !string.Equals(
                requestedParent.Id,
                actualParent.Id,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return CategoryResolveResult.Fail(
                "Mục sản phẩm không thuộc danh mục menu đã chọn."
            );
        }

        if (
            !string.IsNullOrWhiteSpace(
                parentCategoryName
            )
            &&
            !string.Equals(
                actualParent.Name,
                parentCategoryName,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return CategoryResolveResult.Fail(
                "Tên danh mục chính không khớp dữ liệu ProductCategories."
            );
        }

        /*
         * ==================================================
         * BACKWARD COMPATIBILITY
         *
         * FixedProductMenu VẪN ĐƯỢC GIỮ NGUYÊN ở Controller
         * cho các luồng audit/repair cũ.
         *
         * Tuy nhiên KHÔNG dùng FixedProductMenu để CHẶN category mới.
         *
         * Category mới chỉ cần hợp lệ trong ProductCategories.
         * Product vẫn lưu Mongo ObjectId thật như trước.
         * ==================================================
         */

        return CategoryResolveResult.Ok(
            actualParent.Id ?? "",
            actualParent.Name,
            leaf.Id ?? "",
            leaf.Name
        );
    }


    // ==================================================
    // ADMIN - GLOBAL PRODUCT SLUG AUDIT / REPAIR
    //
    // URL sạch theo đúng yêu cầu:
    // ten-san-pham
    // ten-san-pham-1
    // ten-san-pham-2
    // ten-san-pham-3
    //
    // KHÔNG dùng SKU.
    // KHÔNG dùng Mongo Product ID trong URL.
    //
    // GET:
    // /api/admin/products/slug-duplicate-audit
    //
    // POST:
    // /api/admin/products/repair-duplicate-slugs
    // ?apply=true
    // &expectedTotalProducts=343
    // &expectedProposedChanges=<số preview>
    //
    // SAFETY:
    // - Chỉ update field Slug + UpdatedAtUtc.
    // - Không Delete.
    // - Không Replace document.
    // - Không đổi category / ảnh / giá / SKU / mô tả.
    // - Giữ 1 record cho mỗi slug cũ để bảo toàn URL hiện có.
    // - Chỉ sửa các record đang TRÙNG slug.
    // ==================================================

    [HttpGet("api/admin/products/slug-duplicate-audit")]
    public async Task<IActionResult>
        AuditAllDuplicateProductSlugs()
    {
        try
        {
            var plan =
                await BuildGlobalCleanSlugRepairPlanAsync();

            return Ok(new
            {
                success =
                    true,

                mode =
                    "PREVIEW_ONLY",

                totalProducts =
                    plan.TotalProducts,

                productsWithSlug =
                    plan.ProductsWithSlug,

                emptySlugCount =
                    plan.EmptySlugCount,

                duplicateSlugGroups =
                    plan.DuplicateSlugGroups,

                productsInsideDuplicateGroups =
                    plan.ProductsInsideDuplicateGroups,

                proposedChangeCount =
                    plan.Changes.Count,

                writeOperations =
                    0,

                deleteOperations =
                    0,

                duplicateProducts =
                    plan.DuplicateProducts,

                proposedChanges =
                    plan.Changes.Select(change =>
                        new
                        {
                            productId =
                                change.ProductId,

                            change.Name,
                            change.Sku,

                            change.ParentCategoryName,
                            change.CategoryName,

                            fromSlug =
                                change.FromSlug,

                            toSlug =
                                change.ToSlug
                        }
                    ),

                safety =
                    "PREVIEW ONLY: không update, không delete. Slug mới chỉ gồm tên sản phẩm + số thứ tự khi cần."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "[ProductsController] Global clean slug audit failed."
            );

            return Ok(new
            {
                success =
                    false,

                mode =
                    "PREVIEW_ERROR",

                error =
                    ex.Message,

                exceptionType =
                    ex.GetType().FullName,

                innerError =
                    ex.InnerException?.Message,

                writeOperations =
                    0,

                deleteOperations =
                    0,

                safety =
                    "Có lỗi khi PREVIEW; không có thao tác ghi/xóa dữ liệu."
            });
        }
    }


    [HttpPost("api/admin/products/repair-duplicate-slugs")]
    public async Task<IActionResult>
        RepairAllDuplicateProductSlugs(
            [FromQuery] bool apply = false,
            [FromQuery] int expectedTotalProducts = 0,
            [FromQuery] int expectedProposedChanges = 0
        )
    {
        if (!apply)
        {
            return BadRequest(new
            {
                message =
                    "Chưa apply. Hãy chạy PREVIEW trước.",

                writeOperations =
                    0,

                deleteOperations =
                    0
            });
        }

        var plan =
            await BuildGlobalCleanSlugRepairPlanAsync();

        /*
         * Safety gate #1:
         * tổng product phải đúng như preview.
         */
        if (
            expectedTotalProducts <= 0
            ||
            plan.TotalProducts !=
            expectedTotalProducts
        )
        {
            return Conflict(new
            {
                message =
                    "Tổng số sản phẩm hiện tại khác PREVIEW. Dừng APPLY.",

                expectedTotalProducts,

                actualTotalProducts =
                    plan.TotalProducts,

                writeOperations =
                    0,

                deleteOperations =
                    0
            });
        }

        /*
         * Safety gate #2:
         * số lượng proposal phải đúng như preview.
         */
        if (
            expectedProposedChanges < 0
            ||
            plan.Changes.Count !=
            expectedProposedChanges
        )
        {
            return Conflict(new
            {
                message =
                    "Số slug cần sửa đã thay đổi so với PREVIEW. Dừng APPLY.",

                expectedProposedChanges,

                actualProposedChanges =
                    plan.Changes.Count,

                writeOperations =
                    0,

                deleteOperations =
                    0
            });
        }

        /*
         * Safety gate #3:
         * không apply nếu có slug rỗng.
         */
        if (plan.EmptySlugCount > 0)
        {
            return Conflict(new
            {
                message =
                    "Có sản phẩm slug rỗng. Dừng APPLY để xử lý riêng.",

                emptySlugCount =
                    plan.EmptySlugCount,

                writeOperations =
                    0,

                deleteOperations =
                    0
            });
        }

        var applied =
            new List<SlugRepairAppliedItem>();

        try
        {
            foreach (var change in plan.Changes)
            {
                var updated =
                    await _productService
                        .UpdateProductSlugAsync(
                            change.ProductId,
                            change.ToSlug
                        );

                if (!updated)
                {
                    throw new InvalidOperationException(
                        $"Không thể cập nhật slug cho ProductId={change.ProductId}."
                    );
                }

                applied.Add(
                    new SlugRepairAppliedItem(
                        change.ProductId,
                        change.FromSlug,
                        change.ToSlug
                    )
                );
            }

            /*
             * Verify sau apply.
             */
            var verifyProducts =
                await _productService
                    .GetAllProductsForSlugMaintenanceAsync();

            var totalProductsAfter =
                verifyProducts.Count;

            var duplicateGroupsAfter =
                verifyProducts
                    .Where(product =>
                        !string.IsNullOrWhiteSpace(
                            product.Slug
                        )
                    )
                    .GroupBy(
                        product =>
                            (product.Slug ?? "")
                                .Trim(),
                        StringComparer.OrdinalIgnoreCase
                    )
                    .Where(group =>
                        group.Count() > 1
                    )
                    .ToList();

            if (
                totalProductsAfter !=
                plan.TotalProducts
            )
            {
                throw new InvalidOperationException(
                    $"Tổng sản phẩm thay đổi: before={plan.TotalProducts}, after={totalProductsAfter}."
                );
            }

            if (
                duplicateGroupsAfter.Count >
                0
            )
            {
                throw new InvalidOperationException(
                    $"Sau APPLY vẫn còn {duplicateGroupsAfter.Count} nhóm slug trùng."
                );
            }

            return Ok(new
            {
                success =
                    true,

                mode =
                    "APPLY",

                totalProductsBefore =
                    plan.TotalProducts,

                totalProductsAfter,

                duplicateSlugGroupsBefore =
                    plan.DuplicateSlugGroups,

                duplicateSlugGroupsAfter =
                    duplicateGroupsAfter.Count,

                repaired =
                    applied.Count,

                writeOperations =
                    applied.Count,

                deleteOperations =
                    0,

                changedProducts =
                    applied.Select(item =>
                        new
                        {
                            productId =
                                item.ProductId,

                            fromSlug =
                                item.FromSlug,

                            toSlug =
                                item.ToSlug
                        }
                    ),

                safety =
                    "Chỉ cập nhật Slug + UpdatedAtUtc. Không xóa sản phẩm, không đổi category, ảnh, giá, SKU hay nội dung."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "[ProductsController] Global clean slug repair failed. Rolling back."
            );

            var rollbackErrors =
                new List<string>();

            /*
             * Best-effort rollback:
             * trả slug đã đổi về đúng slug cũ.
             */
            for (
                var index =
                    applied.Count - 1;
                index >= 0;
                index--
            )
            {
                var item =
                    applied[index];

                try
                {
                    var rolledBack =
                        await _productService
                            .UpdateProductSlugAsync(
                                item.ProductId,
                                item.FromSlug
                            );

                    if (!rolledBack)
                    {
                        rollbackErrors.Add(
                            $"Rollback failed: {item.ProductId}"
                        );
                    }
                }
                catch (Exception rollbackEx)
                {
                    rollbackErrors.Add(
                        $"{item.ProductId}: {rollbackEx.Message}"
                    );
                }
            }

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success =
                        false,

                    mode =
                        "APPLY_FAILED",

                    error =
                        ex.Message,

                    appliedBeforeFailure =
                        applied.Count,

                    rollbackAttempted =
                        applied.Count,

                    rollbackErrors,

                    deleteOperations =
                        0,

                    safety =
                        "Không có thao tác delete. Hệ thống đã thử rollback các slug đã đổi trước khi lỗi."
                }
            );
        }
    }


    /*
     * Tạo plan duy nhất cho cả PREVIEW và APPLY.
     * Nhờ vậy hai bước dùng đúng cùng một thuật toán.
     */
    private async Task<GlobalSlugRepairPlan>
        BuildGlobalCleanSlugRepairPlanAsync()
    {
        var products =
            await _productService
                .GetAllProductsForSlugMaintenanceAsync();

        var emptySlugCount =
            products.Count(product =>
                string.IsNullOrWhiteSpace(
                    product.Slug
                )
            );

        var productsWithSlug =
            products
                .Where(product =>
                    !string.IsNullOrWhiteSpace(
                        product.Slug
                    )
                )
                .ToList();

        var duplicateGroups =
            productsWithSlug
                .GroupBy(
                    product =>
                        (product.Slug ?? "")
                            .Trim(),
                    StringComparer.OrdinalIgnoreCase
                )
                .Where(group =>
                    group.Count() > 1
                )
                .OrderBy(group =>
                    group.Key
                )
                .ToList();

        /*
         * Reserve toàn bộ slug đang có.
         * Vì vậy slug mới sẽ không đụng bất kỳ sản phẩm nào.
         */
        var reservedSlugs =
            productsWithSlug
                .Select(product =>
                    (product.Slug ?? "")
                        .Trim()
                )
                .ToHashSet(
                    StringComparer.OrdinalIgnoreCase
                );

        var duplicateProducts =
            new List<object>();

        var changes =
            new List<GlobalSlugRepairChange>();

        var productsInsideDuplicateGroups =
            0;

        foreach (var group in duplicateGroups)
        {
            var orderedProducts =
                group
                    .OrderBy(product =>
                        product.CreatedAtUtc
                    )
                    .ThenBy(product =>
                        product.Id
                    )
                    .ToList();

            productsInsideDuplicateGroups +=
                orderedProducts.Count;

            /*
             * Giữ record cũ nhất của mỗi slug hiện tại.
             * Như vậy ít nhất 1 URL cũ vẫn được giữ nguyên.
             */
            for (
                var index = 0;
                index < orderedProducts.Count;
                index++
            )
            {
                var product =
                    orderedProducts[index];

                duplicateProducts.Add(new
                {
                    duplicateSlug =
                        group.Key,

                    action =
                        index == 0
                            ? "KEEP"
                            : "PROPOSE_CHANGE",

                    productId =
                        product.Id ?? "",

                    name =
                        product.Name ?? "",

                    sku =
                        product.Sku ?? "",

                    parentCategoryName =
                        product.ParentCategoryName ?? "",

                    categoryName =
                        product.CategoryName ?? "",

                    currentSlug =
                        product.Slug ?? ""
                });
            }

            /*
             * Chỉ sửa record thứ 2 trở đi trong mỗi exact duplicate group.
             */
            foreach (
                var product
                in orderedProducts.Skip(1)
            )
            {
                var productId =
                    (product.Id ?? "")
                        .Trim();

                var currentSlug =
                    (product.Slug ?? "")
                        .Trim();

                if (
                    string.IsNullOrWhiteSpace(
                        productId
                    )
                    ||
                    string.IsNullOrWhiteSpace(
                        currentSlug
                    )
                )
                {
                    throw new InvalidOperationException(
                        "Có record duplicate thiếu Product ID hoặc Slug."
                    );
                }

                /*
                 * URL mới dựa vào TÊN sản phẩm.
                 *
                 * Ví dụ:
                 * Phật Bà Quan Âm
                 * -> phat-ba-quan-am
                 * -> phat-ba-quan-am-1
                 * -> phat-ba-quan-am-2
                 *
                 * Không có SKU và không có Mongo ID.
                 */
                var productName =
                    (product.Name ?? "")
                        .Trim();

                var baseSlug =
                    !string.IsNullOrWhiteSpace(
                        productName
                    )
                        ? Slugify(
                            productName
                        )
                        : "";

                /*
                 * Fallback hiếm:
                 * nếu tên rỗng thì dùng slug hiện tại,
                 * bỏ suffix số cuối để cố giữ URL dạng tên + số.
                 */
                if (
                    string.IsNullOrWhiteSpace(
                        baseSlug
                    )
                )
                {
                    baseSlug =
                        Regex.Replace(
                            currentSlug,
                            @"-\d+$",
                            ""
                        );

                    baseSlug =
                        Slugify(
                            baseSlug
                        );
                }

                if (
                    string.IsNullOrWhiteSpace(
                        baseSlug
                    )
                )
                {
                    throw new InvalidOperationException(
                        $"Không thể tạo base slug cho ProductId={productId}."
                    );
                }

                /*
                 * Tìm slug sạch đầu tiên còn trống:
                 *
                 * ten-san-pham
                 * ten-san-pham-1
                 * ten-san-pham-2
                 * ...
                 */
                var candidate =
                    baseSlug;

                if (
                    reservedSlugs.Contains(
                        candidate
                    )
                )
                {
                    var number =
                        1;

                    do
                    {
                        candidate =
                            $"{baseSlug}-{number}";

                        number++;
                    }
                    while (
                        reservedSlugs.Contains(
                            candidate
                        )
                    );
                }

                reservedSlugs.Add(
                    candidate
                );

                changes.Add(
                    new GlobalSlugRepairChange(
                        productId,
                        product.Name ?? "",
                        product.Sku ?? "",
                        product.ParentCategoryName ?? "",
                        product.CategoryName ?? "",
                        currentSlug,
                        candidate
                    )
                );
            }
        }

        return new GlobalSlugRepairPlan(
            products.Count,
            productsWithSlug.Count,
            emptySlugCount,
            duplicateGroups.Count,
            productsInsideDuplicateGroups,
            duplicateProducts,
            changes
        );
    }


    private sealed record
        GlobalSlugRepairChange(
            string ProductId,
            string Name,
            string Sku,
            string ParentCategoryName,
            string CategoryName,
            string FromSlug,
            string ToSlug
        );


    private sealed record
        SlugRepairAppliedItem(
            string ProductId,
            string FromSlug,
            string ToSlug
        );


    private sealed record
        GlobalSlugRepairPlan(
            int TotalProducts,
            int ProductsWithSlug,
            int EmptySlugCount,
            int DuplicateSlugGroups,
            int ProductsInsideDuplicateGroups,
            List<object> DuplicateProducts,
            List<GlobalSlugRepairChange> Changes
        );


    // ==================================================
    // ADMIN - CLEAN URL PREVIEW V2
    // CHỈ: Trang Sức Ngọc > Chuỗi Ngọc Đeo Cổ
    //
    // Route V2 riêng để tránh đụng bất kỳ endpoint cũ nào:
    // GET /api/admin/products/necklace-clean-url-audit-v2
    //
    // PREVIEW ONLY - KHÔNG GHI DATABASE.
    // ==================================================

    [HttpGet("api/admin/products/necklace-clean-url-audit-v2")]
    public async Task<IActionResult>
        AuditNecklaceCleanUrlV2()
    {
        try
        {
            var products =
                await _productService
                    .GetAllProductsForSlugMaintenanceAsync();

            /*
             * Không gọi IsJadeNecklaceProduct / Slugify ở bước lọc.
             * Dùng trực tiếp ID/tên category đang có trong database để
             * endpoint preview đơn giản và ổn định nhất có thể.
             */
            bool IsTarget(Product product)
            {
                var parentId =
                    (product.ParentCategoryId ?? "")
                        .Trim();

                var parentName =
                    (product.ParentCategoryName ?? "")
                        .Trim();

                var categoryId =
                    (product.CategoryId ?? "")
                        .Trim();

                var categoryName =
                    (product.CategoryName ?? "")
                        .Trim();

                var parentMatches =
                    string.Equals(
                        parentId,
                        "trang-suc-ngoc",
                        StringComparison.OrdinalIgnoreCase
                    )
                    ||
                    string.Equals(
                        parentName,
                        "Trang Sức Ngọc",
                        StringComparison.OrdinalIgnoreCase
                    );

                var categoryMatches =
                    string.Equals(
                        categoryId,
                        "chuoi-ngoc-deo-co",
                        StringComparison.OrdinalIgnoreCase
                    )
                    ||
                    string.Equals(
                        categoryName,
                        "Chuỗi Ngọc Đeo Cổ",
                        StringComparison.OrdinalIgnoreCase
                    );

                return
                    parentMatches
                    &&
                    categoryMatches;
            }

            var scopedProducts =
                products
                    .Where(IsTarget)
                    .OrderBy(product =>
                        product.CreatedAtUtc
                    )
                    .ThenBy(product =>
                        product.Id
                    )
                    .ToList();

            /*
             * Slug của sản phẩm NGOÀI scope được reserve.
             * Như vậy cleanup nhóm Chuỗi Ngọc Đeo Cổ không thể
             * đè URL của category khác.
             */
            var reservedOutsideScope =
                products
                    .Where(product =>
                        !IsTarget(product)
                    )
                    .Select(product =>
                        (product.Slug ?? "")
                            .Trim()
                    )
                    .Where(slug =>
                        !string.IsNullOrWhiteSpace(slug)
                    )
                    .ToHashSet(
                        StringComparer.OrdinalIgnoreCase
                    );

            var assignedTargets =
                new HashSet<string>(
                    reservedOutsideScope,
                    StringComparer.OrdinalIgnoreCase
                );

            var assignments =
                new List<object>();

            var changes =
                new List<object>();

            const string baseSlug =
                "chuoi-ngoc-deo-co";

            var nextNumber = 0;

            foreach (var product in scopedProducts)
            {
                string targetSlug;

                while (true)
                {
                    targetSlug =
                        nextNumber == 0
                            ? baseSlug
                            : $"{baseSlug}-{nextNumber}";

                    nextNumber++;

                    if (
                        !assignedTargets.Contains(
                            targetSlug
                        )
                    )
                    {
                        break;
                    }
                }

                assignedTargets.Add(
                    targetSlug
                );

                var productId =
                    (product.Id ?? "")
                        .Trim();

                var currentSlug =
                    (product.Slug ?? "")
                        .Trim();

                var needsChange =
                    !string.Equals(
                        currentSlug,
                        targetSlug,
                        StringComparison.OrdinalIgnoreCase
                    );

                assignments.Add(new
                {
                    productId,
                    name = product.Name ?? "",
                    sku = product.Sku ?? "",
                    currentSlug,
                    targetSlug,
                    action =
                        needsChange
                            ? "PROPOSE_CHANGE"
                            : "KEEP"
                });

                if (needsChange)
                {
                    changes.Add(new
                    {
                        productId,
                        name = product.Name ?? "",
                        sku = product.Sku ?? "",
                        fromSlug = currentSlug,
                        toSlug = targetSlug
                    });
                }
            }

            return Ok(new
            {
                success = true,
                mode = "PREVIEW_ONLY",
                scope = "Trang Sức Ngọc > Chuỗi Ngọc Đeo Cổ",
                totalProducts = products.Count,
                scopedProducts = scopedProducts.Count,
                proposedChangeCount = changes.Count,
                writeOperations = 0,
                deleteOperations = 0,
                assignments,
                proposedChanges = changes,
                safety =
                    "PREVIEW ONLY: không update, không delete; chỉ lập kế hoạch slug chuoi-ngoc-deo-co + số thứ tự."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "[ProductsController] Necklace clean URL audit V2 failed."
            );

            return Ok(new
            {
                success = false,
                mode = "PREVIEW_ERROR",
                error = ex.Message,
                exceptionType = ex.GetType().FullName,
                innerError = ex.InnerException?.Message,
                stackTrace = ex.StackTrace,
                writeOperations = 0,
                deleteOperations = 0
            });
        }
    }


    // ==================================================
    // ADMIN - APPLY CLEAN URL V2
    // CHỈ: Trang Sức Ngọc > Chuỗi Ngọc Đeo Cổ
    //
    // POST /api/admin/products/necklace-clean-url-apply-v2
    //      ?apply=true
    //      &expectedTotalProducts=<từ preview>
    //      &expectedScopedProducts=<từ preview>
    //      &expectedProposedChanges=<từ preview>
    //
    // SAFETY:
    // - Chỉ update Slug + UpdatedAtUtc.
    // - Không Delete.
    // - Không Replace document.
    // - Không đổi ảnh / giá / SKU / category / nội dung.
    // - Nếu số lượng hiện tại khác PREVIEW => dừng.
    // - Nếu lỗi giữa chừng => rollback best-effort.
    // ==================================================

    [HttpPost("api/admin/products/necklace-clean-url-apply-v2")]
    public async Task<IActionResult>
        ApplyNecklaceCleanUrlV2(
            [FromQuery] bool apply = false,
            [FromQuery] int expectedTotalProducts = 0,
            [FromQuery] int expectedScopedProducts = 0,
            [FromQuery] int expectedProposedChanges = 0
        )
    {
        if (!apply)
        {
            return BadRequest(new
            {
                success = false,
                message = "Chưa apply. Hãy chạy PREVIEW V2 trước rồi gọi lại với apply=true.",
                writeOperations = 0,
                deleteOperations = 0
            });
        }

        var products =
            await _productService
                .GetAllProductsForSlugMaintenanceAsync();

        var totalProductsBefore =
            products.Count;

        if (
            expectedTotalProducts <= 0
            ||
            totalProductsBefore != expectedTotalProducts
        )
        {
            return Conflict(new
            {
                success = false,
                message = "Tổng số sản phẩm hiện tại khác PREVIEW. Dừng APPLY.",
                expectedTotalProducts,
                actualTotalProducts = totalProductsBefore,
                writeOperations = 0,
                deleteOperations = 0
            });
        }

        /*
         * Lọc đúng scope theo cùng logic V2.
         */
        var scopedProducts =
            products
                .Where(product =>
                    string.Equals(
                        (product.ParentCategoryName ?? "").Trim(),
                        "Trang Sức Ngọc",
                        StringComparison.OrdinalIgnoreCase
                    )
                    &&
                    string.Equals(
                        (product.CategoryName ?? "").Trim(),
                        "Chuỗi Ngọc Đeo Cổ",
                        StringComparison.OrdinalIgnoreCase
                    )
                )
                .OrderBy(product =>
                    product.CreatedAtUtc
                )
                .ThenBy(product =>
                    product.Id
                )
                .ToList();

        if (
            expectedScopedProducts <= 0
            ||
            scopedProducts.Count != expectedScopedProducts
        )
        {
            return Conflict(new
            {
                success = false,
                message = "Số sản phẩm trong scope khác PREVIEW. Dừng APPLY.",
                expectedScopedProducts,
                actualScopedProducts = scopedProducts.Count,
                writeOperations = 0,
                deleteOperations = 0
            });
        }

        /*
         * Reserve slug của sản phẩm ngoài scope.
         */
        var reservedSlugs =
            products
                .Where(product =>
                    !(
                        string.Equals(
                            (product.ParentCategoryName ?? "").Trim(),
                            "Trang Sức Ngọc",
                            StringComparison.OrdinalIgnoreCase
                        )
                        &&
                        string.Equals(
                            (product.CategoryName ?? "").Trim(),
                            "Chuỗi Ngọc Đeo Cổ",
                            StringComparison.OrdinalIgnoreCase
                        )
                    )
                )
                .Select(product =>
                    (product.Slug ?? "").Trim()
                )
                .Where(slug =>
                    !string.IsNullOrWhiteSpace(slug)
                )
                .ToHashSet(
                    StringComparer.OrdinalIgnoreCase
                );

        var plan =
            new List<(
                string ProductId,
                string Name,
                string Sku,
                string FromSlug,
                string ToSlug
            )>();

        /*
         * Tạo URL sạch:
         * chuoi-ngoc-deo-co
         * chuoi-ngoc-deo-co-1
         * chuoi-ngoc-deo-co-2
         * ...
         */
        var baseSlug = "chuoi-ngoc-deo-co";
        var suffixNumber = 0;

        foreach (var product in scopedProducts)
        {
            var productId =
                (product.Id ?? "").Trim();

            var fromSlug =
                (product.Slug ?? "").Trim();

            if (string.IsNullOrWhiteSpace(productId))
            {
                return Conflict(new
                {
                    success = false,
                    message = "Có sản phẩm trong scope thiếu Product ID. Dừng APPLY.",
                    writeOperations = 0,
                    deleteOperations = 0
                });
            }

            string candidate;

            while (true)
            {
                candidate =
                    suffixNumber == 0
                        ? baseSlug
                        : $"{baseSlug}-{suffixNumber}";

                suffixNumber++;

                if (!reservedSlugs.Contains(candidate))
                {
                    break;
                }
            }

            reservedSlugs.Add(candidate);

            if (
                !string.Equals(
                    fromSlug,
                    candidate,
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                plan.Add((
                    productId,
                    product.Name ?? "",
                    product.Sku ?? "",
                    fromSlug,
                    candidate
                ));
            }
        }

        if (
            expectedProposedChanges < 0
            ||
            plan.Count != expectedProposedChanges
        )
        {
            return Conflict(new
            {
                success = false,
                message = "Số slug cần sửa khác PREVIEW. Dừng APPLY.",
                expectedProposedChanges,
                actualProposedChanges = plan.Count,
                writeOperations = 0,
                deleteOperations = 0
            });
        }

        var applied =
            new List<(
                string ProductId,
                string FromSlug,
                string ToSlug
            )>();

        try
        {
            foreach (var change in plan)
            {
                var updated =
                    await _productService
                        .UpdateProductSlugAsync(
                            change.ProductId,
                            change.ToSlug
                        );

                if (!updated)
                {
                    throw new InvalidOperationException(
                        $"Không update được slug cho ProductId={change.ProductId}."
                    );
                }

                applied.Add((
                    change.ProductId,
                    change.FromSlug,
                    change.ToSlug
                ));
            }

            /*
             * Verify sau apply.
             */
            var productsAfter =
                await _productService
                    .GetAllProductsForSlugMaintenanceAsync();

            if (
                productsAfter.Count != totalProductsBefore
            )
            {
                throw new InvalidOperationException(
                    $"Tổng sản phẩm thay đổi: before={totalProductsBefore}, after={productsAfter.Count}."
                );
            }

            var scopedAfter =
                productsAfter
                    .Where(product =>
                        string.Equals(
                            (product.ParentCategoryName ?? "").Trim(),
                            "Trang Sức Ngọc",
                            StringComparison.OrdinalIgnoreCase
                        )
                        &&
                        string.Equals(
                            (product.CategoryName ?? "").Trim(),
                            "Chuỗi Ngọc Đeo Cổ",
                            StringComparison.OrdinalIgnoreCase
                        )
                    )
                    .ToList();

            if (
                scopedAfter.Count != scopedProducts.Count
            )
            {
                throw new InvalidOperationException(
                    $"Số sản phẩm Chuỗi Ngọc Đeo Cổ thay đổi: before={scopedProducts.Count}, after={scopedAfter.Count}."
                );
            }

            var duplicateGroupsAfter =
                productsAfter
                    .Where(product =>
                        !string.IsNullOrWhiteSpace(product.Slug)
                    )
                    .GroupBy(
                        product =>
                            (product.Slug ?? "").Trim(),
                        StringComparer.OrdinalIgnoreCase
                    )
                    .Where(group =>
                        group.Count() > 1
                    )
                    .ToList();

            if (duplicateGroupsAfter.Count > 0)
            {
                throw new InvalidOperationException(
                    $"Sau APPLY vẫn còn {duplicateGroupsAfter.Count} nhóm slug trùng."
                );
            }

            var badScopedSlugs =
                scopedAfter
                    .Where(product =>
                    {
                        var slug =
                            (product.Slug ?? "").Trim();

                        return
                            slug.Contains(
                                "-kj-",
                                StringComparison.OrdinalIgnoreCase
                            )
                            ||
                            slug.Contains(
                                "-cndc-",
                                StringComparison.OrdinalIgnoreCase
                            );
                    })
                    .Select(product =>
                        new
                        {
                            productId = product.Id,
                            product.Name,
                            product.Sku,
                            product.Slug
                        }
                    )
                    .ToList();

            if (badScopedSlugs.Count > 0)
            {
                throw new InvalidOperationException(
                    $"Sau APPLY vẫn còn {badScopedSlugs.Count} slug dạng mã SKU trong scope."
                );
            }

            return Ok(new
            {
                success = true,
                mode = "APPLY",
                scope = "Trang Sức Ngọc > Chuỗi Ngọc Đeo Cổ",

                totalProductsBefore,
                totalProductsAfter =
                    productsAfter.Count,

                scopedProductsBefore =
                    scopedProducts.Count,
                scopedProductsAfter =
                    scopedAfter.Count,

                repaired =
                    applied.Count,

                duplicateSlugGroupsAfter =
                    duplicateGroupsAfter.Count,

                skuStyleSlugCountAfter =
                    badScopedSlugs.Count,

                writeOperations =
                    applied.Count,

                deleteOperations =
                    0,

                changedProducts =
                    applied.Select(item =>
                        new
                        {
                            productId =
                                item.ProductId,
                            fromSlug =
                                item.FromSlug,
                            toSlug =
                                item.ToSlug
                        }
                    ),

                safety =
                    "Chỉ cập nhật Slug + UpdatedAtUtc trong Chuỗi Ngọc Đeo Cổ; không xóa sản phẩm và không đổi dữ liệu khác."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "[ProductsController] Necklace clean URL V2 apply failed. Rolling back."
            );

            var rollbackErrors =
                new List<string>();

            for (
                var index =
                    applied.Count - 1;
                index >= 0;
                index--
            )
            {
                var item =
                    applied[index];

                try
                {
                    var rolledBack =
                        await _productService
                            .UpdateProductSlugAsync(
                                item.ProductId,
                                item.FromSlug
                            );

                    if (!rolledBack)
                    {
                        rollbackErrors.Add(
                            $"Rollback failed: {item.ProductId}"
                        );
                    }
                }
                catch (Exception rollbackEx)
                {
                    rollbackErrors.Add(
                        $"{item.ProductId}: {rollbackEx.Message}"
                    );
                }
            }

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    mode = "APPLY_FAILED",
                    error = ex.Message,
                    appliedBeforeFailure =
                        applied.Count,
                    rollbackAttempted =
                        applied.Count,
                    rollbackErrors,
                    deleteOperations =
                        0,
                    safety =
                        "Không có thao tác delete. Hệ thống đã thử rollback các slug đã đổi trước khi lỗi."
                }
            );
        }
    }


    // ==================================================
    // ADMIN - AUDIT / REPAIR DUPLICATE PRODUCT SLUGS
    //
    // PHẠM VI AN TOÀN:
    // - CHỈ Trang Sức Ngọc > Chuỗi Ngọc Đeo Cổ
    // - KHÔNG sửa ParentCategoryId / CategoryId
    // - KHÔNG sửa Images / MainImage
    // - KHÔNG sửa giá / mô tả / SKU
    // - KHÔNG đụng Vòng Ngọc Thiên Nhiên (Sơn Thủy, Phỉ Thúy, ... )
    //
    // GET  /api/admin/products/necklace-slug-audit
    // POST /api/admin/products/repair-necklace-duplicate-slugs?apply=false
    //
    // apply=false: chỉ preview
    // apply=true : chỉ cập nhật field Slug của record bị trùng
    // ==================================================

    [HttpGet("api/admin/products/necklace-slug-audit")]
    public async Task<IActionResult>
        AuditNecklaceDuplicateSlugs()
    {
        return await RepairNecklaceDuplicateSlugs(
            false
        );
    }

    [HttpPost("api/admin/products/repair-necklace-duplicate-slugs")]
    public async Task<IActionResult>
        RepairNecklaceDuplicateSlugs(
            [FromQuery] bool apply = false
        )
    {
        var products =
            await _productService
                .GetAllProductsForSlugMaintenanceAsync();

        var scopedProducts =
            products
                .Where(IsJadeNecklaceProduct)
                .ToList();

        /*
         * reservedSlugs chứa TOÀN BỘ slug đang có trong database.
         * Nhờ vậy slug mới không đụng sản phẩm ở danh mục khác.
         */
        var reservedSlugs =
            products
                .Select(x =>
                    (x.Slug ?? "").Trim()
                )
                .Where(x =>
                    !string.IsNullOrWhiteSpace(x)
                )
                .ToHashSet(
                    StringComparer.OrdinalIgnoreCase
                );

        var duplicateGroups =
            products
                .Where(x =>
                    !string.IsNullOrWhiteSpace(
                        x.Slug
                    )
                )
                .GroupBy(
                    x => (x.Slug ?? "").Trim(),
                    StringComparer.OrdinalIgnoreCase
                )
                .Where(group =>
                    group.Count() > 1
                    &&
                    group.Any(IsJadeNecklaceProduct)
                )
                .OrderBy(group =>
                    group.Key,
                    StringComparer.OrdinalIgnoreCase
                )
                .ToList();

        var changes =
            new List<object>();

        var repaired =
            0;

        foreach (var group in duplicateGroups)
        {
            var orderedGroup =
                group
                    .OrderBy(x =>
                        x.CreatedAtUtc
                    )
                    .ThenBy(x =>
                        x.Id
                    )
                    .ToList();

            var hasProductOutsideScope =
                orderedGroup
                    .Any(x =>
                        !IsJadeNecklaceProduct(x)
                    );

            var scopedInGroup =
                orderedGroup
                    .Where(IsJadeNecklaceProduct)
                    .ToList();

            /*
             * Nếu slug trùng với 1 sản phẩm NGOÀI Chuỗi Ngọc Đeo Cổ:
             * - tuyệt đối không sửa record ngoài scope
             * - đổi slug toàn bộ record Chuỗi Ngọc Đeo Cổ trong group.
             *
             * Nếu tất cả record đều là Chuỗi Ngọc Đeo Cổ:
             * - giữ record cũ nhất để bảo toàn URL cũ
             * - đổi các record còn lại.
             */
            var targets =
                hasProductOutsideScope
                    ? scopedInGroup
                    : scopedInGroup
                        .Skip(1)
                        .ToList();

            foreach (var product in targets)
            {
                var productId =
                    product.Id?.Trim()
                    ?? "";

                if (
                    string.IsNullOrWhiteSpace(
                        productId
                    )
                )
                {
                    continue;
                }

                var baseSlug =
                    Slugify(
                        product.Slug ?? ""
                    );

                if (
                    string.IsNullOrWhiteSpace(
                        baseSlug
                    )
                )
                {
                    baseSlug =
                        "chuoi-ngoc-deo-co";
                }

                var skuSuffix =
                    Slugify(
                        product.Sku ?? ""
                    );

                var idSuffix =
                    productId;

                if (idSuffix.Length > 8)
                {
                    idSuffix =
                        idSuffix[^8..];
                }

                var suffix =
                    !string.IsNullOrWhiteSpace(
                        skuSuffix
                    )
                        ? skuSuffix
                        : idSuffix;

                if (
                    string.IsNullOrWhiteSpace(
                        suffix
                    )
                )
                {
                    suffix =
                        Guid.NewGuid()
                            .ToString("N")
                            [..8];
                }

                var candidateBase =
                    $"{baseSlug}-{suffix}";

                var candidate =
                    candidateBase;

                var counter =
                    2;

                while (
                    reservedSlugs.Contains(
                        candidate
                    )
                )
                {
                    candidate =
                        $"{candidateBase}-{counter}";

                    counter++;
                }

                reservedSlugs.Add(
                    candidate
                );

                changes.Add(new
                {
                    productId,

                    product.Name,
                    product.Sku,
                    product.CategoryName,

                    fromSlug =
                        product.Slug,

                    toSlug =
                        candidate
                });

                if (!apply)
                {
                    continue;
                }

                var updated =
                    await _productService
                        .UpdateProductSlugAsync(
                            productId,
                            candidate
                        );

                if (updated)
                {
                    repaired++;
                }
            }
        }

        return Ok(new
        {
            mode =
                apply
                    ? "APPLY"
                    : "PREVIEW",

            scope =
                "Trang Sức Ngọc > Chuỗi Ngọc Đeo Cổ",

            totalProducts =
                products.Count,

            scopedProducts =
                scopedProducts.Count,

            duplicateSlugGroups =
                duplicateGroups.Count,

            detectedChanges =
                changes.Count,

            repaired,
            changes,

            safety =
                "Chỉ cập nhật field Slug của Chuỗi Ngọc Đeo Cổ; không sửa category, ảnh, giá, nội dung và không đụng Vòng Ngọc Thiên Nhiên."
        });
    }

    private static bool
        IsJadeNecklaceProduct(
            Product product
        )
    {
        var parentId =
            Slugify(
                product.ParentCategoryId ?? ""
            );

        var parentName =
            Slugify(
                product.ParentCategoryName ?? ""
            );

        var categoryId =
            Slugify(
                product.CategoryId ?? ""
            );

        var categoryName =
            Slugify(
                product.CategoryName ?? ""
            );

        /*
         * HARD SAFETY GATE:
         * Nếu record đang thuộc Vòng Ngọc Thiên Nhiên thì bỏ qua ngay.
         */
        if (
            parentId ==
                "vong-ngoc-thien-nhien"
            ||
            parentName ==
                "vong-ngoc-thien-nhien"
        )
        {
            return false;
        }

        var parentMatches =
            parentId ==
                "trang-suc-ngoc"
            ||
            parentName ==
                "trang-suc-ngoc";

        var categoryMatches =
            categoryId ==
                "chuoi-ngoc-deo-co"
            ||
            categoryName ==
                "chuoi-ngoc-deo-co";

        return
            parentMatches
            &&
            categoryMatches;
    }

    // ==================================================
    // ADMIN - AUDIT / REPAIR CATEGORY LINKS
    //
    // GET  /api/admin/products/category-audit
    // POST /api/admin/products/repair-category-links?apply=false
    //
    // apply=false: chỉ preview, không sửa DB.
    // apply=true : cập nhật ParentCategoryId/CategoryId về ID Mongo thật.
    // ==================================================

    [HttpGet("api/admin/products/category-audit")]
    public async Task<IActionResult>
        AuditProductCategoryLinks()
    {
        return await RepairProductCategoryLinks(
            false
        );
    }

    [HttpPost("api/admin/products/repair-category-links")]
    public async Task<IActionResult>
        RepairProductCategoryLinks(
            [FromQuery] bool apply = false
        )
    {
        var categories =
            await _mongoContext
                .Database
                .GetCollection<ProductCategory>(
                    "ProductCategories"
                )
                .Find(_ => true)
                .ToListAsync();

        var products =
            await _mongoContext
                .Products
                .Find(_ => true)
                .ToListAsync();

        var changes =
            new List<object>();

        var skipped =
            new List<object>();

        var repaired =
            0;

        var naturalJadeParent =
            categories.FirstOrDefault(x =>
                string.IsNullOrWhiteSpace(x.ParentId)
                &&
                (
                    string.Equals(
                        Slugify(x.Slug ?? ""),
                        "vong-ngoc-thien-nhien",
                        StringComparison.OrdinalIgnoreCase
                    )
                    ||
                    string.Equals(
                        Slugify(x.Name ?? ""),
                        "vong-ngoc-thien-nhien",
                        StringComparison.OrdinalIgnoreCase
                    )
                )
            );

        const string canonicalNaturalJadeParentName =
            "Vòng Ngọc Thiên Nhiên";

        foreach (var product in products)
        {
            /*
             * SAFETY GATE:
             * Repair này CHỈ được phép đụng các sản phẩm đang thuộc
             * Vòng Ngọc Thiên Nhiên (ID cũ dạng slug hoặc Mongo ID mới).
             *
             * Nhờ vậy các sản phẩm Trang Sức Ngọc như Chuỗi/Kiềng/Charm
             * có chữ "Ngọc Bích", "Sơn Thủy", "Hòa Điền" trong tên
             * sẽ không bị kéo nhầm sang category Vòng Ngọc.
             */
            if (!IsNaturalJadeProduct(
                    product,
                    naturalJadeParent?.Id
                ))
            {
                continue;
            }

            var targetSlug =
                InferNaturalJadeCategorySlug(
                    product
                );

            if (string.IsNullOrWhiteSpace(targetSlug))
            {
                continue;
            }

            /*
             * Match theo tên chuẩn thay vì tin vào slug cũ,
             * vì ProductCategoryService cũ có thể đã tạo slug
             * còn dấu tiếng Việt.
             */
            var targetCategory =
                categories.FirstOrDefault(x =>
                    !string.IsNullOrWhiteSpace(x.ParentId)
                    &&
                    (
                        string.Equals(
                            Slugify(x.Name),
                            targetSlug,
                            StringComparison.OrdinalIgnoreCase
                        )
                        ||
                        string.Equals(
                            Slugify(x.Slug ?? ""),
                            targetSlug,
                            StringComparison.OrdinalIgnoreCase
                        )
                    )
                );

            if (targetCategory == null)
            {
                skipped.Add(new
                {
                    productId = product.Id,
                    product.Name,
                    product.Sku,
                    targetSlug,
                    reason =
                        "Không tìm thấy ProductCategory đích."
                });

                continue;
            }

            var targetParent =
                categories.FirstOrDefault(x =>
                    string.Equals(
                        x.Id,
                        targetCategory.ParentId,
                        StringComparison.OrdinalIgnoreCase
                    )
                );

            if (targetParent == null)
            {
                skipped.Add(new
                {
                    productId = product.Id,
                    product.Name,
                    product.Sku,
                    targetSlug,
                    reason =
                        "Không tìm thấy danh mục cha."
                });

                continue;
            }

            var needsUpdate =
                !string.Equals(
                    product.ParentCategoryId,
                    targetParent.Id,
                    StringComparison.OrdinalIgnoreCase
                )
                ||
                !string.Equals(
                    product.ParentCategoryName,
                    canonicalNaturalJadeParentName,
                    StringComparison.Ordinal
                )
                ||
                !string.Equals(
                    product.CategoryId,
                    targetCategory.Id,
                    StringComparison.OrdinalIgnoreCase
                )
                ||
                !string.Equals(
                    product.CategoryName,
                    targetCategory.Name,
                    StringComparison.Ordinal
                );

            if (!needsUpdate)
            {
                continue;
            }

            changes.Add(new
            {
                productId = product.Id,
                product.Name,
                product.Sku,
                from = new
                {
                    product.ParentCategoryId,
                    product.ParentCategoryName,
                    product.CategoryId,
                    product.CategoryName
                },
                to = new
                {
                    parentCategoryId =
                        targetParent.Id,
                    parentCategoryName =
                        canonicalNaturalJadeParentName,
                    categoryId =
                        targetCategory.Id,
                    categoryName =
                        targetCategory.Name
                },
                detectedBy =
                    GetCategoryDetectionReason(
                        product,
                        targetSlug
                    )
            });

            if (!apply)
            {
                continue;
            }

            var update =
                Builders<Product>
                    .Update
                    .Set(
                        x => x.ParentCategoryId,
                        targetParent.Id ?? ""
                    )
                    .Set(
                        x => x.ParentCategoryName,
                        canonicalNaturalJadeParentName
                    )
                    .Set(
                        x => x.CategoryId,
                        targetCategory.Id ?? ""
                    )
                    .Set(
                        x => x.CategoryName,
                        targetCategory.Name
                    )
                    .Set(
                        x => x.UpdatedAtUtc,
                        DateTime.UtcNow
                    );

            var result =
                await _mongoContext
                    .Products
                    .UpdateOneAsync(
                        x => x.Id == product.Id,
                        update
                    );

            if (result.ModifiedCount > 0)
            {
                repaired++;
            }
        }

        return Ok(new
        {
            mode =
                apply
                    ? "APPLY"
                    : "PREVIEW",

            totalProducts =
                products.Count,

            detectedChanges =
                changes.Count,

            repaired,

            skippedCount =
                skipped.Count,

            changes,

            skipped
        });
    }

    private static bool
        IsNaturalJadeProduct(
            Product product,
            string? mongoParentId
        )
    {
        var currentParentId =
            (product.ParentCategoryId ?? "")
                .Trim();

        if (
            !string.IsNullOrWhiteSpace(mongoParentId)
            &&
            string.Equals(
                currentParentId,
                mongoParentId,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return true;
        }

        // Dữ liệu cũ lưu slug thay vì Mongo ObjectId.
        if (
            string.Equals(
                currentParentId,
                "vong-ngoc-thien-nhien",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return true;
        }

        // Fallback cho record cũ thiếu/sai ParentCategoryId nhưng tên cha đúng.
        return string.Equals(
            Slugify(
                product.ParentCategoryName ?? ""
            ),
            "vong-ngoc-thien-nhien",
            StringComparison.OrdinalIgnoreCase
        );
    }

    private static string
        InferNaturalJadeCategorySlug(
            Product product
        )
    {
        var name =
            Slugify(
                product.Name ?? ""
            );

        var sku =
            (product.Sku ?? "")
                .Trim()
                .ToUpperInvariant();

        /*
         * Ưu tiên tên sản phẩm.
         * Đây là cách sửa trường hợp:
         * - "Vòng Lam Ngọc" nhưng bị lưu vào Ngọc Huyết.
         * - "Vòng Ngọc Bích" có sản phẩm nhưng CategoryId sai.
         */
        if (name.Contains("lam-ngoc"))
        {
            return "vong-lam-ngoc";
        }

        if (name.Contains("ngoc-bich"))
        {
            return "vong-ngoc-bich";
        }

        if (name.Contains("phi-thuy"))
        {
            return "vong-ngoc-phi-thuy";
        }

        if (name.Contains("tu-nham"))
        {
            return "vong-ngoc-tu-nham";
        }

        if (name.Contains("son-thuy"))
        {
            return "vong-ngoc-son-thuy";
        }

        if (name.Contains("ngoc-huyet"))
        {
            return "vong-ngoc-huyet";
        }

        if (name.Contains("hoa-dien"))
        {
            return "vong-ngoc-hoa-dien";
        }

        if (name.Contains("bach-ngoc"))
        {
            return "vong-bach-ngoc";
        }

        if (
            name.Contains("ngoc-vip")
            ||
            name.EndsWith("-vip")
        )
        {
            return "vong-ngoc-vip";
        }

        /*
         * Hai prefix này nhìn thấy trực tiếp từ data hiện tại:
         * KJ-LN-* = Lam Ngọc
         * KJ-NB-* = Ngọc Bích
         */
        if (sku.StartsWith("KJ-LN-"))
        {
            return "vong-lam-ngoc";
        }

        if (sku.StartsWith("KJ-NB-"))
        {
            return "vong-ngoc-bich";
        }

        /*
         * Cuối cùng: nếu CategoryName hiện tại đúng tên nhưng
         * CategoryId sai thì dùng CategoryName để sửa ID.
         */
        var categoryNameSlug =
            Slugify(
                product.CategoryName ?? ""
            );

        var known =
            FixedProductMenu
                .FirstOrDefault(x =>
                    string.Equals(
                        x.ParentCategoryId,
                        "vong-ngoc-thien-nhien",
                        StringComparison.OrdinalIgnoreCase
                    )
                    &&
                    string.Equals(
                        x.CategoryId,
                        categoryNameSlug,
                        StringComparison.OrdinalIgnoreCase
                    )
                );

        return known?.CategoryId
            ?? "";
    }

    private static string
        GetCategoryDetectionReason(
            Product product,
            string targetSlug
        )
    {
        var name =
            Slugify(
                product.Name ?? ""
            );

        if (
            name.Contains(
                targetSlug.Replace(
                    "vong-",
                    ""
                )
            )
        )
        {
            return "product-name";
        }

        var sku =
            (product.Sku ?? "")
                .Trim()
                .ToUpperInvariant();

        if (
            sku.StartsWith("KJ-LN-")
            ||
            sku.StartsWith("KJ-NB-")
        )
        {
            return "sku-prefix";
        }

        return "category-name";
    }

    // ==================================================
    // SAVE UPLOADED IMAGES
    // ==================================================

    private async Task<List<ProductImage>>
        SaveUploadedImagesAsync(
            List<IFormFile>? files,
            string productName,
            int startIndex,
            bool firstImageIsMain
        )
    {
        var result =
            new List<ProductImage>();

        if (
            files == null
            ||
            files.Count == 0
        )
        {
            return result;
        }

        var webRootPath =
            _environment.WebRootPath;

        if (
            string.IsNullOrWhiteSpace(
                webRootPath
            )
        )
        {
            webRootPath =
                Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "wwwroot"
                );
        }

        var uploadFolder =
            Path.Combine(
                webRootPath,
                "uploads",
                "products"
            );

        Directory.CreateDirectory(
            uploadFolder
        );

        for (
            var index = 0;
            index < files.Count;
            index++
        )
        {
            var file =
                files[index];

            if (
                file == null
                ||
                file.Length <= 0
            )
            {
                continue;
            }

            if (
                !IsAllowedImage(
                    file
                )
            )
            {
                throw new InvalidOperationException(
                    $"File {file.FileName} không phải hình ảnh hợp lệ."
                );
            }

            if (
                file.Length >
                MaxSingleImageBytes
            )
            {
                throw new InvalidOperationException(
                    $"File {file.FileName} vượt quá 150MB."
                );
            }

            var extension =
                Path.GetExtension(
                    file.FileName
                )
                .ToLowerInvariant();

            var safeName =
                Slugify(
                    Path.GetFileNameWithoutExtension(
                        file.FileName
                    )
                );

            if (
                string.IsNullOrWhiteSpace(
                    safeName
                )
            )
            {
                safeName =
                    "product-image";
            }

            var fileName =
                $"{DateTime.UtcNow:yyyyMMddHHmmssfff}-{Guid.NewGuid():N}-{safeName}{extension}";

            var filePath =
                Path.Combine(
                    uploadFolder,
                    fileName
                );

            await using var stream =
                new FileStream(
                    filePath,
                    FileMode.Create
                );

            await file.CopyToAsync(
                stream
            );

            result.Add(
                new ProductImage
                {
                    Url =
                        $"/uploads/products/{fileName}",

                    FileName =
                        fileName,

                    Alt =
                        productName,

                    Title =
                        productName,

                    Description =
                        $"Hình ảnh {productName} King Jades",

                    Caption =
                        productName,

                    IsMain =
                        firstImageIsMain
                        &&
                        index == 0,

                    SortOrder =
                        startIndex
                        +
                        index
                        +
                        1
                }
            );
        }

        return result;
    }

    // ==================================================
    // IMAGE METADATA / LEGACY IMAGE HELPERS
    // ==================================================

    private static void ApplyUploadedImageMetadata(
        List<ProductImage> uploadedImages,
        string? imageMetadata,
        string productName
    )
    {
        if (uploadedImages.Count == 0)
        {
            return;
        }

        var metadata =
            ParseJson(
                imageMetadata,
                new List<ProductImage>()
            );

        for (
            var index = 0;
            index < uploadedImages.Count;
            index++
        )
        {
            var target =
                uploadedImages[index];

            if (index < metadata.Count)
            {
                var source =
                    metadata[index];

                if (!string.IsNullOrWhiteSpace(source.Alt))
                {
                    target.Alt = source.Alt.Trim();
                }

                if (!string.IsNullOrWhiteSpace(source.Title))
                {
                    target.Title = source.Title.Trim();
                }

                if (!string.IsNullOrWhiteSpace(source.Description))
                {
                    target.Description = source.Description.Trim();
                }

                if (!string.IsNullOrWhiteSpace(source.Caption))
                {
                    target.Caption = source.Caption.Trim();
                }

                target.IsMain =
                    source.IsMain;
            }

            if (string.IsNullOrWhiteSpace(target.Alt))
            {
                target.Alt = productName;
            }

            if (string.IsNullOrWhiteSpace(target.Title))
            {
                target.Title = productName;
            }
        }
    }

    private static ProductImage CloneProductImage(
        ProductImage source
    )
    {
        return new ProductImage
        {
            Url = source.Url,
            FileName = source.FileName,
            Alt = source.Alt,
            Title = source.Title,
            Description = source.Description,
            Caption = source.Caption,
            IsMain = source.IsMain,
            SortOrder = source.SortOrder
        };
    }

    private static string NormalizeStoredProductImageUrl(
        string? url
    )
    {
        var value =
            url?.Trim()
            ?? string.Empty;

        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        const string marker =
            "/uploads/products/";

        var markerIndex =
            value.IndexOf(
                marker,
                StringComparison.OrdinalIgnoreCase
            );

        if (markerIndex >= 0)
        {
            value =
                value.Substring(
                    markerIndex
                );
        }

        var queryIndex =
            value.IndexOf('?');

        if (queryIndex >= 0)
        {
            value =
                value.Substring(
                    0,
                    queryIndex
                );
        }

        var fragmentIndex =
            value.IndexOf('#');

        if (fragmentIndex >= 0)
        {
            value =
                value.Substring(
                    0,
                    fragmentIndex
                );
        }

        return value;
    }

    // ==================================================
    // IMAGE VALIDATION
    // ==================================================

    private static bool IsAllowedImage(
        IFormFile file
    )
    {
        if (
            file == null
            ||
            file.Length <= 0
        )
        {
            return false;
        }

        var allowedExtensions =
            new HashSet<string>(
                StringComparer.OrdinalIgnoreCase
            )
            {
                ".jpg",
                ".jpeg",
                ".png",
                ".webp",
                ".gif"
            };

        var extension =
            Path.GetExtension(
                file.FileName
            );

        var contentType =
            file.ContentType
            ?? string.Empty;

        return
            allowedExtensions.Contains(
                extension
            )
            &&
            contentType.StartsWith(
                "image/",
                StringComparison.OrdinalIgnoreCase
            );
    }

    // ==================================================
    // LOCAL MEDIA CLEANUP
    //
    // Chỉ xóa file nằm trong:
    // wwwroot/uploads/products
    //
    // Không cho path từ MongoDB thoát ra ngoài thư mục này.
    // ==================================================

    private void DeleteLocalFiles(
        IEnumerable<ProductImage>? images
    )
    {
        if (images == null)
        {
            return;
        }

        var webRootPath =
            _environment.WebRootPath;

        if (
            string.IsNullOrWhiteSpace(
                webRootPath
            )
        )
        {
            webRootPath =
                Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "wwwroot"
                );
        }

        var uploadFolder =
            Path.Combine(
                webRootPath,
                "uploads",
                "products"
            );

        var fullUploadFolder =
            Path.GetFullPath(
                uploadFolder
            )
            .TrimEnd(
                Path.DirectorySeparatorChar,
                Path.AltDirectorySeparatorChar
            );

        foreach (var image in images)
        {
            if (
                image == null
                ||
                string.IsNullOrWhiteSpace(
                    image.Url
                )
                ||
                !image.Url.StartsWith(
                    "/uploads/products/",
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                continue;
            }

            var fileName =
                Path.GetFileName(
                    image.Url
                );

            if (
                string.IsNullOrWhiteSpace(
                    fileName
                )
            )
            {
                continue;
            }

            var filePath =
                Path.GetFullPath(
                    Path.Combine(
                        uploadFolder,
                        fileName
                    )
                );

            /*
             * Defense-in-depth:
             * đường dẫn sau normalize bắt buộc vẫn phải nằm
             * bên trong uploads/products.
             */
            var expectedPrefix =
                fullUploadFolder
                +
                Path.DirectorySeparatorChar;

            if (
                !filePath.StartsWith(
                    expectedPrefix,
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                _logger.LogWarning(
                    "[ProductsController] Skip unsafe product image path {ImageUrl}",
                    image.Url
                );

                continue;
            }

            try
            {
                if (
                    System.IO.File.Exists(
                        filePath
                    )
                )
                {
                    System.IO.File.Delete(
                        filePath
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "[ProductsController] Cannot delete product image file {FilePath}",
                    filePath
                );
            }
        }
    }

    // ==================================================
    // NORMALIZE IMAGES
    // ==================================================

    private static void NormalizeImages(
        List<ProductImage> images,
        string productName
    )
    {
        if (images.Count == 0)
        {
            return;
        }

        images =
            images
                .OrderBy(x =>
                    x.SortOrder
                )
                .ToList();

        var mainIndex =
            images.FindIndex(
                x => x.IsMain
            );

        if (mainIndex < 0)
        {
            mainIndex = 0;
        }

        for (
            var index = 0;
            index < images.Count;
            index++
        )
        {
            images[index].IsMain =
                index == mainIndex;

            images[index].SortOrder =
                index + 1;

            if (
                string.IsNullOrWhiteSpace(
                    images[index].Alt
                )
            )
            {
                images[index].Alt =
                    productName;
            }

            if (
                string.IsNullOrWhiteSpace(
                    images[index].Title
                )
            )
            {
                images[index].Title =
                    productName;
            }

            if (
                string.IsNullOrWhiteSpace(
                    images[index].Description
                )
            )
            {
                images[index].Description =
                    $"Hình ảnh {productName} King Jades";
            }

            if (
                string.IsNullOrWhiteSpace(
                    images[index].Caption
                )
            )
            {
                images[index].Caption =
                    productName;
            }
        }
    }

    // ==================================================
    // UNIQUE SLUG - CREATE
    // ==================================================

    private async Task<string>
        BuildUniqueSlugAsync(
            string baseSlug
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                baseSlug
            )
        )
        {
            baseSlug =
                Guid.NewGuid()
                    .ToString("N");
        }

        var slug =
            baseSlug;

        var count =
            1;

        while (
            await _productService
                .SlugExistsAsync(
                    slug
                )
        )
        {
            slug =
                $"{baseSlug}-{count}";

            count++;
        }

        return slug;
    }

    // ==================================================
    // UNIQUE SLUG - UPDATE
    // ==================================================

    private async Task<string>
        BuildUniqueSlugExceptIdAsync(
            string baseSlug,
            string id
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                baseSlug
            )
        )
        {
            baseSlug =
                Guid.NewGuid()
                    .ToString("N");
        }

        var slug =
            baseSlug;

        var count =
            1;

        while (
            await _productService
                .SlugExistsExceptIdAsync(
                    slug,
                    id
                )
        )
        {
            slug =
                $"{baseSlug}-{count}";

            count++;
        }

        return slug;
    }

    // ==================================================
    // JSON PARSER
    // ==================================================

    private static T ParseJson<T>(
        string? json,
        T fallback
    )
    {
        if (
            string.IsNullOrWhiteSpace(
                json
            )
        )
        {
            return fallback;
        }

        try
        {
            var result =
                JsonSerializer
                    .Deserialize<T>(
                        json,
                        new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive =
                                true
                        }
                    );

            return result == null
                ? fallback
                : result;
        }
        catch
        {
            return fallback;
        }
    }

    // ==================================================
    // SLUGIFY
    // ==================================================

    private static string Slugify(
        string text
    )
    {
        if (
            string.IsNullOrWhiteSpace(
                text
            )
        )
        {
            return Guid
                .NewGuid()
                .ToString("N");
        }

        var normalized =
            text
                .Normalize(
                    System.Text
                        .NormalizationForm
                        .FormD
                );

        normalized =
            new string(
                normalized
                    .Where(c =>
                        System.Globalization
                            .CharUnicodeInfo
                            .GetUnicodeCategory(c)
                        !=
                        System.Globalization
                            .UnicodeCategory
                            .NonSpacingMark
                    )
                    .ToArray()
            );

        normalized =
            normalized
                .Normalize(
                    System.Text
                        .NormalizationForm
                        .FormC
                )
                .ToLowerInvariant()
                .Trim();

        normalized =
            normalized
                .Replace(
                    "đ",
                    "d"
                );

        normalized =
            Regex.Replace(
                normalized,
                @"\s+",
                "-"
            );

        normalized =
            Regex.Replace(
                normalized,
                @"[^a-z0-9\-]",
                ""
            );

        normalized =
            Regex.Replace(
                normalized,
                @"-+",
                "-"
            );

        return normalized
            .Trim('-');
    }

    // ==================================================
    // PUBLISH STATUS
    // ==================================================

    private static string NormalizePublishStatus(
        string? publishStatus
    )
    {
        if (
            string.Equals(
                publishStatus,
                "Scheduled",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return "Scheduled";
        }

        if (
            string.Equals(
                publishStatus,
                "Draft",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return "Draft";
        }

        return "Published";
    }

    // ==================================================
    // NORMALIZE UTC
    // ==================================================

    private static DateTime NormalizeUtc(
        DateTime value
    )
    {
        return value.Kind switch
        {
            DateTimeKind.Utc =>
                value,

            DateTimeKind.Local =>
                value.ToUniversalTime(),

            _ =>
                DateTime.SpecifyKind(
                    value,
                    DateTimeKind.Utc
                )
        };
    }
}

// ==================================================
// CATEGORY RESOLVE RESULT
// ==================================================

public class CategoryResolveResult
{
    public bool Success { get; set; }

    public string Error { get; set; } = "";

    public string ParentCategoryId { get; set; } = "";

    public string ParentCategoryName { get; set; } = "";

    public string CategoryId { get; set; } = "";

    public string CategoryName { get; set; } = "";

    public static CategoryResolveResult Ok(
        string parentCategoryId,
        string parentCategoryName,
        string categoryId,
        string categoryName
    )
    {
        return new CategoryResolveResult
        {
            Success = true,

            ParentCategoryId =
                parentCategoryId,

            ParentCategoryName =
                parentCategoryName,

            CategoryId =
                categoryId,

            CategoryName =
                categoryName
        };
    }

    public static CategoryResolveResult Fail(
        string error
    )
    {
        return new CategoryResolveResult
        {
            Success = false,
            Error = error
        };
    }

}

// ==================================================
// PUBLISH SCHEDULE REQUEST
// ==================================================

public class ProductPublishScheduleRequest
{
    public string PublishStatus { get; set; } =
        "Published";

    public DateTime? PublishAtUtc { get; set; }
}