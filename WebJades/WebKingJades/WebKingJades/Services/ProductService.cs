using MongoDB.Bson;
using MongoDB.Driver;
using System.Text.RegularExpressions;
using WebKingJades.Data;
using WebKingJades.Models;

namespace WebKingJades.Services;

public class ProductService
{
    private readonly IMongoCollection<Product> _products;
    private readonly ILogger<ProductService> _logger;

    public ProductService(
        MongoDbContext mongoContext,
        ILogger<ProductService> logger
    )
    {
        _products = mongoContext.Products;
        _logger = logger;

        EnsureIndexes();
    }

    /* =========================================================
       INDEXES

       Mục tiêu:
       - Admin list
       - Public listing
       - Category filtering
       - Slug lookup
       - SKU lookup / bulk import
       - Scheduled publishing

       Lưu ý:
       Unique SKU/Slug dùng partial filter để KHÔNG ép unique
       với chuỗi rỗng của dữ liệu cũ.
    ========================================================= */

    private void EnsureIndexes()
    {
        var indexModels =
            new List<CreateIndexModel<Product>>
            {
                new(
                    Builders<Product>
                        .IndexKeys
                        .Descending(x => x.CreatedAtUtc),
                    new CreateIndexOptions
                    {
                        Name = "ix_products_created_at"
                    }
                ),

                /*
                 * Public product listing:
                 *
                 * Status = active
                 * Visibility.IsPublished = true
                 * PublishStatus = Published
                 * sort CreatedAtUtc desc
                 */
                new(
                    Builders<Product>
                        .IndexKeys
                        .Ascending(x => x.Status)
                        .Ascending("Visibility.IsPublished")
                        .Ascending(x => x.PublishStatus)
                        .Descending(x => x.CreatedAtUtc),
                    new CreateIndexOptions
                    {
                        Name = "ix_products_public_listing"
                    }
                ),

                /*
                 * Category listing.
                 */
                new(
                    Builders<Product>
                        .IndexKeys
                        .Ascending(x => x.ParentCategoryId)
                        .Ascending(x => x.CategoryId)
                        .Ascending(x => x.Status)
                        .Ascending("Visibility.IsPublished")
                        .Ascending(x => x.PublishStatus)
                        .Descending(x => x.CreatedAtUtc),
                    new CreateIndexOptions
                    {
                        Name = "ix_products_category_listing"
                    }
                ),

                /*
                 * Giữ hỗ trợ cho các luồng cũ còn lọc theo tên.
                 */
                new(
                    Builders<Product>
                        .IndexKeys
                        .Ascending(x => x.CategoryName)
                        .Descending(x => x.CreatedAtUtc),
                    new CreateIndexOptions
                    {
                        Name = "ix_products_category_name"
                    }
                ),

                /*
                 * Worker Scheduled -> Published.
                 */
                new(
                    Builders<Product>
                        .IndexKeys
                        .Ascending(x => x.PublishStatus)
                        .Ascending(x => x.PublishAtUtc),
                    new CreateIndexOptions
                    {
                        Name = "ix_products_publish_schedule"
                    }
                ),

                /*
                 * Unique slug, nhưng bỏ qua slug rỗng.
                 *
                 * Nếu database cũ đang có slug trùng thì index này
                 * sẽ không tạo được; ứng dụng vẫn chạy và log warning
                 * để mình xử lý dữ liệu cũ trước.
                 */
                new(
                    Builders<Product>
                        .IndexKeys
                        .Ascending(x => x.Slug),
                    new CreateIndexOptions<Product>
                    {
                        Name = "ux_products_slug",
                        Unique = true,
                        PartialFilterExpression =
                            new BsonDocument(
                                "$and",
                                new BsonArray
                                {
                                    new BsonDocument(
                                        "Slug",
                                        new BsonDocument(
                                            "$type",
                                            "string"
                                        )
                                    ),
                                    new BsonDocument(
                                        "Slug",
                                        new BsonDocument(
                                            "$ne",
                                            ""
                                        )
                                    )
                                }
                            )
                    }
                ),

                /*
                 * Unique SKU, nhưng bỏ qua SKU rỗng.
                 */
                new(
                    Builders<Product>
                        .IndexKeys
                        .Ascending(x => x.Sku),
                    new CreateIndexOptions<Product>
                    {
                        Name = "ux_products_sku",
                        Unique = true,
                        PartialFilterExpression =
                            new BsonDocument(
                                "$and",
                                new BsonArray
                                {
                                    new BsonDocument(
                                        "Sku",
                                        new BsonDocument(
                                            "$type",
                                            "string"
                                        )
                                    ),
                                    new BsonDocument(
                                        "Sku",
                                        new BsonDocument(
                                            "$ne",
                                            ""
                                        )
                                    )
                                }
                            )
                    }
                )
            };

        /*
         * Tạo từng index riêng.
         *
         * Nếu 1 index bị conflict do dữ liệu cũ,
         * các index còn lại vẫn có cơ hội được tạo.
         */
        foreach (var indexModel in indexModels)
        {
            try
            {
                _products
                    .Indexes
                    .CreateOne(indexModel);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "[ProductService] Cannot create MongoDB product index."
                );
            }
        }
    }

    /* =========================================================
       ADMIN PRODUCT LIST
    ========================================================= */

    public async Task<(
        List<ProductListItemDto> Products,
        long Total
    )> GetAdminProductListAsync(
        int skip = 0,
        int take = 50
    )
    {
        skip = Math.Max(0, skip);
        take = Math.Clamp(take, 1, 100);

        var total =
            await _products
                .CountDocumentsAsync(
                    FilterDefinition<Product>.Empty
                );

        /*
         * QUAN TRỌNG:
         * Không Project trực tiếp Product -> ProductListItemDto ở MongoDB.
         *
         * Lý do:
         * Một số field của Product có thể được map bằng
         * [BsonRepresentation(BsonType.ObjectId)].
         *
         * Khi LINQ3 dịch projection, các biểu thức fallback/coalesce
         * có thể khiến MongoDB Driver cố serialize chuỗi rỗng ""
         * thành ObjectId và phát sinh:
         *
         * System.FormatException:
         * '' is not a valid 24 digit hex string.
         *
         * Vì vậy:
         * 1. Lấy Product document trước.
         * 2. Map sang DTO trong bộ nhớ C#.
         *
         * Cách này ổn định hơn cho dữ liệu cũ và không làm thay đổi API.
         */
        var productDocuments =
            await _products
                .Find(
                    FilterDefinition<Product>.Empty
                )
                .SortByDescending(
                    x => x.CreatedAtUtc
                )
                .ThenByDescending(
                    x => x.Id
                )
                .Skip(skip)
                .Limit(take)
                .ToListAsync();

        var products =
            productDocuments
                .Select(
                    x =>
                        new ProductListItemDto
                        {
                            Id =
                                x.Id ??
                                string.Empty,

                            Name =
                                x.Name ??
                                string.Empty,

                            Slug =
                                x.Slug ??
                                string.Empty,

                            Sku =
                                x.Sku ??
                                string.Empty,

                            ParentCategoryId =
                                x.ParentCategoryId ??
                                string.Empty,

                            ParentCategoryName =
                                x.ParentCategoryName ??
                                string.Empty,

                            CategoryId =
                                x.CategoryId ??
                                string.Empty,

                            CategoryName =
                                x.CategoryName ??
                                string.Empty,

                            Price = x.Price,
                            SalePrice = x.SalePrice,

                            Images =
                                x.Images,

                            Visibility =
                                x.Visibility,

                            Status =
                                x.Status ??
                                string.Empty,

                            CreatedAtUtc =
                                x.CreatedAtUtc,

                            UpdatedAtUtc =
                                x.UpdatedAtUtc
                        }
                )
                .ToList();

        return (
            products,
            total
        );
    }

    /* =========================================================
       PUBLIC PRODUCTS - COMPATIBILITY METHOD

       GIỮ LẠI để ProductsController hiện tại chưa bị lỗi compile.

       Sau khi cập nhật ProductsController sang pagination,
       frontend sẽ dùng overload ProductQuery bên dưới.

       Không nên dùng method này lâu dài cho ProductPage lớn,
       vì nó vẫn trả toàn bộ sản phẩm published.
    ========================================================= */

    public async Task<List<Product>>
        GetPublicProductsAsync()
    {
        return await _products
            .Find(
                x =>
                    x.Status == "active"
                    &&
                    x.Visibility.IsPublished
                    &&
                    x.PublishStatus ==
                    "Published"
            )
            .SortByDescending(
                x => x.CreatedAtUtc
            )
            .ThenByDescending(
                x => x.Id
            )
            .ToListAsync();
    }

    /* =========================================================
       PUBLIC PRODUCTS - PAGED / FILTERED

       Đây là method ProductPage nên dùng.

       Ví dụ:
       page=1
       pageSize=24
       search=jade
       parentCategoryId=trang-suc-ngoc
       categoryId=nhan-ngoc
       saleOnly=true
       sort=newest | price-asc | price-desc | sale
    ========================================================= */

    public async Task<PagedResult<ProductListDto>>
        GetPublicProductsAsync(
            ProductQuery query
        )
    {
        query ??= new ProductQuery();
        query.Normalize();

        var filterBuilder =
            Builders<Product>.Filter;

        var filter =
            filterBuilder.And(
                filterBuilder.Eq(
                    x => x.Status,
                    "active"
                ),
                filterBuilder.Eq(
                    "Visibility.IsPublished",
                    true
                ),
                filterBuilder.Eq(
                    x => x.PublishStatus,
                    "Published"
                )
            );

        if (
            !string.IsNullOrWhiteSpace(
                query.ParentCategoryId
            )
        )
        {
            filter &=
                filterBuilder.Eq(
                    x => x.ParentCategoryId,
                    query.ParentCategoryId
                );
        }

        if (
            !string.IsNullOrWhiteSpace(
                query.CategoryId
            )
        )
        {
            filter &=
                filterBuilder.Eq(
                    x => x.CategoryId,
                    query.CategoryId
                );
        }

        if (query.SaleOnly)
        {
            filter &=
                filterBuilder.Gt(
                    x => x.SalePrice,
                    0
                );
        }

        /*
         * Search hiện dùng Regex cho:
         * - Name
         * - SKU
         * - ParentCategoryName
         * - CategoryName
         *
         * Với 1.000 - 10.000 SP vẫn phù hợp.
         * Nếu sau này search lớn hơn nhiều mới cân nhắc Atlas Search.
         */
        if (
            !string.IsNullOrWhiteSpace(
                query.Search
            )
        )
        {
            var escapedKeyword =
                Regex.Escape(
                    query.Search.Trim()
                );

            var regex =
                new BsonRegularExpression(
                    escapedKeyword,
                    "i"
                );

            filter &=
                filterBuilder.Or(
                    filterBuilder.Regex(
                        x => x.Name,
                        regex
                    ),
                    filterBuilder.Regex(
                        x => x.Sku,
                        regex
                    ),
                    filterBuilder.Regex(
                        x =>
                            x.ParentCategoryName,
                        regex
                    ),
                    filterBuilder.Regex(
                        x =>
                            x.CategoryName,
                        regex
                    )
                );
        }

        var sort =
            BuildPublicSort(
                query.Sort
            );

        var totalTask =
            _products
                .CountDocumentsAsync(
                    filter
                );

        /*
         * Projection:
         * Product list KHÔNG tải:
         * - Description dài
         * - Specifications
         * - toàn bộ gallery
         * - SEO object
         *
         * Chỉ lấy thông tin cần cho card/list.
         */
        var itemsTask =
            _products
                .Find(filter)
                .Sort(sort)
                .Skip(
                    (query.Page - 1)
                    * query.PageSize
                )
                .Limit(
                    query.PageSize
                )
                .Project(
                    x =>
                        new ProductListDto
                        {
                            Id = x.Id,
                            Name = x.Name,
                            Slug = x.Slug,
                            Sku = x.Sku,

                            ParentCategoryId =
                                x.ParentCategoryId,

                            ParentCategoryName =
                                x.ParentCategoryName,

                            CategoryId =
                                x.CategoryId,

                            CategoryName =
                                x.CategoryName,

                            Price = x.Price,
                            SalePrice = x.SalePrice,

                            ShortDescription =
                                x.ShortDescription,

                            MainImage =
                                x.Images
                                    .Where(
                                        image =>
                                            image.IsMain
                                    )
                                    .Select(
                                        image =>
                                            image.Url
                                    )
                                    .FirstOrDefault(),

                            CreatedAtUtc =
                                x.CreatedAtUtc
                        }
                )
                .ToListAsync();

        await Task.WhenAll(
            totalTask,
            itemsTask
        );

        var total =
            totalTask.Result;

        return new PagedResult<ProductListDto>
        {
            Items =
                itemsTask.Result,

            Total =
                total,

            Page =
                query.Page,

            PageSize =
                query.PageSize,

            TotalPages =
                query.PageSize <= 0
                    ? 0
                    : (int)Math.Ceiling(
                        total /
                        (double)query.PageSize
                    )
        };
    }

    private static SortDefinition<Product>
        BuildPublicSort(
            string? sort
        )
    {
        var builder =
            Builders<Product>.Sort;

        return (
            sort ??
            "newest"
        )
        .Trim()
        .ToLowerInvariant()
        switch
        {
            /*
             * Giai đoạn hiện tại:
             * price sort dùng Price.
             *
             * Nếu muốn sort theo "final price"
             * (SalePrice > 0 ? SalePrice : Price)
             * tuyệt đối chính xác thì chuyển riêng query này
             * sang aggregation pipeline.
             */
            "price-asc" =>
                builder
                    .Ascending(
                        x => x.Price
                    )
                    .Ascending(
                        x => x.Id
                    ),

            "price-desc" =>
                builder
                    .Descending(
                        x => x.Price
                    )
                    .Descending(
                        x => x.Id
                    ),

            "sale" =>
                builder
                    .Descending(
                        x => x.SalePrice
                    )
                    .Descending(
                        x => x.CreatedAtUtc
                    )
                    .Descending(
                        x => x.Id
                    ),

            _ =>
                builder
                    .Descending(
                        x => x.CreatedAtUtc
                    )
                    .Descending(
                        x => x.Id
                    )
        };
    }

    /* =========================================================
       PUBLIC PRODUCT BY PARENT CATEGORY
       Giữ compatibility cho code cũ.
    ========================================================= */

    public async Task<List<Product>>
        GetPublicProductsByParentCategoryAsync(
            string parentCategoryId
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                parentCategoryId
            )
        )
        {
            return new List<Product>();
        }

        parentCategoryId =
            parentCategoryId.Trim();

        return await _products
            .Find(
                x =>
                    x.ParentCategoryId ==
                    parentCategoryId
                    &&
                    x.Status == "active"
                    &&
                    x.Visibility.IsPublished
                    &&
                    x.PublishStatus ==
                    "Published"
            )
            .SortByDescending(
                x => x.CreatedAtUtc
            )
            .ThenByDescending(
                x => x.Id
            )
            .ToListAsync();
    }

    /* =========================================================
       PUBLIC PRODUCT BY CHILD CATEGORY
       Giữ compatibility cho code cũ.
    ========================================================= */

    public async Task<List<Product>>
        GetPublicProductsByCategoryAsync(
            string categoryId
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                categoryId
            )
        )
        {
            return new List<Product>();
        }

        categoryId =
            categoryId.Trim();

        return await _products
            .Find(
                x =>
                    x.CategoryId ==
                    categoryId
                    &&
                    x.Status == "active"
                    &&
                    x.Visibility.IsPublished
                    &&
                    x.PublishStatus ==
                    "Published"
            )
            .SortByDescending(
                x => x.CreatedAtUtc
            )
            .ThenByDescending(
                x => x.Id
            )
            .ToListAsync();
    }

    /* =========================================================
       PUBLIC PRODUCT BY CATEGORY NAME SUPPORT
       Giữ cho các URL / frontend cũ.
    ========================================================= */

    public async Task<List<Product>>
        GetPublicProductsByCategoryNameAsync(
            string categoryName
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                categoryName
            )
        )
        {
            return new List<Product>();
        }

        var name =
            categoryName.Trim();

        return await _products
            .Find(
                x =>
                    x.CategoryName ==
                    name
                    &&
                    x.Status == "active"
                    &&
                    x.Visibility.IsPublished
                    &&
                    x.PublishStatus ==
                    "Published"
            )
            .SortByDescending(
                x => x.CreatedAtUtc
            )
            .ThenByDescending(
                x => x.Id
            )
            .ToListAsync();
    }

    /* =========================================================
       MENU PRODUCTS

       Menu chỉ lấy:
       - active
       - published website
       - PublishStatus = Published
       - ShowOnMenu = true
    ========================================================= */

    public async Task<List<Product>>
        GetMenuProductsAsync()
    {
        return await _products
            .Find(
                x =>
                    x.Status == "active"
                    &&
                    x.Visibility.IsPublished
                    &&
                    x.PublishStatus ==
                    "Published"
                    &&
                    x.Visibility.ShowOnMenu
            )
            .SortByDescending(
                x => x.CreatedAtUtc
            )
            .ThenByDescending(
                x => x.Id
            )
            .ToListAsync();
    }

    /* =========================================================
       ADMIN GET PRODUCT BY ID
    ========================================================= */

    public async Task<Product?>
        GetByIdAdminAsync(
            string id
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                id
            )
        )
        {
            return null;
        }

        return await _products
            .Find(
                x => x.Id == id
            )
            .FirstOrDefaultAsync();
    }

    /* =========================================================
       PUBLIC GET PRODUCT BY ID

       ID là định danh chính xác của document MongoDB.
       Dùng cho Product Detail để tránh nhầm sản phẩm khi dữ liệu
       legacy từng có slug trùng.
    ========================================================= */

    public async Task<Product?>
        GetPublicByIdAsync(
            string id
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                id
            )
            ||
            !ObjectId.TryParse(
                id.Trim(),
                out _
            )
        )
        {
            return null;
        }

        id = id.Trim();

        return await _products
            .Find(
                x =>
                    x.Id == id
                    &&
                    x.Status ==
                    "active"
                    &&
                    x.Visibility.IsPublished
                    &&
                    x.PublishStatus ==
                    "Published"
            )
            .FirstOrDefaultAsync();
    }


    /* =========================================================
       PUBLIC GET PRODUCT BY SLUG
    ========================================================= */

    public async Task<Product?>
        GetBySlugAsync(
            string slug
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                slug
            )
        )
        {
            return null;
        }

        slug =
            slug.Trim();

        return await _products
            .Find(
                x =>
                    x.Slug == slug
                    &&
                    x.Status ==
                    "active"
                    &&
                    x.Visibility.IsPublished
                    &&
                    x.PublishStatus ==
                    "Published"
            )
            .FirstOrDefaultAsync();
    }

    /* =========================================================
       CREATE PRODUCT
    ========================================================= */

    public async Task<Product>
        CreateAsync(
            Product product
        )
    {
        ArgumentNullException
            .ThrowIfNull(
                product
            );

        NormalizeProduct(
            product
        );

        var nowUtc =
            DateTime.UtcNow;

        if (
            product.CreatedAtUtc ==
            default
        )
        {
            product.CreatedAtUtc =
                nowUtc;
        }

        product.UpdatedAtUtc =
            nowUtc;

        try
        {
            await _products.InsertOneAsync(product);

            _logger.LogInformation(
                "[ProductService] Created product. Id={Id}, SKU={Sku}, Images={Count}",
                product.Id,
                product.Sku,
                product.Images?.Count ?? 0
            );

            return product;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "[ProductService] Insert product failed. SKU={Sku}",
                product.Sku
            );

            throw;
        }

        return product;
    }

    /* =========================================================
       UPDATE PRODUCT
    ========================================================= */

    public async Task<bool>
        UpdateAsync(
            string id,
            Product product
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                id
            )
        )
        {
            return false;
        }

        ArgumentNullException
            .ThrowIfNull(
                product
            );

        var existingProduct =
            await _products
                .Find(
                    x => x.Id == id
                )
                .FirstOrDefaultAsync();

        if (
            existingProduct ==
            null
        )
        {
            return false;
        }

        product.Id =
            id;

        product.CreatedAtUtc =
            existingProduct
                .CreatedAtUtc;

        product.UpdatedAtUtc =
            DateTime.UtcNow;

        NormalizeProduct(
            product
        );

        var result =
            await _products
                .ReplaceOneAsync(
                    x => x.Id == id,
                    product
                );

        /*
         * MatchedCount quan trọng hơn ModifiedCount:
         * save cùng dữ liệu vẫn là request thành công.
         */
        return
            result.MatchedCount >
            0;
    }

    private static void NormalizeProduct(
        Product product
    )
    {
        product.ParentCategoryId =
            product.ParentCategoryId?
                .Trim()
            ?? "";

        product.ParentCategoryName =
            product.ParentCategoryName?
                .Trim()
            ?? "";

        product.CategoryId =
            product.CategoryId?
                .Trim()
            ?? "";

        product.CategoryName =
            product.CategoryName?
                .Trim()
            ?? "";

        product.Name =
            product.Name?
                .Trim()
            ?? "";

        product.Slug =
            product.Slug?
                .Trim()
            ?? "";

        product.Sku =
            product.Sku?
                .Trim()
            ?? "";

        product.Status =
            product.Status?
                .Trim()
            ?? "active";

        product.PublishStatus =
            product.PublishStatus?
                .Trim()
            ?? "Draft";
    }

    /* =========================================================
       DELETE PRODUCT

       Chỉ xóa document.
       Cleanup file ảnh nên đặt ở ProductMediaService /
       ProductWriteService để tránh ProductService phụ thuộc disk.
    ========================================================= */

    public async Task<bool>
        DeleteAsync(
            string id
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                id
            )
        )
        {
            return false;
        }

        var result =
            await _products
                .DeleteOneAsync(
                    x => x.Id == id
                );

        return
            result.DeletedCount >
            0;
    }

    /* =========================================================
       SLUG EXISTS
    ========================================================= */

    public async Task<bool>
        SlugExistsAsync(
            string slug
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                slug
            )
        )
        {
            return false;
        }

        slug =
            slug.Trim();

        return await _products
            .Find(
                x => x.Slug == slug
            )
            .AnyAsync();
    }

    /* =========================================================
       SLUG EXISTS EXCEPT CURRENT PRODUCT
    ========================================================= */

    public async Task<bool>
        SlugExistsExceptIdAsync(
            string slug,
            string id
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                slug
            )
        )
        {
            return false;
        }

        slug =
            slug.Trim();

        return await _products
            .Find(
                x =>
                    x.Slug == slug
                    &&
                    x.Id != id
            )
            .AnyAsync();
    }

    /* =========================================================
       SKU EXISTS
    ========================================================= */

    public async Task<bool>
        SkuExistsAsync(
            string sku
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                sku
            )
        )
        {
            return false;
        }

        sku =
            sku.Trim();

        return await _products
            .Find(
                x => x.Sku == sku
            )
            .AnyAsync();
    }

    /* =========================================================
       SKU EXISTS EXCEPT CURRENT PRODUCT
    ========================================================= */

    public async Task<bool>
        SkuExistsExceptIdAsync(
            string sku,
            string id
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                sku
            )
        )
        {
            return false;
        }

        sku =
            sku.Trim();

        return await _products
            .Find(
                x =>
                    x.Sku == sku
                    &&
                    x.Id != id
            )
            .AnyAsync();
    }

    /* =========================================================
       COUNT PRODUCTS BY CATEGORY
    ========================================================= */

    public async Task<long>
        CountByCategoryAsync(
            string categoryId
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                categoryId
            )
        )
        {
            return 0;
        }

        categoryId =
            categoryId.Trim();

        return await _products
            .CountDocumentsAsync(
                x =>
                    x.CategoryId ==
                    categoryId
            );
    }

    /* =========================================================
       COUNT PRODUCTS BY PARENT CATEGORY
    ========================================================= */

    public async Task<long>
        CountByParentCategoryAsync(
            string parentCategoryId
        )
    {
        if (
            string.IsNullOrWhiteSpace(
                parentCategoryId
            )
        )
        {
            return 0;
        }

        parentCategoryId =
            parentCategoryId.Trim();

        return await _products
            .CountDocumentsAsync(
                x =>
                    x.ParentCategoryId ==
                    parentCategoryId
            );
    }


    /* =========================================================
       SAFE MAINTENANCE HELPERS - PRODUCT SLUG

       Dùng cho endpoint audit/repair slug trùng của
       Trang Sức Ngọc > Chuỗi Ngọc Đeo Cổ.

       Các helper này KHÔNG đổi category, ảnh, giá hay nội dung.
    ========================================================= */

    public async Task<List<Product>>
        GetAllProductsForSlugMaintenanceAsync()
    {
        return await _products
            .Find(
                FilterDefinition<Product>.Empty
            )
            .SortBy(
                x => x.CreatedAtUtc
            )
            .ThenBy(
                x => x.Id
            )
            .ToListAsync();
    }

    public async Task<bool>
        UpdateProductSlugAsync(
            string id,
            string slug
        )
    {
        if (
            string.IsNullOrWhiteSpace(id)
            ||
            string.IsNullOrWhiteSpace(slug)
        )
        {
            return false;
        }

        var normalizedSlug =
            slug.Trim();

        var update =
            Builders<Product>
                .Update
                .Set(
                    x => x.Slug,
                    normalizedSlug
                )
                .Set(
                    x => x.UpdatedAtUtc,
                    DateTime.UtcNow
                );

        var result =
            await _products
                .UpdateOneAsync(
                    x => x.Id == id,
                    update
                );

        return
            result.MatchedCount >
            0;
    }
}

/* =============================================================
   PUBLIC PRODUCT QUERY

   Để ngay trong file này trước nhằm triển khai an toàn một bước.
   Sau này có thể tách:
   Features/Products/Queries/ProductQuery.cs
============================================================= */

public sealed class ProductQuery
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 24;

    public string Search { get; set; } =
        string.Empty;

    public string ParentCategoryId
    {
        get;
        set;
    } = string.Empty;

    public string CategoryId
    {
        get;
        set;
    } = string.Empty;

    public bool SaleOnly { get; set; }

    public string Sort { get; set; } =
        "newest";

    public void Normalize()
    {
        Page =
            Math.Max(
                Page,
                1
            );

        PageSize =
            Math.Clamp(
                PageSize,
                1,
                60
            );

        Search =
            Search?.Trim()
            ?? string.Empty;

        ParentCategoryId =
            ParentCategoryId?.Trim()
            ?? string.Empty;

        CategoryId =
            CategoryId?.Trim()
            ?? string.Empty;

        Sort =
            string.IsNullOrWhiteSpace(
                Sort
            )
                ? "newest"
                : Sort.Trim();
    }
}

/* =============================================================
   PAGED RESULT
============================================================= */

public sealed class PagedResult<T>
{
    public List<T> Items { get; set; } =
        new();

    public long Total { get; set; }

    public int Page { get; set; }

    public int PageSize { get; set; }

    public int TotalPages { get; set; }

    public bool HasPreviousPage =>
        Page > 1;

    public bool HasNextPage =>
        Page < TotalPages;
}

/* =============================================================
   PRODUCT LIST DTO

   DTO nhẹ dành riêng cho ProductPage.
   Không mang full document MongoDB ra public listing.
============================================================= */

public sealed class ProductListDto
{
    public string Id { get; set; } =
        string.Empty;

    public string Name { get; set; } =
        string.Empty;

    public string Slug { get; set; } =
        string.Empty;

    public string Sku { get; set; } =
        string.Empty;

    public string ParentCategoryId
    {
        get;
        set;
    } = string.Empty;

    public string ParentCategoryName
    {
        get;
        set;
    } = string.Empty;

    public string CategoryId
    {
        get;
        set;
    } = string.Empty;

    public string CategoryName
    {
        get;
        set;
    } = string.Empty;

    /*
     * Dùng đúng type đang có trong Product model.
     * Nếu Product.Price của project là decimal/double khác kiểu,
     * compiler sẽ báo tại đây và bạn chỉ cần đổi 2 property này
     * theo đúng Product model.
     */
    public decimal Price { get; set; }

    public decimal SalePrice { get; set; }

    public string ShortDescription
    {
        get;
        set;
    } = string.Empty;

    public string? MainImage { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
